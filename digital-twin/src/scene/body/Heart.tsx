import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { sexedGeometry } from '../primitives/proceduralGeometry';
import { buildHeartGeometry } from '../primitives/organForms';
import { BODY } from '../../constants/bodyLayout';
import { SEX_SCALE } from '../../constants/bodyProfile';
import { useViewStore } from '../../store/useViewStore';
import { physiologyEngine } from '../../engine/physiologyEngine';
import { cardiacContraction, cardiacPhase } from '../../data/physiology/mockGenerator';

const HEART_SCALE = 0.055;

/**
 * The primary "proves the 4D architecture works" demonstration: scales with
 * the mocked cardiac cycle every frame, reading `physiologyEngine.getState()`
 * directly inside useFrame — no React state, no re-renders. Scale (rather
 * than also touching emissive/material here) is deliberate: SelectableMesh
 * owns that mesh's material and mutates its emissive/opacity for
 * hover/select/transparency every render — layering a second, competing
 * per-frame writer onto the same material would just make the two fight.
 *
 * Geometry stays centered on this group's own origin (unlike the trunk,
 * which is authored in world Y) precisely because this animation scales all
 * three axes — see the note in Torso.tsx.
 */
export function Heart() {
  const groupRef = useRef<THREE.Group>(null);
  const sex = useViewStore((s) => s.anatomySex);
  const organScale = SEX_SCALE[sex].organ;
  const geometry = useMemo(
    () => sexedGeometry(sex, 'torso.heart', () => buildHeartGeometry(HEART_SCALE * organScale)),
    [sex, organScale],
  );

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const { currentTime, frame } = physiologyEngine.getState();
    const contraction = cardiacContraction(cardiacPhase(currentTime, frame.heartRate ?? 72));
    const scale = 1 - contraction * 0.12;
    group.scale.setScalar(scale);
  });

  return (
    // Sat slightly left of midline and rotated so the apex points down,
    // forward, and to the patient's left, the way a real heart lies.
    <group ref={groupRef} position={[0.022, BODY.chestCenterY + 0.015, 0.028]} rotation={[0.16, 0, -0.34]}>
      <SelectableMesh nodeId="body.torso.heart" geometry={geometry} tissue="heart" />
    </group>
  );
}
