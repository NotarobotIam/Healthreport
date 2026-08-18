import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry } from '../primitives/proceduralGeometry';
import { BODY } from '../../constants/bodyLayout';
import { physiologyEngine } from '../../engine/physiologyEngine';
import { respiratoryExpansion, respiratoryPhase } from '../../data/physiology/mockGenerator';
import { Heart } from './Heart';
import { Lungs } from './Lungs';

const TORSO_BOTTOM_Y = BODY.hipY - 0.04;
const TORSO_CENTER_Y = (TORSO_BOTTOM_Y + BODY.shoulderY) / 2;
const TORSO_HEIGHT = BODY.shoulderY - TORSO_BOTTOM_Y;

/** Five stacked ring "hoops" merged into one geometry — a simplified, non-anatomically-literal ribcage silhouette. */
function buildRibcageGeometry(): THREE.BufferGeometry {
  const rings: THREE.BufferGeometry[] = [];
  const ringCount = 5;
  for (let i = 0; i < ringCount; i++) {
    const t = i / (ringCount - 1);
    const y = THREE.MathUtils.lerp(0.16, -0.12, t);
    const radius = 0.15 - Math.abs(t - 0.35) * 0.05;
    const ring = new THREE.TorusGeometry(radius, 0.007, 6, 24);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, y, 0);
    rings.push(ring);
  }
  const merged = mergeGeometries(rings, false);
  for (const ring of rings) ring.dispose();
  return merged ?? new THREE.BufferGeometry();
}

function TorsoShell() {
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(
    () => cachedGeometry('torso.shell', () => new THREE.CylinderGeometry(0.185, 0.16, TORSO_HEIGHT, 24)),
    [],
  );

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const { currentTime, frame } = physiologyEngine.getState();
    const breath = respiratoryExpansion(respiratoryPhase(currentTime, frame.respiratoryRate ?? 14));
    group.scale.set(1 + breath * 0.025, 1, 1 + breath * 0.025);
  });

  return (
    <group ref={groupRef} position={[0, TORSO_CENTER_Y, 0]}>
      <SelectableMesh nodeId="body.torso" geometry={geometry} tissue="skinScan" />
    </group>
  );
}

export function Torso() {
  const ribcageGeometry = useMemo(() => cachedGeometry('torso.ribcage', buildRibcageGeometry), []);
  const spineGeometry = useMemo(
    () => cachedGeometry('torso.spine', () => new THREE.CapsuleGeometry(0.022, 0.46, 4, 8)),
    [],
  );

  return (
    <group>
      <TorsoShell />
      <SelectableMesh nodeId="body.torso.ribcage" geometry={ribcageGeometry} tissue="bone" position={[0, TORSO_CENTER_Y + 0.02, 0]} />
      <SelectableMesh nodeId="body.torso.spine" geometry={spineGeometry} tissue="bone" position={[0, TORSO_CENTER_Y, -0.135]} />
      <Heart />
      <Lungs />
    </group>
  );
}
