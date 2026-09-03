import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BodySex } from '../../constants/bodyLayout';

const geometryCache = new Map<string, THREE.BufferGeometry>();

/** Memoizes a procedural geometry by key so identical repeats (e.g. phalanges across both hands) share one BufferGeometry instead of allocating a new one per mesh. */
export function cachedGeometry(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  const cached = geometryCache.get(key);
  if (cached) return cached;
  const geometry = build();
  geometryCache.set(key, geometry);
  return geometry;
}

/**
 * Same memoization, namespaced by anatomy sex.
 *
 * Use this — never bare `cachedGeometry` — for any geometry whose shape
 * depends on the selected sex. The cache is global and keyed by string, so
 * a shared key would hand the female figure geometry built for the male one
 * (and vice versa) the first time the model is switched, with no error
 * anywhere: the wrong body would simply render.
 */
export function sexedGeometry(
  sex: BodySex,
  key: string,
  build: () => THREE.BufferGeometry,
): THREE.BufferGeometry {
  return cachedGeometry(`${sex}:${key}`, build);
}

/**
 * A partial sphere shell — the workhorse for the eye (sclera, cornea,
 * retina) and any other "cut open globe" shape. Thin wrapper around
 * THREE.SphereGeometry's own phi/theta start+length parameters, named for
 * what it's used for rather than requiring every call site to remember the
 * six-argument constructor order.
 */
export function buildPartialSphereGeometry(
  radius: number,
  opts?: { phiStart?: number; phiLength?: number; thetaStart?: number; thetaLength?: number; segments?: number },
): THREE.SphereGeometry {
  const segments = opts?.segments ?? 32;
  return new THREE.SphereGeometry(
    radius,
    segments,
    segments,
    opts?.phiStart ?? 0,
    opts?.phiLength ?? Math.PI * 2,
    opts?.thetaStart ?? 0,
    opts?.thetaLength ?? Math.PI,
  );
}

/**
 * A symmetric biconvex lens profile, generated formulaically (two mirrored
 * quarter-ellipse arcs) rather than freehand coordinates, so it can't
 * produce degenerate/self-intersecting geometry by construction.
 */
export function buildBiconvexLensGeometry(radius: number, thickness: number, segments = 24): THREE.LatheGeometry {
  const points: THREE.Vector2[] = [];
  const halfThickness = thickness / 2;
  const arcSteps = 12;

  // Anterior face: from the equator (x=radius) in to the anterior apex (x=0).
  for (let i = 0; i <= arcSteps; i++) {
    const t = i / arcSteps;
    const x = radius * Math.cos((t * Math.PI) / 2);
    const y = halfThickness * Math.sin((t * Math.PI) / 2);
    points.push(new THREE.Vector2(x, y));
  }
  // Posterior face: back out from the posterior apex to the equator.
  for (let i = 1; i <= arcSteps; i++) {
    const t = i / arcSteps;
    const x = radius * Math.sin((t * Math.PI) / 2);
    const y = -halfThickness * Math.cos((t * Math.PI) / 2);
    points.push(new THREE.Vector2(x, y));
  }

  return new THREE.LatheGeometry(points, segments);
}

function sphericalToCartesian(center: THREE.Vector3, radius: number, theta: number, phi: number): THREE.Vector3 {
  // theta: polar angle measured from the -Z ("posterior pole") axis; phi: azimuth around Z.
  const sinTheta = Math.sin(theta);
  const x = radius * sinTheta * Math.cos(phi);
  const y = radius * sinTheta * Math.sin(phi);
  const z = -radius * Math.cos(theta);
  return new THREE.Vector3(center.x + x, center.y + y, center.z + z);
}

export interface VesselBranch {
  deltaTheta: number;
  deltaPhi: number;
}

export interface VesselTreeOptions {
  sphereCenter: THREE.Vector3;
  sphereRadius: number;
  /** Spherical angle (radians) the tree originates from — the optic disc. */
  originThetaPhi: [number, number];
  branches: VesselBranch[];
  tubeRadius: number;
}

/**
 * A small, fixed-topology branching vessel network (NOT a recursive/random
 * generator) merged into one BufferGeometry — one draw call, one
 * selectable node per tree (arteries, veins), matching how an artery or
 * vein is actually selected as a single subassembly rather than per-twig.
 * Fixed topology is deliberate: with no way to render/inspect this while
 * writing it, a hand-checkable fixed set of control points is safer than a
 * generative algorithm that could produce a degenerate curve.
 */
export function buildVesselTreeGeometry(opts: VesselTreeOptions): THREE.BufferGeometry {
  const { sphereCenter, sphereRadius, originThetaPhi, branches, tubeRadius } = opts;
  const [theta0, phi0] = originThetaPhi;
  const shellRadius = sphereRadius * 1.002; // sit just outside the retinal surface to avoid z-fighting
  const origin = sphericalToCartesian(sphereCenter, shellRadius, theta0, phi0);

  const parts: THREE.BufferGeometry[] = [];
  for (const branch of branches) {
    const mid = sphericalToCartesian(sphereCenter, shellRadius, theta0 + branch.deltaTheta * 0.55, phi0 + branch.deltaPhi * 0.55);
    const end = sphericalToCartesian(sphereCenter, shellRadius, theta0 + branch.deltaTheta, phi0 + branch.deltaPhi);
    const curve = new THREE.CatmullRomCurve3([origin.clone(), mid, end]);
    const tube = new THREE.TubeGeometry(curve, 6, tubeRadius, 5, false);
    parts.push(tube);
  }

  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return merged ?? new THREE.BufferGeometry();
}
