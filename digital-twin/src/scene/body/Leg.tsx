import { useMemo } from 'react';
import * as THREE from 'three';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry } from '../primitives/proceduralGeometry';
import type { Side } from '../../constants/bodyLayout';
import { LEG, hipPosition } from '../../constants/bodyLayout';

const TOES: string[] = ['bigToe', 'secondToe', 'thirdToe', 'fourthToe', 'littleToe'];

/** Generic leg + foot + individually-selectable (but single-segment) toes — see lowerExtremity.ts for the flagship/generic rationale. */
export function Leg({ side }: { side: Side }) {
  const thighGeometry = useMemo(
    () => cachedGeometry('leg.thigh', () => new THREE.CylinderGeometry(0.048, 0.038, LEG.thighLength * 0.94, 14)),
    [],
  );
  const kneeGeometry = useMemo(() => cachedGeometry('leg.knee', () => new THREE.SphereGeometry(0.036, 14, 10)), []);
  const shinGeometry = useMemo(
    () => cachedGeometry('leg.shin', () => new THREE.CylinderGeometry(0.03, 0.022, LEG.shinLength * 0.94, 14)),
    [],
  );
  const ankleGeometry = useMemo(() => cachedGeometry('leg.ankle', () => new THREE.SphereGeometry(0.024, 12, 10)), []);
  const footGeometry = useMemo(
    () => cachedGeometry('leg.foot', () => new THREE.BoxGeometry(0.09, 0.05, LEG.footLength * 0.62)),
    [],
  );
  const toeGeometry = useMemo(() => cachedGeometry('leg.toe', () => new THREE.CapsuleGeometry(0.011, 0.02, 3, 6)), []);

  const [hx, hy, hz] = hipPosition(side);
  const thighCenterY = hy - LEG.thighLength / 2;
  const kneeY = hy - LEG.thighLength;
  const shinCenterY = kneeY - LEG.shinLength / 2;
  const ankleY = kneeY - LEG.shinLength;
  const footForwardZ = LEG.footLength * 0.34;
  const footY = ankleY - 0.02;

  return (
    <group>
      <SelectableMesh nodeId={`body.lowerExtremity.${side}.thigh`} geometry={thighGeometry} tissue="muscle" position={[hx, thighCenterY, hz]} />
      <SelectableMesh nodeId={`body.lowerExtremity.${side}.knee`} geometry={kneeGeometry} tissue="joint" position={[hx, kneeY, hz]} />
      <SelectableMesh nodeId={`body.lowerExtremity.${side}.shin`} geometry={shinGeometry} tissue="bone" position={[hx, shinCenterY, hz]} />
      <SelectableMesh nodeId={`body.lowerExtremity.${side}.ankle`} geometry={ankleGeometry} tissue="joint" position={[hx, ankleY, hz]} />
      <SelectableMesh
        nodeId={`body.lowerExtremity.${side}.foot`}
        geometry={footGeometry}
        tissue="bone"
        position={[hx, footY, hz + footForwardZ]}
      />
      {TOES.map((toeKey, i) => {
        const spread = (i - 2) * 0.018;
        return (
          <SelectableMesh
            key={toeKey}
            nodeId={`body.lowerExtremity.${side}.foot.${toeKey}`}
            geometry={toeGeometry}
            tissue="bone"
            position={[hx + spread, footY + 0.006, hz + footForwardZ + LEG.footLength * 0.42]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        );
      })}
    </group>
  );
}
