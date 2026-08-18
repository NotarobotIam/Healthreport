import { useMemo } from 'react';
import * as THREE from 'three';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry } from '../primitives/proceduralGeometry';
import { BODY, hipPosition } from '../../constants/bodyLayout';

const ABDOMEN_CENTER_Y = (BODY.waistY + BODY.hipY) / 2 + 0.03;

export function AbdomenPelvis() {
  const abdomenGeometry = useMemo(
    () => cachedGeometry('abdomen.shell', () => new THREE.CylinderGeometry(0.165, 0.175, BODY.waistY - BODY.hipY + 0.1, 20)),
    [],
  );
  const pelvisGeometry = useMemo(() => cachedGeometry('pelvis.shell', () => new THREE.SphereGeometry(0.19, 20, 14)), []);
  const organGeometry = useMemo(() => cachedGeometry('abdomen.organ', () => new THREE.SphereGeometry(0.05, 14, 12)), []);
  const kidneyGeometry = useMemo(
    () => cachedGeometry('abdomen.kidney', () => new THREE.CapsuleGeometry(0.018, 0.045, 3, 8)),
    [],
  );
  const hipGeometry = useMemo(() => cachedGeometry('pelvis.hip', () => new THREE.SphereGeometry(0.045, 14, 12)), []);

  return (
    <group>
      <SelectableMesh nodeId="body.abdomen" geometry={abdomenGeometry} tissue="skinScan" position={[0, ABDOMEN_CENTER_Y, 0]} />
      <SelectableMesh
        nodeId="body.pelvis"
        geometry={pelvisGeometry}
        tissue="skinScan"
        position={[0, BODY.hipY - 0.06, 0]}
        scale={[1, 0.6, 0.85]}
      />
      <SelectableMesh
        nodeId="body.abdomen.liver"
        geometry={organGeometry}
        tissue="organGeneric"
        position={[-0.07, 0.99, 0.04]}
        scale={[1.3, 0.9, 0.9]}
      />
      <SelectableMesh
        nodeId="body.abdomen.stomach"
        geometry={organGeometry}
        tissue="organGeneric"
        position={[0.06, 0.98, 0.03]}
        scale={[1, 1.1, 0.9]}
      />
      <SelectableMesh
        nodeId="body.abdomen.intestines"
        geometry={organGeometry}
        tissue="organGeneric"
        position={[0, 0.89, 0.03]}
        scale={[1.4, 1, 1]}
      />
      <SelectableMesh
        nodeId="body.abdomen.kidneys.left"
        geometry={kidneyGeometry}
        tissue="organGeneric"
        position={[0.07, 0.95, -0.06]}
      />
      <SelectableMesh
        nodeId="body.abdomen.kidneys.right"
        geometry={kidneyGeometry}
        tissue="organGeneric"
        position={[-0.07, 0.95, -0.06]}
      />
      <SelectableMesh nodeId="body.pelvis.hip.left" geometry={hipGeometry} tissue="bone" position={hipPosition('left')} />
      <SelectableMesh nodeId="body.pelvis.hip.right" geometry={hipGeometry} tissue="bone" position={hipPosition('right')} />
    </group>
  );
}
