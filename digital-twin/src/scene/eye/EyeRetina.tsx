import { useMemo } from 'react';
import * as THREE from 'three';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry, buildPartialSphereGeometry, buildVesselTreeGeometry } from '../primitives/proceduralGeometry';
import { EYE } from '../../constants/bodyLayout';
import type { Side } from '../../constants/bodyLayout';

const R = EYE.radius;
// Macula is temporal (away from the nose); optic disc is nasal (toward the
// nose). These coordinates are authored for ONE eye — -X is nasal here —
// and the parent group mirrors them for the other side (see Eye.tsx), so
// both eyes get their disc toward the nose and macula toward the temple
// without a second set of coordinates.
const MACULA_LOCAL: [number, number, number] = [0.0016, -0.0005, -R * 0.975];
const OPTIC_DISC_LOCAL: [number, number, number] = [-0.0019, 0.0008, -R * 0.975];

export function EyeRetina({ side }: { side: Side }) {
  const eyeballBase = `body.head.orbit.${side}.eye.eyeball`;
  const retinaBase = `${eyeballBase}.retina`;

  const retinaGeometry = useMemo(
    () =>
      cachedGeometry('eye.retina', () => {
        const geom = buildPartialSphereGeometry(R * 0.94, { thetaStart: Math.PI * 0.32, thetaLength: Math.PI * 0.68, segments: 24 });
        geom.rotateX(Math.PI / 2);
        return geom;
      }),
    [],
  );

  const maculaGeometry = useMemo(() => cachedGeometry('eye.macula', () => new THREE.CircleGeometry(R * 0.13, 16)), []);
  const opticDiscGeometry = useMemo(() => cachedGeometry('eye.opticDisc', () => new THREE.CircleGeometry(R * 0.16, 16)), []);

  const opticNerveGeometry = useMemo(
    () =>
      cachedGeometry('eye.opticNerve', () => {
        const [ox, oy, oz] = OPTIC_DISC_LOCAL;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(ox, oy, oz),
          new THREE.Vector3(ox * 1.6, oy * 1.6, oz * 1.15),
          new THREE.Vector3(ox * 2.2, oy * 2.2, oz * 1.4),
        ]);
        return new THREE.TubeGeometry(curve, 8, R * 0.22, 8, false);
      }),
    [],
  );

  const arteriesGeometry = useMemo(
    () =>
      cachedGeometry('eye.retinalArteries', () =>
        buildVesselTreeGeometry({
          sphereCenter: new THREE.Vector3(0, 0, 0),
          sphereRadius: R * 0.95,
          originThetaPhi: [0.16, Math.PI],
          tubeRadius: R * 0.035,
          branches: [
            { deltaTheta: 0.92, deltaPhi: 0.55 },
            { deltaTheta: 0.86, deltaPhi: -0.45 },
            { deltaTheta: 0.7, deltaPhi: 1.35 },
            { deltaTheta: 0.74, deltaPhi: -1.3 },
          ],
        }),
      ),
    [],
  );

  const veinsGeometry = useMemo(
    () =>
      cachedGeometry('eye.retinalVeins', () =>
        buildVesselTreeGeometry({
          sphereCenter: new THREE.Vector3(0, 0, 0),
          sphereRadius: R * 0.95,
          originThetaPhi: [0.18, Math.PI],
          tubeRadius: R * 0.04,
          branches: [
            { deltaTheta: 0.88, deltaPhi: 0.15 },
            { deltaTheta: 0.82, deltaPhi: -0.85 },
            { deltaTheta: 0.64, deltaPhi: 1.75 },
            { deltaTheta: 0.7, deltaPhi: -1.65 },
          ],
        }),
      ),
    [],
  );

  return (
    <>
      <SelectableMesh nodeId={retinaBase} geometry={retinaGeometry} tissue="retina" />
      <SelectableMesh nodeId={`${retinaBase}.macula`} geometry={maculaGeometry} tissue="retina" position={MACULA_LOCAL} />
      <SelectableMesh
        nodeId={`${retinaBase}.opticDisc`}
        geometry={opticDiscGeometry}
        tissue="opticNerve"
        position={OPTIC_DISC_LOCAL}
      />
      <SelectableMesh nodeId={`${retinaBase}.retinalArteries`} geometry={arteriesGeometry} tissue="artery" />
      <SelectableMesh nodeId={`${retinaBase}.retinalVeins`} geometry={veinsGeometry} tissue="vein" />
      <SelectableMesh nodeId={`${eyeballBase}.opticNerve`} geometry={opticNerveGeometry} tissue="opticNerve" />
    </>
  );
}
