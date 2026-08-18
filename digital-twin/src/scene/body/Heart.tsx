import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry } from '../primitives/proceduralGeometry';
import { BODY } from '../../constants/bodyLayout';
import { physiologyEngine } from '../../engine/physiologyEngine';
import { cardiacContraction, cardiacPhase } from '../../data/physiology/mockGenerator';

/**
 * The primary "proves the 4D architecture works" demonstration: scales with
 * the mocked cardiac cycle every frame, reading `physiologyEngine.getState()`
 * directly inside useFrame — no React state, no re-renders. Scale (rather
 * than also touching emissive/material here) is deliberate: SelectableMesh
 * owns that mesh's material and mutates its emissive/opacity for
 * hover/select/transparency every render — layering a second, competing
 * per-frame writer onto the same material would just make the two fight.
 */
export function Heart() {
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(() => cachedGeometry('torso.heart', () => new THREE.SphereGeometry(0.062, 20, 16)), []);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const { currentTime, frame } = physiologyEngine.getState();
    const contraction = cardiacContraction(cardiacPhase(currentTime, frame.heartRate ?? 72));
    const scale = 1 - contraction * 0.12;
    group.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef} position={[0.025, BODY.chestCenterY + 0.02, 0.035]}>
      <SelectableMesh nodeId="body.torso.heart" geometry={geometry} tissue="heart" />
    </group>
  );
}
