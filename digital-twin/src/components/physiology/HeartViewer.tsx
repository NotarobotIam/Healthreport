import { useEffect, useMemo, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { decodeModelResponse } from '../../atlas/modelDownload';
import { PointerTap } from '../../atlas/pointerTap';
import { EXAM_BY_ID } from '../../data/physiology/examCatalog';
import { HEART_COLOR, HEART_INFO, HEART_LAYERS, type HeartLayer } from '../../data/physiology/heartInfo';

interface HeartPart {
  id: string;
  name: string;
  layer: HeartLayer;
  /** 'right' = carries oxygen-poor blood (blue), 'left' = oxygen-rich (red). */
  side?: 'left' | 'right';
  vertexCount: number;
  indexCount: number;
  positions: number;
  normals: number;
  indices: number;
}
interface HeartMeta {
  bytes: number;
  bounds: [[number, number, number], [number, number, number]];
  parts: HeartPart[];
}

const colorOf = (p: HeartPart): string => {
  if (p.layer === 'muscle') return HEART_COLOR.muscle;
  if (p.layer === 'valves') return p.id === 'papillary-muscles' ? HEART_COLOR.papillary : HEART_COLOR.valve;
  return p.side === 'right' ? HEART_COLOR.blue : HEART_COLOR.red;
};

/** One "lub-dub": a strong beat then a weaker one. `x` is the position within the beat, 0 to 1. */
const beatShape = (x: number) => Math.exp(-(((x - 0.08) / 0.05) ** 2)) + 0.6 * Math.exp(-(((x - 0.3) / 0.06) ** 2));

const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

interface ViewState {
  layers: Record<HeartLayer, boolean>;
  xray: boolean;
  selected: string | null;
  rotate: boolean;
  beat: boolean;
  bpm: number;
}

interface SceneApi {
  apply: (s: ViewState) => void;
  parts: HeartPart[];
}

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${on ? 'border-hud-cyan bg-hud-cyan text-white' : 'border-hud-border bg-hud-bg text-hud-text hover:border-hud-cyan'}`;

/**
 * A 3D heart you can turn with your finger or mouse, that also turns by itself. Built from BodyParts3D
 * (CC BY 4.0). It is a general adult reference heart, not a scan of the member's own heart.
 */
export default function HeartViewer({ heartRate }: { heartRate?: number | null }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<SceneApi | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [parts, setParts] = useState<HeartPart[]>([]);
  const reduced = useMemo(prefersReducedMotion, []);
  const [layers, setLayers] = useState<Record<HeartLayer, boolean>>({ muscle: true, chambers: true, valves: true, coronary: true, veins: true, vessels: true });
  const [xray, setXray] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [rotate, setRotate] = useState(!reduced);
  const [beat, setBeat] = useState(false);
  const bpm = heartRate && heartRate >= 30 && heartRate <= 200 ? heartRate : 70;

  const state = useRef<ViewState>({ layers, xray, selected, rotate, beat, bpm });
  state.current = { layers, xray, selected, rotate, beat, bpm };
  const onSelect = useRef(setSelected);
  onSelect.current = setSelected;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    const abort = new AbortController();

    if (typeof DecompressionStream === 'undefined') {
      setMessage('This browser is too old to load the 3D heart. Please update it.');
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
    canvas.setAttribute('aria-label', 'Interactive 3D model of the human heart. Drag to turn it, scroll or pinch to zoom, and click a structure to learn about it. The same structures are listed in the menu beside it.');

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(32, 1, 0.01, 10);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 0.18;
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

    const pivot = new T.Group(); // scaled for the heartbeat, about the centre of the heart
    scene.add(pivot);

    const geometries: T.BufferGeometry[] = [];
    const materials: T.MeshStandardMaterial[] = [];
    const meshes = new Map<string, { mesh: T.Mesh; part: HeartPart; material: T.MeshStandardMaterial }>();

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
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
        const seeThrough = s.xray && part.layer === 'muscle';
        material.transparent = seeThrough;
        material.opacity = seeThrough ? 0.2 : 1;
        material.depthWrite = !seeThrough;
        mesh.renderOrder = seeThrough ? 10 : 0;
        const picked = id === s.selected;
        material.emissive.set(picked ? '#ffd166' : '#000000');
        material.emissiveIntensity = picked ? 0.55 : 0;
        material.needsUpdate = true;
      });
      if (!s.beat) pivot.scale.setScalar(1);
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
      const candidates = [...meshes.values()].filter(({ mesh, part }) => mesh.visible && !(view.xray && part.layer === 'muscle')).map((m) => m.mesh);
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
    let last = performance.now();
    let phase = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (view.beat) {
        phase = (phase + dt * (view.bpm / 60)) % 1;
        pivot.scale.setScalar(1 + 0.03 * beatShape(phase));
      }
      controls.update();
      renderer.render(scene, camera);
    };

    // --- Load the heart ---------------------------------------------------------------------------
    (async () => {
      try {
        const metaRes = await fetch('/models/heart.json', { signal: abort.signal });
        if (!metaRes.ok) throw new Error('missing heart model');
        const meta = (await metaRes.json()) as HeartMeta;
        const buffer = await decodeModelResponse(await fetch('/models/heart.bin.gz', { signal: abort.signal }), meta.bytes);
        if (disposed) return;
        // The heart "core" — the muscle and the chambers/valves inside it — is what a viewer's eye reads as
        // "the heart". The vessels (aorta, venae cavae, pulmonary trunk...) stick out unevenly around it —
        // the SVC/IVC run much further than the aortic branches do, for instance — so centring on the
        // bounding box of *everything* pulls the actual heart off to one side. We centre on the core's own
        // box instead, and only fall back to the full model if a future edit ever removes every core part.
        const coreBox = new T.Box3();
        for (const p of meta.parts) {
          const g = new T.BufferGeometry();
          g.setAttribute('position', new T.BufferAttribute(new Float32Array(buffer, p.positions, p.vertexCount * 3), 3));
          g.setAttribute('normal', new T.BufferAttribute(new Int16Array(buffer, p.normals, p.vertexCount * 3), 3, true));
          g.setIndex(new T.BufferAttribute(new Uint32Array(buffer, p.indices, p.indexCount), 1));
          g.computeBoundingBox();
          if ((p.layer === 'chambers' || p.layer === 'muscle' || p.layer === 'valves') && g.boundingBox) coreBox.union(g.boundingBox);
          const material = new T.MeshStandardMaterial({ color: colorOf(p), roughness: p.layer === 'valves' ? 0.6 : 0.5, metalness: 0.05, side: p.layer === 'chambers' || p.layer === 'valves' ? T.DoubleSide : T.FrontSide });
          const mesh = new T.Mesh(g, material);
          mesh.userData.id = p.id;
          geometries.push(g);
          materials.push(material);
          meshes.set(p.id, { mesh, part: p, material });
          pivot.add(mesh);
        }
        // Centre the heart core on the origin, then frame the camera wide enough that the full model —
        // vessels included — stays in view no matter how far they now reach from that off-centre point.
        const [lo, hi] = meta.bounds;
        const centre = coreBox.isEmpty() ? new T.Vector3((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2) : coreBox.getCenter(new T.Vector3());
        pivot.children.forEach((c) => c.position.sub(centre));
        const reach = (axis: 'x' | 'y' | 'z', i: 0 | 1 | 2) => Math.max(hi[i] - centre[axis], centre[axis] - lo[i]);
        const size = 2 * Math.max(reach('x', 0), reach('y', 1), reach('z', 2));
        camera.position.set(size * 0.35, size * 0.25, size * 2.15); // the body faces +z, so this is the front
        controls.target.set(0, 0, 0);
        controls.update();
        api.current = { apply, parts: meta.parts };
        setParts(meta.parts);
        apply(state.current);
        setStatus('ready');
      } catch (err) {
        if (disposed || abort.signal.aborted) return;
        console.error('Heart model failed to load', err);
        setMessage('The 3D heart could not be loaded. Please reload the page.');
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
    api.current?.apply({ layers, xray, selected, rotate, beat, bpm });
  }, [layers, xray, selected, rotate, beat, bpm, status]);

  const chosen = parts.find((p) => p.id === selected);
  const info = selected ? HEART_INFO[selected] : undefined;

  return (
    // The canvas used to share a row with the control panel beside it (a 3fr/2fr grid), which — even
    // though the heart was dead centre *within that narrower box* — read as the heart sitting off to the
    // left of the card as a whole, since the panel claimed the other ~40% of the width. Stacking the
    // controls below a full-width canvas instead means "the imaging portion" is the whole card, and the
    // heart is centred in it.
    <div className="flex flex-col gap-4">
      <div className="relative">
        <div ref={host} data-testid="heart-canvas" className="h-[22rem] w-full overflow-hidden rounded-xl border border-hud-border bg-[#f2f3f3] sm:h-[26rem]" />
        {status === 'loading' && <p className="absolute inset-0 flex items-center justify-center text-sm text-hud-muted">Loading the 3D heart…</p>}
        {status === 'error' && <p role="alert" className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-lg bg-hud-red/10 px-3 py-2 text-center text-sm text-hud-text">{message}</p>}
        <div className="pointer-events-none absolute bottom-2 left-3 flex gap-3 text-[11px] text-hud-muted" aria-hidden="true">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: HEART_COLOR.red }} />oxygen-rich</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: HEART_COLOR.blue }} />oxygen-poor</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" aria-pressed={rotate} onClick={() => setRotate((v) => !v)} className={chip(rotate)}>{rotate ? '⏸ Turning' : '▶ Turn it'}</button>
          <button type="button" aria-pressed={beat} onClick={() => setBeat((v) => !v)} className={chip(beat)}>♥ Beat{beat ? ` (${bpm} bpm)` : ''}</button>
          <button type="button" aria-pressed={xray} onClick={() => setXray((v) => !v)} className={chip(xray)}>See inside</button>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Parts to show">
          {HEART_LAYERS.map((l) => (
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
              className="w-full rounded-md border border-hud-borderLight bg-hud-panel px-3 py-2 text-sm focus:border-hud-cyan focus:outline-none"
            >
              <option value="">Choose, or click the heart…</option>
              {HEART_LAYERS.map((l) => (
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
                <p className="mt-1 leading-relaxed text-hud-text">{info?.what ?? 'Part of the heart and its blood vessels.'}</p>
                {info?.related && info.related.length > 0 && (
                  <p className="mt-2 text-xs text-hud-muted">Looked at by: {info.related.map((id) => EXAM_BY_ID.get(id)?.title ?? id).join(', ')}</p>
                )}
              </>
            ) : (
              <p className="text-hud-muted">Drag to turn the heart, scroll to zoom, and click any part to learn what it does. “See inside” makes the muscle see-through so you can see the chambers and valves.</p>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-hud-muted">
        A general adult reference heart, not a scan of yours. The beat is an illustration paced at {heartRate ? `your latest heart rate (${bpm} bpm)` : 'a typical 70 bpm'}, not a recording of your heart.
        Anatomy: BodyParts3D © The Database Center for Life Science, <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>.
      </p>
    </div>
  );
}
