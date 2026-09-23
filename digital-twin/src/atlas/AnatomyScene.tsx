// Rendering approach adapted from ashemag/human-atlas (MIT, see
// LICENSE-human-atlas): all ~2,200 BodyParts3D meshes are merged into one
// draw call per body system, and a small GPU texture (one texel per structure)
// drives which structures are visible or highlighted — so toggling layers or
// selecting a structure touches a few KB of texture, not thousands of meshes.
//
// Added for pain reporting: pin-point picking (returns the exact 3D point that
// was tapped), pain markers drawn over the tissue, a draft marker for the
// report being written, and camera fly-to requests.
import { useEffect, useRef } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PointerTap } from './pointerTap';
import { decodeModelResponse } from './modelDownload';
import { SYSTEM_BY_ID, type Atlas, type SystemId, type View } from './anatomy';

export type Vec3 = [number, number, number];

export interface PainMarker {
  id: string;
  point: Vec3;
  severity: number;
  resolved: boolean;
}

export interface PickResult {
  partId: string;
  point: Vec3;
}

export interface CameraRequest {
  /** Change this to trigger the move; an unchanged nonce is ignored. */
  nonce: number;
  view?: View;
  focus?: { point: Vec3; distance: number };
}

export interface AnatomySceneProps {
  atlas: Atlas;
  visible: SystemId[];
  selectedPartId: string | null;
  markers: PainMarker[];
  activeMarkerId: string | null;
  draftPoint: Vec3 | null;
  picking: boolean;
  cameraRequest: CameraRequest;
  /** 0 (intact body) to 1 (skeleton laid bare) — peels skin, then muscle, away to reveal what's underneath. */
  peel: number;
  onPick: (result: PickResult) => void;
  onMarkerClick: (id: string) => void;
  onProgress: (percent: number) => void;
  onError: (message: string) => void;
}

// The two outer layers fade away in sequence as `peel` rises: skin first (it's already a thin
// translucent shell even at peel=0), then muscle, leaving the skeleton/organs/vessels/nerves
// underneath fully opaque throughout — the slider is a smooth version of picking the "Skeleton"
// preset, rather than a hard cut. Connective tissue is left out of the fade: it belongs partly to
// muscle and partly to the skeleton, and disappearing it with muscle would strip cartilage that
// visually belongs with the bones it's still showing.
const SKIN_BASE_OPACITY = 0.1;
function skinOpacity(peel: number): number {
  return SKIN_BASE_OPACITY * (1 - Math.min(1, peel / 0.4));
}
function muscleOpacity(peel: number): number {
  return 1 - Math.min(1, Math.max(0, peel - 0.4) / 0.6);
}

const BODY_CENTER_Y = 0.86;
const CHUNK_DOWNLOADS_IN_FLIGHT = 3;
const MARKER_HIT_RADIUS_PX = 18;
const HOVER_INTERVAL_MS = 70;

function severityColor(severity: number, resolved: boolean): string {
  if (resolved) return '#8a94a0';
  if (severity >= 7) return '#d92d20';
  if (severity >= 4) return '#f07d1a';
  return '#e8b923';
}

function viewDirection(view: View): T.Vector3 {
  switch (view) {
    case 'front': return new T.Vector3(0, 0.02, 1);
    case 'back': return new T.Vector3(0, 0.02, -1);
    case 'side': return new T.Vector3(1, 0.02, 0);
    default: return new T.Vector3(0.35, 0.06, 1).normalize();
  }
}

function makeDiscTexture(): T.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

export default function AnatomyScene(props: AnatomySceneProps) {
  const { atlas } = props;
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    const el = host.current!;
    let disposed = false;
    let frame = 0;
    let dirty = true;
    let ready = false;
    const abort = new AbortController();

    if (typeof DecompressionStream === 'undefined') {
      latest.current.onError('This browser is too old to load the anatomy model. Please update it.');
      return;
    }

    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      latest.current.onError('This browser could not start the 3D viewer. Please try one with WebGL enabled.');
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor('#f2f3f3');
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      'aria-label',
      'Interactive human anatomy. Drag to orbit, scroll or pinch to zoom, and tap a spot to select it.',
    );

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(34, 1, 0.005, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, BODY_CENTER_Y, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.085;
    controls.minDistance = 0.07;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI * 0.96;
    controls.addEventListener('change', () => { dirty = true; });

    // --- Studio ---------------------------------------------------------
    const pmrem = new T.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    room.dispose();
    pmrem.dispose();
    scene.add(new T.HemisphereLight(0xffffff, 0xa7acb2, 1.05));
    const key = new T.DirectionalLight(0xfffaf4, 2.3);
    key.position.set(-2, 4, 3);
    scene.add(key);
    const rim = new T.DirectionalLight(0xe9f0ff, 1.8);
    rim.position.set(2, 2, -3);
    scene.add(rim);
    const ground = new T.Mesh(new T.CircleGeometry(30, 96), new T.MeshStandardMaterial({ color: 0xd5d9dc, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.019;
    scene.add(ground);
    const platform = new T.Mesh(
      new T.CylinderGeometry(0.68, 0.7, 0.028, 100),
      new T.MeshStandardMaterial({ color: 0xeeeeec, metalness: 0.12, roughness: 0.67 }),
    );
    platform.position.y = -0.016;
    scene.add(platform);

    // --- Per-structure state texture: R = visible, G = selected -----------
    const stateWidth = T.MathUtils.ceilPowerOfTwo(atlas.parts.length);
    const stateData = new Uint8Array(stateWidth * 4);
    const stateTexture = new T.DataTexture(stateData, stateWidth, 1, T.RGBAFormat, T.UnsignedByteType);
    stateTexture.needsUpdate = true;

    const materials: T.Material[] = [];
    const geometries: T.BufferGeometry[] = [];
    const pickers: (T.Mesh | undefined)[] = new Array(atlas.parts.length);
    const partIndexById = new Map(atlas.parts.map((p, i) => [p.id, i]));
    const bounds = atlas.parts.map((p) => new T.Box3(new T.Vector3().fromArray(p.bounds[0]), new T.Vector3().fromArray(p.bounds[1])));
    const pickMaterial = new T.MeshBasicMaterial({ side: T.DoubleSide });
    materials.push(pickMaterial);

    // A named structure (say "Right external oblique") can be a single mesh spanning most of the torso —
    // BodyParts3D models whole muscle bellies, not the small region a pain report is actually about. Tinting
    // the *entire* structure on pick (the old behaviour) read as "the whole side of my body lit up" for any
    // large part. `spotHighlight` instead glows a real-world-sized patch (see SPOT_RADIUS) around the exact
    // tapped point, computed per-fragment from world position — so it's the same small size everywhere,
    // independent of which structure, or how large a mesh it happens to belong to. xyz = world point, w =
    // radius (<=0 means "off"). One shared uniform object, referenced by every system's material, so
    // updating it once (in applyPartState) updates every material's shader at once — the same pattern the
    // existing partState texture below already relies on.
    const spotHighlight = { value: new T.Vector4(0, 0, 0, -1) };
    const SPOT_RADIUS = 0.08; // metres (~8cm) — bigger than the marker sprite drawn on top of it, so the glow forms a visible halo around the dot instead of being hidden under it; still a small patch, nowhere near "a whole muscle"
    const SPOT_COLOR = '0.98, 0.62, 0.13'; // amber: visually distinct from the teal "structure selected" tint below

    const materialFor = (system: SystemId) => {
      const isSkin = system === 'integumentary';
      const isMuscle = system === 'muscular';
      const peelable = isSkin || isMuscle;
      const m = new T.MeshStandardMaterial({
        color: SYSTEM_BY_ID.get(system)?.color ?? '#aebbb8',
        metalness: 0.08,
        roughness: 0.53,
        side: T.DoubleSide,
        transparent: peelable,
        opacity: isSkin ? skinOpacity(0) : 1,
        depthWrite: !peelable,
      });
      m.onBeforeCompile = (shader) => {
        shader.uniforms.partState = { value: stateTexture };
        shader.uniforms.stateWidth = { value: stateWidth };
        shader.uniforms.spotHighlight = spotHighlight;
        shader.vertexShader =
          'attribute float partIndex; uniform sampler2D partState; uniform float stateWidth; varying float vVisible; varying float vSelected; varying vec3 vWorldPos;\n' +
          shader.vertexShader.replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\nvec4 partSt = texture2D(partState, vec2((partIndex + 0.5) / stateWidth, 0.5)); vVisible = partSt.r; vSelected = partSt.g;\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
          );
        shader.fragmentShader =
          `varying float vVisible; varying float vSelected; varying vec3 vWorldPos; uniform vec4 spotHighlight;\n` +
          shader.fragmentShader
            .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vVisible < 0.5) discard;')
            .replace(
              '#include <color_fragment>',
              '#include <color_fragment>\n' +
                'float spotGlow = spotHighlight.w > 0.0 ? 1.0 - smoothstep(spotHighlight.w * 0.35, spotHighlight.w, distance(vWorldPos, spotHighlight.xyz)) : 0.0;\n' +
                `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.85, 0.78), vSelected * 0.75);\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(${SPOT_COLOR}), spotGlow * 0.85);`,
            );
      };
      materials.push(m);
      return m;
    };
    const systemMaterials = new Map<SystemId, T.Material>();
    for (const id of new Set(atlas.parts.map((p) => p.system))) systemMaterials.set(id, materialFor(id));

    // --- Geometry streaming ---------------------------------------------
    let loaded = 0;
    const loadChunk = async (ci: number) => {
      const chunk = atlas.chunks[ci];
      if (!chunk.gzip) throw new Error('The anatomy model is missing its compressed data.');
      const response = await fetch(chunk.gzip, { signal: abort.signal });
      const buffer = await decodeModelResponse(response, chunk.bytes);
      if (disposed) return;

      const bySystem = new Map<SystemId, T.BufferGeometry[]>();
      atlas.parts.forEach((p, i) => {
        if (p.chunk !== ci) return;
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(new Float32Array(buffer, p.positions, p.vertexCount * 3), 3));
        // Normalized signed shorts keep the whole atlas compact in memory.
        g.setAttribute('normal', new T.BufferAttribute(new Int16Array(buffer, p.normals, p.vertexCount * 3), 3, true));
        g.setIndex(new T.BufferAttribute(new Uint32Array(buffer, p.indices, p.indexCount), 1));
        g.boundingBox = bounds[i].clone();
        g.computeBoundingSphere();
        const pick = new T.Mesh(g, pickMaterial);
        pick.matrixAutoUpdate = false;
        pickers[i] = pick;
        geometries.push(g);
        g.setAttribute('partIndex', new T.BufferAttribute(new Float32Array(p.vertexCount).fill(i), 1));
        const list = bySystem.get(p.system) ?? [];
        list.push(g);
        bySystem.set(p.system, list);
      });
      bySystem.forEach((gs, system) => {
        const merged = mergeGeometries(gs, false);
        if (!merged) throw new Error('Could not assemble the anatomy geometry.');
        geometries.push(merged);
        const mesh = new T.Mesh(merged, systemMaterials.get(system));
        mesh.frustumCulled = false;
        scene.add(mesh);
      });
      loaded++;
      latest.current.onProgress(Math.round((loaded / atlas.chunks.length) * 100));
      dirty = true;
    };
    (async () => {
      try {
        let cursor = 0;
        await Promise.all(
          Array.from({ length: CHUNK_DOWNLOADS_IN_FLIGHT }, async () => {
            while (cursor < atlas.chunks.length) await loadChunk(cursor++);
          }),
        );
        if (!disposed) { ready = true; dirty = true; }
      } catch (e) {
        if (!disposed && !abort.signal.aborted) {
          latest.current.onError(e instanceof Error ? e.message : 'Could not load the anatomy.');
        }
      }
    })();

    // --- Markers ----------------------------------------------------------
    const markerGroup = new T.Group();
    scene.add(markerGroup);
    const discTexture = makeDiscTexture();
    const markerVisuals: { sprites: T.Sprite[] }[] = [];
    let pxToScale = 0.02; // world-height-per-pixel factor, refreshed on resize

    const addMarkerVisual = (point: Vec3, layers: { color: string; px: number; opacity?: number }[]) => {
      const sprites = layers.map((layer, order) => {
        const material = new T.SpriteMaterial({
          map: discTexture,
          color: layer.color,
          transparent: true,
          opacity: layer.opacity ?? 1,
          depthTest: false,
          depthWrite: false,
          sizeAttenuation: false,
        });
        const sprite = new T.Sprite(material);
        sprite.position.fromArray(point);
        sprite.renderOrder = 10 + order;
        sprite.userData.px = layer.px;
        markerGroup.add(sprite);
        return sprite;
      });
      markerVisuals.push({ sprites });
    };
    const sizeMarkers = () => {
      for (const v of markerVisuals) for (const s of v.sprites) s.scale.setScalar((s.userData.px as number) * pxToScale);
    };
    const clearMarkers = () => {
      for (const child of [...markerGroup.children]) {
        (child as T.Sprite).material.dispose();
        markerGroup.remove(child);
      }
      markerVisuals.length = 0;
    };
    const rebuildMarkers = () => {
      const { markers, activeMarkerId, draftPoint } = latest.current;
      clearMarkers();
      for (const m of markers) {
        const px = 16 + Math.min(10, m.severity) * 1.2;
        const active = m.id === activeMarkerId;
        addMarkerVisual(m.point, [
          { color: active ? '#1d4ed8' : '#ffffff', px: px + (active ? 10 : 5) },
          { color: severityColor(m.severity, m.resolved), px, opacity: m.resolved ? 0.75 : 0.95 },
        ]);
      }
      if (draftPoint) {
        addMarkerVisual(draftPoint, [
          { color: '#1d4ed8', px: 34, opacity: 0.35 },
          { color: '#ffffff', px: 24 },
          { color: '#2563eb', px: 18 },
        ]);
      }
      sizeMarkers();
      dirty = true;
    };

    // --- Camera -----------------------------------------------------------
    const fovTan = () => Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    const fullBodyDistance = () => Math.max(1.0 / fovTan(), 0.6 / (fovTan() * Math.max(camera.aspect, 0.2))) * 1.08;
    let tween: { fromPos: T.Vector3; toPos: T.Vector3; fromTarget: T.Vector3; toTarget: T.Vector3; t: number } | null = null;

    const flyTo = (target: T.Vector3, position: T.Vector3, animate = true) => {
      if (!animate) {
        controls.target.copy(target);
        camera.position.copy(position);
        controls.update();
        dirty = true;
        tween = null;
        return;
      }
      tween = { fromPos: camera.position.clone(), toPos: position, fromTarget: controls.target.clone(), toTarget: target, t: 0 };
    };
    const applyView = (view: View, animate: boolean) => {
      const target = new T.Vector3(0, BODY_CENTER_Y, 0);
      flyTo(target, target.clone().addScaledVector(viewDirection(view).normalize(), fullBodyDistance()), animate);
    };
    const applyFocus = (point: Vec3, distance: number) => {
      const target = new T.Vector3().fromArray(point);
      const dir = camera.position.clone().sub(controls.target).normalize();
      flyTo(target, target.clone().addScaledVector(dir, Math.max(0.15, distance)));
    };

    // --- Sizing -----------------------------------------------------------
    let framed = false;
    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return; // the page keeps this mounted while hidden
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio, w < 768 ? 1.5 : 2));
      renderer.setSize(w, h);
      pxToScale = (2 * fovTan()) / h;
      sizeMarkers();
      if (!framed) { applyView('three-quarter', false); framed = true; }
      dirty = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    // --- Hover / tap picking ------------------------------------------------
    const raycaster = new T.Raycaster();
    const pointer = new T.Vector2();
    const hitPoint = new T.Vector3();
    const tap = new PointerTap();
    const projected = new T.Vector3();

    const hover = document.createElement('div');
    hover.className = 'pointer-events-none absolute z-10 max-w-[240px] rounded-md bg-slate-900/90 px-2 py-1 text-xs text-white shadow';
    hover.setAttribute('role', 'tooltip');
    hover.hidden = true;
    el.appendChild(hover);

    const pickAt = (clientX: number, clientY: number): { index: number; point: T.Vector3 } | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      let nearest = Infinity;
      let found: { index: number; point: T.Vector3 } | null = null;
      // With any solid structure showing, the translucent skin shell is not a target.
      const hasSolid = atlas.parts.some((p, i) => p.system !== 'integumentary' && stateData[i * 4] > 127);
      // A layer peeled away to (near-)invisible shouldn't still catch clicks meant for what's now
      // visibly underneath it — the raycaster otherwise has no notion of a material's opacity.
      const peel = latest.current.peel;
      const skinPickable = skinOpacity(peel) >= 0.05;
      const musclePickable = muscleOpacity(peel) >= 0.05;
      for (let i = 0; i < pickers.length; i++) {
        const mesh = pickers[i];
        if (!mesh || stateData[i * 4] < 128) continue;
        const system = atlas.parts[i].system;
        if (hasSolid && system === 'integumentary') continue;
        if (!skinPickable && system === 'integumentary') continue;
        if (!musclePickable && system === 'muscular') continue;
        if (!raycaster.ray.intersectBox(bounds[i], hitPoint)) continue;
        const hit = raycaster.intersectObject(mesh, false)[0];
        if (hit && hit.distance < nearest) {
          nearest = hit.distance;
          found = { index: i, point: hit.point.clone() };
        }
      }
      return found;
    };
    const markerAt = (clientX: number, clientY: number, radius: number): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      const { markers } = latest.current;
      let best: string | null = null;
      let bestDist = radius;
      for (const m of markers) {
        projected.fromArray(m.point).project(camera);
        if (projected.z < -1 || projected.z > 1) continue;
        const sx = ((projected.x + 1) / 2) * rect.width + rect.left;
        const sy = ((1 - projected.y) / 2) * rect.height + rect.top;
        const d = Math.hypot(sx - clientX, sy - clientY);
        if (d < bestDist) { bestDist = d; best = m.id; }
      }
      return best;
    };

    let lastHover = 0;
    const onDown = (e: PointerEvent) => {
      hover.hidden = true;
      tap.down(e.pointerId, e.clientX, e.clientY, e.pointerType === 'touch' ? 12 : 5);
    };
    const onMove = (e: PointerEvent) => {
      tap.move(e.pointerId, e.clientX, e.clientY);
      const canvas = renderer.domElement;
      if (e.buttons || e.pointerType === 'touch' || !ready) { hover.hidden = true; return; }
      const now = performance.now();
      if (now - lastHover < HOVER_INTERVAL_MS) return;
      lastHover = now;
      if (markerAt(e.clientX, e.clientY, MARKER_HIT_RADIUS_PX)) {
        canvas.style.cursor = 'pointer';
        hover.hidden = true;
        return;
      }
      const hit = pickAt(e.clientX, e.clientY);
      const rect = el.getBoundingClientRect();
      canvas.style.cursor = latest.current.picking ? 'crosshair' : hit ? 'pointer' : 'grab';
      if (hit) {
        hover.textContent = atlas.parts[hit.index].name;
        hover.style.left = `${Math.max(8, Math.min(e.clientX - rect.left + 14, el.clientWidth - 250))}px`;
        hover.style.top = `${Math.max(8, Math.min(e.clientY - rect.top + 18, el.clientHeight - 40))}px`;
        hover.hidden = false;
      } else {
        hover.hidden = true;
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!tap.up(e.pointerId, e.clientX, e.clientY) || !ready) return;
      const markerId = markerAt(e.clientX, e.clientY, e.pointerType === 'touch' ? 26 : MARKER_HIT_RADIUS_PX);
      if (markerId) {
        hover.hidden = true;
        latest.current.onMarkerClick(markerId);
        return;
      }
      const hit = pickAt(e.clientX, e.clientY);
      if (hit) {
        hover.hidden = true;
        latest.current.onPick({ partId: atlas.parts[hit.index].id, point: hit.point.toArray() as Vec3 });
      }
    };
    const onCancel = (e: PointerEvent) => tap.cancel(e.pointerId);
    const onLeave = () => { hover.hidden = true; };
    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('pointerleave', onLeave);
    const onContextLost = (e: Event) => {
      e.preventDefault();
      latest.current.onError('The 3D session was paused by your device. Reload to continue.');
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    // --- Frame loop ---------------------------------------------------------
    const clock = new T.Clock();
    let lastVisible: SystemId[] | null = null;
    let lastSelected: string | null | undefined;
    let lastMarkers: PainMarker[] | null = null;
    let lastActive: string | null | undefined;
    let lastDraft: Vec3 | null | undefined;
    let lastCameraNonce = latest.current.cameraRequest.nonce;
    let lastPeel = -1;

    const applyPeel = (peel: number) => {
      const skin = systemMaterials.get('integumentary') as T.MeshStandardMaterial | undefined;
      const muscle = systemMaterials.get('muscular') as T.MeshStandardMaterial | undefined;
      if (skin) skin.opacity = skinOpacity(peel);
      if (muscle) muscle.opacity = muscleOpacity(peel);
      dirty = true;
    };

    const applyPartState = () => {
      const { visible, selectedPartId, draftPoint } = latest.current;
      const visibleSet = new Set(visible);
      // While there's an unsaved pain spot (picking a new one, or reviewing before it's saved), the small
      // spotHighlight glow below is the "you are here" feedback instead of the whole-structure tint — so a
      // tap on a large muscle doesn't read as the whole muscle being marked painful.
      const wholePartHighlight = !draftPoint;
      for (let i = 0; i < atlas.parts.length; i++) {
        const p = atlas.parts[i];
        const selected = p.id === selectedPartId;
        stateData[i * 4] = visibleSet.has(p.system) || selected ? 255 : 0;
        stateData[i * 4 + 1] = selected && wholePartHighlight ? 255 : 0;
        stateData[i * 4 + 3] = 255;
      }
      stateTexture.needsUpdate = true;
      if (draftPoint) spotHighlight.value.set(draftPoint[0], draftPoint[1], draftPoint[2], SPOT_RADIUS);
      else spotHighlight.value.w = -1;
      dirty = true;
    };

    const animate = () => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const s = latest.current;

      if (s.visible !== lastVisible || s.selectedPartId !== lastSelected || s.draftPoint !== lastDraft) {
        applyPartState();
        lastVisible = s.visible;
        lastSelected = s.selectedPartId;
      }
      if (s.markers !== lastMarkers || s.activeMarkerId !== lastActive || s.draftPoint !== lastDraft) {
        rebuildMarkers();
        lastMarkers = s.markers;
        lastActive = s.activeMarkerId;
        lastDraft = s.draftPoint;
      }
      if (s.peel !== lastPeel) {
        applyPeel(s.peel);
        lastPeel = s.peel;
      }
      if (s.cameraRequest.nonce !== lastCameraNonce) {
        lastCameraNonce = s.cameraRequest.nonce;
        if (s.cameraRequest.focus) applyFocus(s.cameraRequest.focus.point, s.cameraRequest.focus.distance);
        else if (s.cameraRequest.view) applyView(s.cameraRequest.view, true);
      }
      if (tween) {
        tween.t = Math.min(1, tween.t + dt / 0.55);
        const k = tween.t * tween.t * (3 - 2 * tween.t);
        camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
        controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
        if (tween.t >= 1) tween = null;
        dirty = true;
      }
      controls.update();
      if (dirty && el.clientWidth && el.clientHeight) {
        renderer.render(scene, camera);
        dirty = false;
      }
    };
    animate();

    return () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      clearMarkers();
      discTexture.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      scene.traverse((o) => {
        if (o instanceof T.Mesh && !geometries.includes(o.geometry)) {
          o.geometry.dispose();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => m.dispose());
        }
      });
      env.dispose();
      stateTexture.dispose();
      hover.remove();
      renderer.dispose();
      canvas.remove();
    };
    // Everything else flows in through `latest`; only a new atlas rebuilds the scene.
  }, [atlas]);

  // Cursor reflects pick mode even before the pointer moves.
  useEffect(() => {
    const canvas = host.current?.querySelector('canvas');
    if (canvas) canvas.style.cursor = props.picking ? 'crosshair' : 'grab';
  }, [props.picking]);

  return <div ref={host} className="relative h-full w-full overflow-hidden" />;
}
