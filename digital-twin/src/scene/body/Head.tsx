import { useMemo } from 'react';
import * as THREE from 'three';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry } from '../primitives/proceduralGeometry';
import { BODY } from '../../constants/bodyLayout';
import { Eye } from '../eye/Eye';

export function Head() {
  const headGeometry = useMemo(
    () => cachedGeometry('head.shell', () => new THREE.SphereGeometry(BODY.headRadius, 32, 24)),
    [],
  );
  const brainGeometry = useMemo(
    () => cachedGeometry('head.brain', () => new THREE.SphereGeometry(BODY.headRadius * 0.62, 20, 16)),
    [],
  );

  return (
    <group>
      <SelectableMesh nodeId="body.head" geometry={headGeometry} tissue="skinScan" position={[0, BODY.headCenterY, 0]} />
      <SelectableMesh
        nodeId="body.head.brain"
        geometry={brainGeometry}
        tissue="brain"
        position={[0, BODY.headCenterY + 0.01, -0.01]}
      />
      <Eye side="left" />
      <Eye side="right" />
    </group>
  );
}
