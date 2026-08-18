import { useMemo } from 'react';
import * as THREE from 'three';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry } from '../primitives/proceduralGeometry';
import { EyeGlobe } from './EyeGlobe';
import { EyeRetina } from './EyeRetina';
import { EyeAdnexa } from './EyeAdnexa';
import { EYE, orbitPosition } from '../../constants/bodyLayout';
import type { Side } from '../../constants/bodyLayout';

function SimpleEye({ side }: { side: Side }) {
  const geometry = useMemo(() => cachedGeometry('eye.simple', () => new THREE.SphereGeometry(EYE.radius, 20, 16)), []);
  return (
    <group position={orbitPosition(side)}>
      <SelectableMesh nodeId={`body.head.orbit.${side}.eye.eyeball`} geometry={geometry} tissue="sclera" />
    </group>
  );
}

/**
 * Head -> Orbit -> Eye -> Eyeball, the second flagship demonstration. The
 * left eye gets the full cornea/sclera/iris/.../retina/optic nerve/muscles/
 * eyelids/lacrimal breakdown (EyeGlobe + EyeRetina + EyeAdnexa); the right
 * eye is a single placeholder sphere — see data/anatomy/eye.ts.
 */
export function Eye({ side }: { side: Side }) {
  if (side === 'right') {
    return <SimpleEye side={side} />;
  }

  return (
    <group position={orbitPosition(side)}>
      <EyeGlobe side={side} />
      <EyeRetina side={side} />
      <EyeAdnexa side={side} />
    </group>
  );
}
