import { useMemo } from 'react';
import * as THREE from 'three';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry, buildPartialSphereGeometry, buildBiconvexLensGeometry } from '../primitives/proceduralGeometry';
import { EYE } from '../../constants/bodyLayout';
import type { Side } from '../../constants/bodyLayout';

const R = EYE.radius;

/**
 * All geometry here is authored in the eye's LOCAL space: origin = globe
 * center, local +Z = anterior (toward the cornea / the front of the face),
 * local -Z = posterior (toward the retina / optic nerve) — see Eye.tsx,
 * which positions this whole group at the world-space orbit position.
 *
 * THREE.SphereGeometry and THREE.LatheGeometry are both natively
 * Y-axis-symmetric (their "pole"/revolve-axis is Y, not Z). Every partial
 * sphere and the lens below is built in that native orientation and then
 * `.rotateX(Math.PI / 2)` moves the theta=0 pole to local +Z — one
 * consistent, explicit conversion applied everywhere, rather than trying
 * to hand-derive Z-native angles per structure.
 */
export function EyeGlobe({ side }: { side: Side }) {
  const base = `body.head.orbit.${side}.eye.eyeball`;

  const scleraGeometry = useMemo(
    () =>
      cachedGeometry('eye.sclera', () => {
        const geom = buildPartialSphereGeometry(R, { thetaStart: 0.58, thetaLength: Math.PI - 0.58, segments: 28 });
        geom.rotateX(Math.PI / 2);
        return geom;
      }),
    [],
  );

  const corneaGeometry = useMemo(
    () =>
      cachedGeometry('eye.cornea', () => {
        const geom = buildPartialSphereGeometry(R * 0.82, { thetaStart: 0, thetaLength: 0.72, segments: 20 });
        geom.rotateX(Math.PI / 2);
        geom.translate(0, 0, R * 0.22); // bulge the (smaller-radius, steeper) cornea forward of the scleral shell
        return geom;
      }),
    [],
  );

  const irisGeometry = useMemo(
    () => cachedGeometry('eye.iris', () => new THREE.RingGeometry(R * 0.22, R * 0.62, 40)),
    [],
  );
  const pupilGeometry = useMemo(() => cachedGeometry('eye.pupil', () => new THREE.CircleGeometry(R * 0.21, 32)), []);

  const lensGeometry = useMemo(
    () =>
      cachedGeometry('eye.lens', () => {
        const geom = buildBiconvexLensGeometry(R * 0.45, R * 0.34, 24);
        geom.rotateX(Math.PI / 2);
        return geom;
      }),
    [],
  );

  const ciliaryGeometry = useMemo(
    // Default TorusGeometry orientation already has its hole-axis along Z, which is exactly what's wanted here (a ring encircling the lens's optical axis) — no rotation needed.
    () => cachedGeometry('eye.ciliary', () => new THREE.TorusGeometry(R * 0.58, R * 0.1, 10, 28)),
    [],
  );

  // Radius/position chosen to mostly fill the posterior chamber (behind the
  // lens) without reaching far enough anterior to visually swallow the lens
  // and iris — real vitreous doesn't fill the anterior chamber at all, but
  // a full anatomical CSG cutout is out of scope here.
  const vitreousGeometry = useMemo(
    () => cachedGeometry('eye.vitreous', () => new THREE.SphereGeometry(R * 0.78, 24, 20)),
    [],
  );

  return (
    <>
      <SelectableMesh nodeId={`${base}.sclera`} geometry={scleraGeometry} tissue="sclera" />
      <SelectableMesh nodeId={`${base}.cornea`} geometry={corneaGeometry} tissue="cornea" />
      <SelectableMesh nodeId={`${base}.iris`} geometry={irisGeometry} tissue="iris" position={[0, 0, R * 0.58]} />
      <SelectableMesh nodeId={`${base}.pupil`} geometry={pupilGeometry} tissue="pupil" position={[0, 0, R * 0.579]} />
      <SelectableMesh nodeId={`${base}.lens`} geometry={lensGeometry} tissue="lens" position={[0, 0, R * 0.32]} />
      <SelectableMesh
        nodeId={`${base}.ciliaryBody`}
        geometry={ciliaryGeometry}
        tissue="ciliary"
        position={[0, 0, R * 0.32]}
      />
      <SelectableMesh
        nodeId={`${base}.vitreousHumor`}
        geometry={vitreousGeometry}
        tissue="vitreous"
        position={[0, 0, -R * 0.13]}
      />
    </>
  );
}
