import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry, buildPartialSphereGeometry } from '../primitives/proceduralGeometry';
import { EYE, SIDE_SIGN } from '../../constants/bodyLayout';
import type { Side } from '../../constants/bodyLayout';

const R = EYE.radius;

/** Four short capsules radiating from just behind the globe toward its equator — one merged geometry, one selectable node (per the spec's flat "extraocular muscles" listing). */
function buildExtraocularMusclesGeometry(): THREE.BufferGeometry {
  const len = R * 0.85;
  const radius = R * 0.09;
  const offset = R * 1.05;
  const zBack = -R * 0.15;

  const superior = new THREE.CapsuleGeometry(radius, len, 3, 8); // native orientation: along Y
  superior.translate(0, offset, zBack);

  const inferior = new THREE.CapsuleGeometry(radius, len, 3, 8);
  inferior.translate(0, -offset, zBack);

  const lateral = new THREE.CapsuleGeometry(radius, len, 3, 8);
  lateral.rotateZ(Math.PI / 2); // reorient from Y-aligned to X-aligned
  lateral.translate(offset, 0, zBack);

  const medial = new THREE.CapsuleGeometry(radius, len, 3, 8);
  medial.rotateZ(Math.PI / 2);
  medial.translate(-offset, 0, zBack);

  const parts = [superior, inferior, lateral, medial];
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return merged ?? new THREE.BufferGeometry();
}

/** Two small shell caps near the globe's native top/bottom poles (no rotation needed — see EyeGlobe.tsx's comment on the native-vs-Z-forward convention). Simplified as coverage domes rather than curved front-facing bands. */
function buildEyelidsGeometry(): THREE.BufferGeometry {
  const upper = buildPartialSphereGeometry(R * 1.06, { thetaStart: 0.05, thetaLength: 0.55, segments: 16 });
  const lower = buildPartialSphereGeometry(R * 1.06, { thetaStart: Math.PI - 0.6, thetaLength: 0.55, segments: 16 });
  const parts = [upper, lower];
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return merged ?? new THREE.BufferGeometry();
}

export function EyeAdnexa({ side }: { side: Side }) {
  const eyeBase = `body.head.orbit.${side}.eye`;

  const musclesGeometry = useMemo(() => cachedGeometry('eye.extraocularMuscles', buildExtraocularMusclesGeometry), []);
  const eyelidsGeometry = useMemo(() => cachedGeometry('eye.eyelids', buildEyelidsGeometry), []);
  const lacrimalGeometry = useMemo(
    () => cachedGeometry('eye.lacrimal', () => new THREE.SphereGeometry(R * 0.34, 10, 8)),
    [],
  );

  return (
    <>
      <SelectableMesh nodeId={`${eyeBase}.extraocularMuscles`} geometry={musclesGeometry} tissue="eyeMuscle" />
      <SelectableMesh nodeId={`${eyeBase}.eyelids`} geometry={eyelidsGeometry} tissue="eyelid" />
      <SelectableMesh
        nodeId={`${eyeBase}.lacrimalApparatus`}
        geometry={lacrimalGeometry}
        tissue="lacrimal"
        position={[SIDE_SIGN[side] * R * 1.3, R * 1.05, -R * 0.25]}
      />
    </>
  );
}
