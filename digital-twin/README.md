# VITAL-DT — 4D Anatomical Digital Twin

An interactive anatomy explorer prototype: hierarchical drill-down through a procedurally-built human body, hover/click-to-zoom navigation, anatomical system filters, transparency/cutaway, and a mocked 4D physiology playback loop. Built as a **framework**, not a one-off demo — see [Extending this build](#extending-this-build) for the seams where real patient-scan geometry and real physiology data are meant to plug in.

This app lives alongside the existing `client/` (the health report dashboard) as an independent Vite/React/TypeScript app, not merged into it — see the root repo for why.

## Important context for whoever runs this next

This was built in a sandbox with **no Node.js/npm available** — nothing here has been installed, type-checked, run, or visually verified. The code was written as carefully as possible (see "Known risk areas" below for the specific spots most likely to need a fix), but you are the first person to actually execute it. Please run through Setup + Verification below and report back anything broken.

There are also **no real anatomical 3D assets** in this build (no licensed GLTF human-anatomy models exist to use). Every visible shape — bones, muscles, organs, the eye — is built from plain Three.js primitives (spheres, capsules, tubes, a lathe-revolved lens) composed and lit to read as a professional schematic/HUD "digital twin" rather than photoreal illustrated anatomy. The architecture is built so that's a swappable implementation detail, not a load-bearing assumption — see below.

## Setup

```bash
cd digital-twin
npm install
npm run dev
```

Opens on **http://localhost:5183** (a different port from the existing app's CRA client on 3000 and Express API on 5000, so both apps can run side by side).

```bash
npm run typecheck   # tsc --noEmit — do this first, it's the cheapest way to surface any mistakes
npm run build        # production build
```

## Verification checklist

Since none of this has been run yet, this is both a "does it work" checklist and a rough tour of the feature set:

1. Whole body loads, free-orbits with mouse drag / scroll-to-zoom / right-drag-to-pan.
2. Hover the left forearm → it highlights; the hand/upper arm/shoulder dim slightly but stay visible (not the forearm's siblings elsewhere in the body — those dim more, to a background level).
3. Click the left arm → camera flies in, breadcrumb bar top-left updates, left-panel tree expands to it, right panel shows "Left Arm" with its children (Shoulder, Upper Arm, Biceps, Triceps, Elbow, Forearm, Wrist, Hand).
4. Drill Hand → Index Finger → hovering it highlights only that finger, not its neighbors. Its children (phalanges, joints) are independently selectable.
5. Click a breadcrumb to jump back; click "Whole Body" in the tree to reset.
6. Navigate Head → Orbit → Left Eye → Eyeball. Raise the Transparency slider (left panel) — cornea/sclera/iris fade, revealing the lens/vitreous/retina inside.
7. Click Retina — camera moves inside the globe toward the posterior pole; Macula, Optic Disc, Retinal Arteries, Retinal Veins become selectable.
8. Toggle system filters (left panel) — e.g. turn off Skeletal and finger bones/ribcage/hip joints disappear; turn off Cardiovascular and the retinal vessels disappear.
9. Press play on the time control (bottom bar or left-panel mini control) — the heart pulses, the torso/lungs subtly expand and contract, the scrubber advances. Pause/reset/speed (0.5x–4x) all work. Everything physiology-related is labeled "Mock Data".
10. Right eye, right arm, both legs: present and navigable, but deliberately simpler (see "Flagship vs. generic branches" below) — this is by design, not a bug.

## Architecture

```
src/
  types/            AnatomyNode, PhysiologyFrame, ViewMode — the data model (see below)
  constants/         bodyLayout.ts — single source of truth for body proportions, shared by
                      the data files (camera-target math) and the scene files (actual geometry
                      placement), so the two can't silently drift apart
  data/
    anatomy/          One module per body branch; index.ts merges them into a flat map and
                       derives ancestry/descendant caches + a validator
    physiology/        mockGenerator.ts — the ONLY place fabricated physiology values live
  store/              useAnatomyStore (navigation/hover), useViewStore (filters/transparency)
  engine/             physiologyEngine (vanilla zustand store, the 4D playback clock)
  hooks/              raycast resolution, camera nudge controls, node/emphasis selectors
  scene/              React Three Fiber: the canvas, camera rig, lighting, and every
                       anatomical component (scene/body/**, scene/eye/**)
  components/         DOM UI: top nav, four-panel anatomy layout, shared widgets
  pages/              One page per top-nav tab (only Anatomy is fully built)
```

### Data model

`AnatomyNode` (`types/anatomy.ts`) and `PhysiologyFrame` (`types/physiology.ts`) are deliberately separate: anatomy is static structure, physiology is time-varying state, and they only meet through the optional `AnatomyNode.physiologyKey` → `PhysiologyFrame.bodyRegions[key]` lookup. That means the same anatomy tree can later be replayed against a recorded patient session or a live feed without changing anything about what the tree *is*.

Every node's `children` array is **derived**, not hand-authored — `data/anatomy/index.ts` scans every node's `parentId` and builds `children` from that, once, at module load. Every node literal in `data/anatomy/*.ts` has `children: []` for this reason; that's not a bug, it's the point (a single direction of truth, since there was no compiler available to catch a hand-authored parent/child array going out of sync across ~230 nodes).

### Navigation & the "current selectable set"

Clicking (in 3D or in the left tree) sets `useAnatomyStore`'s `selectedNodeId`. Three things react to that:

- **Camera** (`scene/CameraRig.tsx`): flies to the node's authored `cameraTarget` if it has one, otherwise live-`fitToBox`'s whatever's actually rendered for that node (via a small runtime object registry in `utils/raycast.ts`) — so every node is framed reasonably even where a camera shot wasn't hand-tuned.
- **Raycast/hover scope** (`hooks/useAnatomyNode.ts`'s `useCurrentSelectableSet`, backed by `data/anatomy/index.ts`'s `getSelectableFrontier`): the newly-focused node's children become the next hoverable/clickable set — but the frontier computation transparently skips over non-selectable *organizational* nodes (like "Upper Extremities", which groups Left/Right Arm without being a click target itself) to find the next real selectable node underneath.
- **Dimming** (`useNodeEmphasis`): everything outside the current focus's ancestor/descendant chain fades toward a background level; within the current scope, hovering one sibling further dims the others — two independent, combined effects.

A raycast hit is resolved to "the smallest logical anatomical subassembly under the cursor" by walking a precomputed ancestry chain from the exact mesh hit upward until something in the current selectable set is found (`utils/raycast.ts`'s `resolveSelectableAncestor`) — this is why the forearm (rendered as two separate meshes, radius and ulna, sharing one node id) highlights as a single unit no matter which bone you're actually pointing at.

### The geometry-provider seam (where real scan assets plug in)

Every anatomical React component (`scene/body/*.tsx`, `scene/eye/*.tsx`) wraps its shape in a `<SelectableMesh nodeId="..." geometry={...} tissue="...">` (`scene/primitives/SelectableMesh.tsx`). That component owns *all* of the interaction/highlight/dimming/visibility logic; it has no idea whether `geometry` came from `new THREE.SphereGeometry(...)` or a loaded file. **Replacing procedural anatomy with a real patient scan means editing the inside of one component at a time** — e.g. in `scene/eye/EyeGlobe.tsx`, swapping:

```tsx
const corneaGeometry = useMemo(() => cachedGeometry('eye.cornea', () => buildPartialSphereGeometry(...)), []);
// ...
<SelectableMesh nodeId={`${base}.cornea`} geometry={corneaGeometry} tissue="cornea" />
```

for something like:

```tsx
const { nodes } = useGLTF('/models/patient-001-eye.glb'); // suspends — Canvas already wraps body content in <Suspense>
// ...
<SelectableMesh nodeId={`${base}.cornea`} geometry={nodes.Cornea.geometry} tissue="cornea" />
```

Nothing in the store, camera, raycast, or highlight system needs to change. `AnatomyNode.meshIds` (currently unused at runtime, just documentation) is meant to become the literal named-mesh lookup key inside an imported GLTF scene graph at that point. Draco decompression, once real compressed assets exist, is a `DRACOLoader` attached to `useGLTF`'s loader — there's nothing to compress yet in this build (no binary assets).

### 4D physiology playback

`engine/physiologyEngine.ts` is a **vanilla** zustand store (`zustand/vanilla`, not the React-hook `create`) — deliberately, because it updates every animation frame while playing, and every mesh that animates with it (heart, lungs) reads `physiologyEngine.getState()` inside its *own* `useFrame`, never through a React-subscribed hook. That's what keeps 60fps physiology animation from re-rendering the React tree. The one narrow React binding onto it, `engine/usePhysiologyPlayback.ts`, is used only by small DOM readouts (bottom time bar, mini time control, right-panel physiology placeholder) where re-rendering on every tick is normal and cheap.

`setPhysiologyFrame(time)` — the API named in the spec — recomputes state at an arbitrary time via `data/physiology/mockGenerator.ts`. That file is the **entire** boundary between "fabricated" and "real": every value it returns is explicitly commented as a placeholder, and swapping it for a real feed (device stream, EHR time series, or CFD/ROM simulation output) means replacing the body of `generatePhysiologyFrame(time)` with a lookup/interpolation against real data while returning the same `PhysiologyFrame` shape — nothing else in the app changes. Every UI surface that displays a physiology value carries a "Mock Data" badge for this reason.

### Flagship vs. generic branches

Building full bespoke geometry for every one of ~230 nodes wasn't a realistic scope for a single pass, so effort was concentrated on the two demonstrations the spec called out explicitly:

- **Left arm → hand → fingers**: full shoulder/upper-arm(+biceps/triceps)/elbow/forearm(radius+ulna)/wrist/hand/palm/five-finger/phalanx/joint detail.
- **Eye**: full cornea/sclera/iris/pupil/lens/ciliary body/vitreous/retina(→macula/optic disc/retinal arteries+veins)/optic nerve/extraocular muscles/eyelids/lacrimal detail, with cutaway transparency and the "fly inside the globe" retina interaction.

Everything else (right arm, both legs, torso organs, right eye, abdomen) is real, navigable, data-driven anatomy — just with simpler generic geometry and, for finger/toe-level tissue leaves (artery/vein/nerve/tendon/muscle/skin), **data-only nodes** with no geometry at all (they show up in the tree and right panel, described in text, but aren't independently clickable in 3D — see each data file's comments for the exact list). This split is documented inline in `data/anatomy/upperExtremity.ts`, `lowerExtremity.ts`, and `eye.ts`.

## Known risk areas

Flagging these explicitly rather than presenting the build as more verified than it is:

- **`three/examples/jsm/utils/BufferGeometryUtils.js`** is imported in three places (retinal vessels, ribcage, eye muscles/eyelids) to merge several small geometries into one. This is a standard, long-established three.js pattern, but it's the one dependency-resolution path here that's least like everyday `import from 'package'` usage. If it fails to resolve, the 3D viewport will show a caught-error message (see below) rather than a blank app, but those three structures specifically would need a look.
- **`camera-controls`' exact prop/behavior surface** (`minDistance`, `dollyToCursor`, `smoothTime`, `fitToBox`'s accepted argument types) was used based on well-known, longstanding API knowledge, not verified against the installed version. `scene/CameraRig.tsx` computes its own `THREE.Box3` and wraps camera calls in a `try/catch` specifically to contain any mismatch here.
- **Hand-authored `cameraTarget` positions** (in `data/anatomy/*.ts`) are approximate — computed from the same body-proportion constants the geometry uses, but by hand, not verified visually. Expect some shots to be framed a little loosely; none should point at empty space, since most non-flagship nodes fall back to live `fitToBox` rather than a hand-guessed camera position.
- An `ErrorBoundary` (`components/ErrorBoundary.tsx`) wraps the `<Canvas>` specifically because this is the highest-density hand-written, unverified code in the app — if one component has a mistake, you should see a small in-place error message instead of a blank white screen, and the rest of the UI (nav, panels) should keep working.

## Extending this build

- **Patient-specific scans**: see "The geometry-provider seam" above.
- **Real physiology**: see "4D physiology playback" above — the seam is `data/physiology/mockGenerator.ts`.
- **Sensor measurements / CFD / ROM outputs**: same seam as real physiology — anything that can produce a `PhysiologyFrame` per timestamp (or interpolate between recorded ones) drops in at `physiologyEngine.setPhysiologyFrame`.
- **More anatomical detail**: add nodes to the relevant `data/anatomy/*.ts` file (or a new branch file, registered in `data/anatomy/index.ts`), then a matching `<SelectableMesh>` in a `scene/body/**` or `scene/eye/**` component. No other system needs to know a new node exists.
- **Deep-linking / shareable URLs**: not implemented (local React/zustand state only, no router) — would mean introducing `react-router` and syncing `selectedNodeId` to the URL.
- **Real medical imaging modes**: the X-Ray/CT/MRI buttons are stylized visibility/opacity presets (`store/useViewStore.ts`'s `presetForViewMode`), not simulated imaging — there's no volumetric/Hounsfield-unit data to render.
- **Performance headroom**: geometry/material sharing, merged (not instanced) vessel geometry, and physiology-out-of-React-state are already in place (see code comments in `scene/primitives/`). Not yet built: a real LOD asset pipeline and Draco decompression — both wait on there being real imported binary assets to apply them to.
