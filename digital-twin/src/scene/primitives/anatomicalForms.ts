import * as THREE from 'three';

/**
 * Generic organic-form builders shared by every anatomical component.
 *
 * The whole body used to be assembled from raw THREE primitives
 * (CylinderGeometry limbs, SphereGeometry organs, BoxGeometry hands), which
 * is why it read as "a robot with shapes inside it": real anatomy has no
 * constant-radius tubes and no spherical organs. Everything here exists to
 * replace those primitives with the two properties that actually sell a
 * human silhouette:
 *
 *  1. ELLIPTICAL cross-sections. A human trunk is far wider than it is
 *     deep (~0.65 depth:width); limbs are mildly elliptical too. A circular
 *     cross-section is the single biggest "this is a cylinder" tell.
 *  2. NON-MONOTONIC profiles. Limbs bulge at muscle bellies and neck in at
 *     joints; the trunk flares at chest and hips and pinches at the waist.
 *     A straight taper (CylinderGeometry's radiusTop/radiusBottom) cannot
 *     express that.
 *
 * These are still procedural primitives, NOT scan-derived meshes — see the
 * README's "geometry-provider seam" section for where real patient assets
 * would replace them. Every builder here is deterministic (no Math.random)
 * so results are stable across reloads and safe to memoize in the geometry
 * cache.
 */

/** One horizontal cross-section of a lofted form. */
export interface LoftRing {
  y: number;
  radiusX: number;
  radiusZ: number;
  centerX?: number;
  centerZ?: number;
}

/**
 * Lofts a surface through a stack of elliptical cross-sections. This is the
 * workhorse: trunk, head, neck, every limb segment, hands and feet are all
 * built from it, which is what lets adjoining parts share an exact boundary
 * profile instead of visibly stacking as separate primitives.
 *
 * `rings` MUST be ordered by increasing y — triangle winding (and therefore
 * which way the surface faces) is derived from that assumption.
 */
export function buildLoftGeometry(
  rings: LoftRing[],
  radialSegments = 28,
  opts?: { capTop?: boolean; capBottom?: boolean },
): THREE.BufferGeometry {
  const capTop = opts?.capTop ?? true;
  const capBottom = opts?.capBottom ?? true;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const ringCount = rings.length;
  const cols = radialSegments + 1; // duplicated seam column so UVs don't wrap

  for (let i = 0; i < ringCount; i++) {
    const ring = rings[i];
    const cx = ring.centerX ?? 0;
    const cz = ring.centerZ ?? 0;
    for (let j = 0; j < cols; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      positions.push(cx + ring.radiusX * Math.cos(theta), ring.y, cz + ring.radiusZ * Math.sin(theta));
      uvs.push(j / radialSegments, ringCount > 1 ? i / (ringCount - 1) : 0);
    }
  }

  for (let i = 0; i < ringCount - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = (i + 1) * cols + j;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  if (capBottom) {
    const first = rings[0];
    const centerIndex = positions.length / 3;
    positions.push(first.centerX ?? 0, first.y, first.centerZ ?? 0);
    uvs.push(0.5, 0);
    for (let j = 0; j < radialSegments; j++) {
      indices.push(centerIndex, j, j + 1);
    }
  }

  if (capTop) {
    const last = rings[ringCount - 1];
    const base = (ringCount - 1) * cols;
    const centerIndex = positions.length / 3;
    positions.push(last.centerX ?? 0, last.y, last.centerZ ?? 0);
    uvs.push(0.5, 1);
    for (let j = 0; j < radialSegments; j++) {
      indices.push(centerIndex, base + j + 1, base + j);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A control point on a profile curve: `t` runs 0 (top) to 1 (bottom). */
export interface ProfilePoint {
  t: number;
  /** Half-width across the body (X). */
  rx: number;
  /** Half-depth front-to-back (Z). Defaults to `rx * 0.88` — limbs are subtly elliptical, never perfectly round. */
  rz?: number;
  /** Lateral offset of this slice's center. */
  cx?: number;
  /** Front-to-back offset of this slice's center (e.g. the forward set of the face, the backward lean of the calf). */
  cz?: number;
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const v0 = (p2 - p0) * 0.5;
  const v1 = (p3 - p1) * 0.5;
  const t2 = t * t;
  const t3 = t * t2;
  return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
}

interface SampledProfile {
  rx: number;
  rz: number;
  cx: number;
  cz: number;
}

/**
 * Catmull-Rom interpolation across profile control points. Spline (rather
 * than linear) interpolation is what keeps a bicep or calf belly reading as
 * a smooth swell instead of a faceted cone — with linear interpolation the
 * silhouette creases visibly at every control point.
 */
export function sampleProfile(points: ProfilePoint[], t: number): SampledProfile {
  const n = points.length;
  if (n === 0) return { rx: 0, rz: 0, cx: 0, cz: 0 };
  if (n === 1) {
    const p = points[0];
    return { rx: p.rx, rz: p.rz ?? p.rx * 0.88, cx: p.cx ?? 0, cz: p.cz ?? 0 };
  }

  const clamped = Math.min(1, Math.max(0, t));
  let seg = 0;
  while (seg < n - 2 && clamped > points[seg + 1].t) seg++;

  const p1 = points[seg];
  const p2 = points[seg + 1];
  const p0 = points[Math.max(0, seg - 1)];
  const p3 = points[Math.min(n - 1, seg + 2)];

  const span = p2.t - p1.t;
  const local = span > 1e-6 ? (clamped - p1.t) / span : 0;

  const rzOf = (p: ProfilePoint) => p.rz ?? p.rx * 0.88;
  return {
    rx: Math.max(0, catmullRom(p0.rx, p1.rx, p2.rx, p3.rx, local)),
    rz: Math.max(0, catmullRom(rzOf(p0), rzOf(p1), rzOf(p2), rzOf(p3), local)),
    cx: catmullRom(p0.cx ?? 0, p1.cx ?? 0, p2.cx ?? 0, p3.cx ?? 0, local),
    cz: catmullRom(p0.cz ?? 0, p1.cz ?? 0, p2.cz ?? 0, p3.cz ?? 0, local),
  };
}

export interface ProfiledFormOptions {
  /** World Y of the t=0 end (the top). */
  topY: number;
  /** World Y of the t=1 end (the bottom). */
  bottomY: number;
  profile: ProfilePoint[];
  /** Cross-section resolution. */
  radialSegments?: number;
  /** Number of lofted slices — more slices, smoother lengthwise curvature. */
  slices?: number;
  capTop?: boolean;
  capBottom?: boolean;
  /** Uniform lateral offset applied to every slice (used to place a limb at its joint). */
  offsetX?: number;
  offsetZ?: number;
}

/**
 * Builds a lofted form from a profile curve, in ABSOLUTE world Y. Keeping
 * body geometry in world coordinates (rather than each part being centered
 * at its own origin and positioned by the component) is what guarantees
 * neighbouring parts meet exactly: two segments that sample the same
 * profile function over adjoining Y ranges share an identical boundary ring
 * by construction, so there is no visible seam or interpenetration to
 * hand-tune.
 */
export function buildProfiledForm(opts: ProfiledFormOptions): THREE.BufferGeometry {
  const { topY, bottomY, profile } = opts;
  const slices = opts.slices ?? 26;
  const radialSegments = opts.radialSegments ?? 26;
  const offsetX = opts.offsetX ?? 0;
  const offsetZ = opts.offsetZ ?? 0;

  const rings: LoftRing[] = [];
  // Emitted bottom-to-top (t=1 down to t=0) to satisfy buildLoftGeometry's
  // increasing-y contract, while callers still author profiles top-down.
  for (let i = 0; i < slices; i++) {
    const t = 1 - i / (slices - 1);
    const sampled = sampleProfile(profile, t);
    rings.push({
      y: THREE.MathUtils.lerp(bottomY, topY, i / (slices - 1)),
      radiusX: sampled.rx,
      radiusZ: sampled.rz,
      centerX: sampled.cx + offsetX,
      centerZ: sampled.cz + offsetZ,
    });
  }

  return buildLoftGeometry(rings, radialSegments, {
    capTop: opts.capTop ?? true,
    capBottom: opts.capBottom ?? true,
  });
}

export interface OrganicBlobOptions {
  /** Base radius before per-axis scaling. */
  radius: number;
  /** Per-axis scale — organs are rarely close to spherical. */
  scale?: [number, number, number];
  /** Amplitude of the surface lumpiness, as a fraction of radius. */
  lumpiness?: number;
  /** Phase offset so two organs built from the same parameters aren't identical twins. */
  phase?: number;
  detail?: number;
}

/**
 * A sphere pushed around by a fixed sum of sinusoids, giving the irregular,
 * softly-lobed surface that reads as organ tissue instead of a ball. The
 * harmonics are a fixed formula rather than random noise so the same organ
 * is byte-identical every reload (and therefore safely cacheable).
 */
export function buildOrganicBlob(opts: OrganicBlobOptions): THREE.BufferGeometry {
  const { radius } = opts;
  const [sx, sy, sz] = opts.scale ?? [1, 1, 1];
  const lumpiness = opts.lumpiness ?? 0.12;
  const phase = opts.phase ?? 0;

  const geometry = new THREE.IcosahedronGeometry(radius, opts.detail ?? 3);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    const n = v.clone().normalize();
    const wobble =
      Math.sin(n.x * 3.1 + phase) * Math.cos(n.y * 2.4 + phase * 0.7) * 0.55 +
      Math.sin(n.y * 4.3 + phase * 1.3) * Math.cos(n.z * 3.7 + phase) * 0.3 +
      Math.sin(n.z * 5.2 + phase * 0.4) * 0.15;
    v.multiplyScalar(1 + wobble * lumpiness);
    position.setXYZ(i, v.x * sx, v.y * sy, v.z * sz);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A smooth tube through a list of points — vessels, nerves, and the gut are
 * all built from this. Points are control points of a Catmull-Rom curve,
 * not a polyline, so vessels curve the way real ones do.
 */
export function buildTubeThrough(
  points: Array<[number, number, number]>,
  radius: number,
  opts?: { tubularSegments?: number; radialSegments?: number; closed?: boolean },
): THREE.BufferGeometry {
  const vectors = points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(vectors, opts?.closed ?? false);
  return new THREE.TubeGeometry(
    curve,
    opts?.tubularSegments ?? Math.max(12, points.length * 6),
    radius,
    opts?.radialSegments ?? 8,
    opts?.closed ?? false,
  );
}

/** One cross-section of a forward-pointing, ground-resting form. */
export interface GroundedStation {
  /** Distance forward (+Z) along the form. */
  z: number;
  /** Full width across (X). */
  width: number;
  /** Full height above the sole (Y). */
  height: number;
}

/**
 * A form that lies along +Z with a FLAT SOLE at y=0 — feet and toes.
 *
 * Feet are the one body part that cannot be built as a vertical loft: they
 * run forward, not down, and they must rest flat on the ground rather than
 * being centered on their own axis. Building them vertically and nudging
 * rings forward (the previous approach) left the toes detached in front of
 * the foot with no way to keep them aligned as the foot profile changed.
 *
 * Stations must be ordered by increasing z. Each ring is offset so its
 * bottom lands exactly on y=0, then the whole form is rotated a quarter
 * turn so its stacking axis points forward.
 *
 * Use a radialSegments count divisible by 4. The rings are polygons, so the
 * sole only touches y=0 exactly when a vertex lands at the bottom of the
 * cross-section; with an odd multiple (22, say) the lowest vertex sits a
 * fraction of a millimetre high and the form technically hovers.
 */
export function buildGroundedForwardForm(stations: GroundedStation[], radialSegments = 20): THREE.BufferGeometry {
  if (radialSegments % 4 !== 0) {
    console.warn(
      `[anatomy] buildGroundedForwardForm: radialSegments=${radialSegments} is not divisible by 4; the sole will not rest exactly on y=0.`,
    );
  }
  const rings: LoftRing[] = stations.map((station) => ({
    y: station.z,
    radiusX: station.width / 2,
    radiusZ: station.height / 2,
    // Pre-rotation Z maps to post-rotation -Y, so this offset is what puts
    // the sole on the ground plane instead of centering the form on it.
    centerZ: -station.height / 2,
  }));

  const geometry = buildLoftGeometry(rings, radialSegments);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** A localized deformation applied to an already-built surface. */
export interface SurfaceFeature {
  /** Where the feature is centred, in the geometry's own space. */
  center: [number, number, number];
  /** Which way the surface moves. Need not be normalized. */
  direction: [number, number, number];
  /** Peak displacement in meters. Negative pulls the surface inward. */
  amount: number;
  /**
   * Falloff radii per axis. Unequal radii are the point: a nose bridge is a
   * tall narrow ridge, a brow is a wide flat one, and a jaw angle is a
   * broad pad — none of which a single-radius blob can express.
   */
  falloff: [number, number, number];
  /** Apply a second, X-mirrored copy. Keeps paired features exactly symmetric. */
  mirror?: boolean;
}

/**
 * Sculpts localized features into a lofted surface.
 *
 * Lofts can only produce ELLIPTICAL cross-sections, which is why a lofted
 * head reads as a balloon or an egg no matter how its profile is tuned: a
 * face is not an ellipse at any height. Real facial structure is a set of
 * local departures from that base form — a brow that overhangs, orbits that
 * recess, a nose that protrudes far past the cheek plane, a chin and jaw
 * angle that break the taper. This applies those as weighted displacements.
 *
 * All weights are computed from the ORIGINAL vertex positions and summed
 * before anything moves, so features never cascade into one another and the
 * result does not depend on the order they are listed in.
 */
export function sculptFeatures(geometry: THREE.BufferGeometry, features: SurfaceFeature[]): THREE.BufferGeometry {
  const position = geometry.attributes.position as THREE.BufferAttribute;

  const expanded: SurfaceFeature[] = [];
  for (const feature of features) {
    expanded.push(feature);
    if (feature.mirror) {
      expanded.push({
        ...feature,
        center: [-feature.center[0], feature.center[1], feature.center[2]],
        direction: [-feature.direction[0], feature.direction[1], feature.direction[2]],
      });
    }
  }

  const normalizedDirs = expanded.map((f) => new THREE.Vector3(...f.direction).normalize());
  const original = new Float32Array(position.array as Float32Array);
  const offset = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    const ox = original[i * 3];
    const oy = original[i * 3 + 1];
    const oz = original[i * 3 + 2];
    offset.set(0, 0, 0);

    for (let f = 0; f < expanded.length; f++) {
      const feature = expanded[f];
      const dx = (ox - feature.center[0]) / feature.falloff[0];
      const dy = (oy - feature.center[1]) / feature.falloff[1];
      const dz = (oz - feature.center[2]) / feature.falloff[2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > 9) continue; // beyond 3 sigma the contribution is < 0.02% — skip it
      offset.addScaledVector(normalizedDirs[f], feature.amount * Math.exp(-d2));
    }

    position.setXYZ(i, ox + offset.x, oy + offset.y, oz + offset.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}
