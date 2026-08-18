import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry } from '../primitives/proceduralGeometry';
import { BODY } from '../../constants/bodyLayout';
import { physiologyEngine } from '../../engine/physiologyEngine';
import { respiratoryExpansion, respiratoryPhase } from '../../data/physiology/mockGenerator';
import type { Side } from '../../constants/bodyLayout';

function LungSide({ side }: { side: Side }) {
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(() => cachedGeometry('torso.lung', () => new THREE.SphereGeometry(0.075, 16, 16)), []);
  const sign = side === 'left' ? 1 : -1;

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const { currentTime, frame } = physiologyEngine.getState();
    const breath = respiratoryExpansion(respiratoryPhase(currentTime, frame.respiratoryRate ?? 14));
    group.scale.set(0.85 * (1 + breath * 0.08), 1 + breath * 0.04, 0.7 * (1 + breath * 0.08));
  });

  return (
    <group ref={groupRef} position={[sign * 0.085, BODY.chestCenterY + 0.03, -0.02]}>
      <SelectableMesh nodeId={`body.torso.lungs.${side}`} geometry={geometry} tissue="lungs" />
    </group>
  );
}

export function Lungs() {
  return (
    <>
      <LungSide side="left" />
      <LungSide side="right" />
    </>
  );
}
