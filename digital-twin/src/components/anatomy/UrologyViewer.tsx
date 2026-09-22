import { useEffect, useMemo, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { decodeModelResponse } from '../../atlas/modelDownload';
import { PointerTap } from '../../atlas/pointerTap';
import { UROLOGY_LAYERS, urologyPartInfo, type UrologyLayer } from '../../data/anatomy/urologyViewerInfo';

interface UrologyPart {
  id: string;
  name: string;
  layer: UrologyLayer;
  side?: 'left' | 'right';
  vertexCount: number;
  indexCount: number;
  positions: number;
  normals: number;
  indices: number;
}
interface UrologyMeta {
  bytes: number;
  bounds: [[number, number, number], [number, number, number]];
  parts: UrologyPart[];
}

// Matches the Urology page's own 2D diagram: urinary-tract organs vs. the reproductive-only ones.
const URINARY_COLOR = '#c96a5e';
const REPRO_COLOR = '#b98fc9';
const colorOf = (p: UrologyPart): string => (p.layer === 'prostate' || p.layer === 'testes' ? REPRO_COLOR : URINARY_COLOR);

const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

interface ViewState {
  layers: Record<UrologyLayer, boolean>;
  selected: string | null;
  rotate: boolean;
}

interface SceneApi {
  apply: (s: ViewState) => void;
  parts: UrologyPart[];
}

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${on ? 'border-hud-cyan bg-hud-cyan text-white' : 'border-hud-border bg-hud-bg text-hud-text hover:border-hud-cyan'}`;

/**
 * A 3D model of the kidneys, ureters, bladder, urethra, prostate, seminal vesicles, testes and epididymis
 * — built from BodyParts3D (CC BY 4.0), the same real adult-male reference anatomy the 3D Anatomy page and
 * heart model use, not an illustration. There is no equivalent female dataset — see this page's diagram
 * for that side.
 */
export default function UrologyViewer() {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<SceneApi | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [parts, setParts] = useState<UrologyPart[]>([]);
  const reduced = useMemo(prefersReducedMotion, []);
  const [layers, setLayers] = useState<Record<UrologyLayer, boolean>>({ kidneys: true, ureters: true, bladder: true, prostate: true, testes: true });
  const [selected, setSelected] = useState<string | null>(null);
  const [rotate, setRotate] = useState(!reduced);

  const state = useRef<ViewState>({ layers, selected, rotate });
  state.current = { layers, selected, rotate };
  const onSelect = useRef(setSelected);
  onSelect.current = setSelected;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    const abort = new AbortController();

    if (typeof DecompressionStream === 'undefined') {
      setMessage('This browser is too old to load the 3D model. Please update it.');
      setStatus('error');
      return;
    }
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' });
    } catch {
      setMessage('This browser could not start the 3D viewer. Please try one with WebGL enabled.');
      setStatus('error');
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor('#f2f3f3');
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    el.appendChild(renderer.domElement);
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Interactive 3D model of the kidneys, ureters, bladder, urethra, prostate and testes. Drag to turn it, scroll or pinch to zoom, and click a structure to learn about it. The same structures are listed in the menu beside it.');

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(32, 1, 0.01, 10);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 0.08;
    controls.maxDistance = 1.2;
    controls.autoRotateSpeed = 2.2;

    const pmrem = new T.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    room.dispose();
    pmrem.dispose();
    scene.add(new T.HemisphereLight(0xffffff, 0xa7acb2, 0.9));
    const key = new T.DirectionalLight(0xfffaf4, 2.0);
    key.position.set(-1, 2, 3);
    scene.add(key);
    const rim = new T.DirectionalLight(0xe9f0ff, 1.4);
    rim.position.set(2, 1, -3);
    scene.add(rim);

    const pivot = new T.Group();
    scene.add(pivot);

    const geometries: T.BufferGeometry[] = [];
    const materials: T.MeshStandardMaterial[] = [];
    const meshes = new Map<string, { mesh: T.Mesh; part: UrologyPart; material: T.MeshStandardMaterial }>();

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      // See HeartViewer.tsx for why the default (true) `updateStyle` argument here matters — omitting it
      // broke the heart model on HiDPI/Retina displays in exactly this same spot.
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let view: ViewState = state.current;
    const apply = (s: ViewState) => {
      view = s;
      controls.autoRotate = s.rotate;
      meshes.forEach(({ mesh, part, material }, id) => {
        mesh.visible = s.layers[part.layer];
        const picked = id === s.selected;
        material.emissive.set(picked ? '#ffd166' : '#000000');
        material.emissiveIntensity = picked ? 0.55 : 0;
        material.needsUpdate = true;
      });
    };

    // --- Picking: a tap selects a structure; dragging only turns it -----------------------------------
    const raycaster = new T.Raycaster();
    const pointer = new T.Vector2();
    const tap = new PointerTap();
    const onDown = (e: PointerEvent) => tap.down(e.pointerId, e.clientX, e.clientY, 6);
    const onMove = (e: PointerEvent) => tap.move(e.pointerId, e.clientX, e.clientY);
    const onCancel = (e: PointerEvent) => tap.cancel(e.pointerId);
    const onUp = (e: PointerEvent) => {
      if (!tap.up(e.pointerId, e.clientX, e.clientY)) return;
      const r = canvas.getBoundingClientRect();
      pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const candidates = [...meshes.values()].filter(({ mesh }) => mesh.visible).map((m) => m.mesh);
      const hit = raycaster.intersectObjects(candidates, false)[0];
      onSelect.current(hit ? (hit.object.userData.id as string) : null);
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    const onContextLost = (e: Event) => {
      e.preventDefault();
      setMessage('The 3D view was interrupted. Please reload the page.');
      setStatus('error');
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    // --- Animation loop -----------------------------------------------------------------------------
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      controls.update();
      renderer.render(scene, camera);
    };

    // --- Load the model ---------------------------------------------------------------------------
    (async () => {
      try {
        const metaRes = await fetch('/models/urology.json', { signal: abort.signal });
        if (!metaRes.ok) throw new Error('missing urology model');
        const meta = (await metaRes.json()) as UrologyMeta;
        const buffer = await decodeModelResponse(await fetch('/models/urology.bin.gz', { signal: abort.signal }), meta.bytes);
        if (disposed) return;
        for (const p of meta.parts) {
          const g = new T.BufferGeometry();
          g.setAttribute('position', new T.BufferAttribute(new Float32Array(buffer, p.positions, p.vertexCount * 3), 3));
          g.setAttribute('normal', new T.BufferAttribute(new Int16Array(buffer, p.normals, p.vertexCount * 3), 3, true));
          g.setIndex(new T.BufferAttribute(new Uint32Array(buffer, p.indices, p.indexCount), 1));
          const material = new T.MeshStandardMaterial({ color: colorOf(p), roughness: 0.5, metalness: 0.05, side: T.DoubleSide });
          const mesh = new T.Mesh(g, material);
          mesh.userData.id = p.id;
          geometries.push(g);
          materials.push(material);
          meshes.set(p.id, { mesh, part: p, material });
          pivot.add(mesh);
        }
        // Centre on the whole group and frame the camera wide enough to fit it — unlike the heart, nothing
        // here sticks out unevenly (no long thin vessel reaching far past everything else), so the plain
        // bounding-box centre already reads as "centred" on screen.
        const [lo, hi] = meta.bounds;
        const centre = new T.Vector3((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2);
        pivot.children.forEach((c) => c.position.sub(centre));
        const reach = (i: 0 | 1 | 2) => Math.max(hi[i] - centre.getComponent(i), centre.getComponent(i) - lo[i]);
        const size = 2 * Math.max(reach(0), reach(1), reach(2));
        camera.position.set(size * 0.4, size * 0.15, size * 2.1); // the body faces +z, so this is the front
        controls.target.set(0, 0, 0);
        controls.update();
        api.current = { apply, parts: meta.parts };
        setParts(meta.parts);
        apply(state.current);
        setStatus('ready');
      } catch (err) {
        if (disposed || abort.signal.aborted) return;
        console.error('Urology model failed to load', err);
        setMessage('The 3D model could not be loaded. Please reload the page.');
        setStatus('error');
      }
    })();
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      env.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    api.current?.apply({ layers, selected, rotate });
  }, [layers, selected, rotate, status]);

  const chosen = parts.find((p) => p.id === selected);
  const info = selected ? urologyPartInfo(selected) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <div ref={host} data-testid="urology-canvas" className="h-[22rem] w-full overflow-hidden rounded-xl border border-hud-border bg-[#f2f3f3] sm:h-[26rem]" />
        {status === 'loading' && <p className="absolute inset-0 flex items-center justify-center text-sm text-hud-muted">Loading the 3D model…</p>}
        {status === 'error' && <p role="alert" className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-lg bg-hud-red/10 px-3 py-2 text-center text-sm text-hud-text">{message}</p>}
        <div className="pointer-events-none absolute bottom-2 left-3 flex gap-3 text-[11px] text-hud-muted" aria-hidden="true">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: URINARY_COLOR }} />urinary tract</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: REPRO_COLOR }} />reproductive</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" aria-pressed={rotate} onClick={() => setRotate((v) => !v)} className={chip(rotate)}>{rotate ? '⏸ Turning' : '▶ Turn it'}</button>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Parts to show">
          {UROLOGY_LAYERS.map((l) => (
            <button key={l.id} type="button" aria-pressed={layers[l.id]} onClick={() => setLayers((p) => ({ ...p, [l.id]: !p[l.id] }))} className={chip(layers[l.id])}>{l.label}</button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-hud-text">Learn about a part</span>
            <select
              value={selected ?? ''}
              onChange={(e) => setSelected(e.target.value || null)}
              disabled={status !== 'ready'}
              className="w-full rounded-md border border-hud-borderLight bg-hud-panel px-3 py-2 text-sm text-hud-text focus:border-hud-cyan focus:outline-none"
            >
              <option value="">Choose, or click the model…</option>
              {UROLOGY_LAYERS.map((l) => (
                <optgroup key={l.id} label={l.label}>
                  {parts.filter((p) => p.layer === l.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>

          <div aria-live="polite" className="min-h-[7rem] rounded-xl bg-hud-panel2 p-3 text-sm">
            {chosen ? (
              <>
                <h3 className="font-semibold text-hud-text">{chosen.name}</h3>
                <p className="mt-1 leading-relaxed text-hud-text">{info ?? 'Part of the urinary or reproductive tract.'}</p>
              </>
            ) : (
              <p className="text-hud-muted">Drag to turn the model, scroll to zoom, and click any part to learn what it does.</p>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-hud-muted">
        A general adult male reference model, not a scan of yours. Anatomy: BodyParts3D © The Database Center for Life Science,{' '}
        <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>.
      </p>
    </div>
  );
}
