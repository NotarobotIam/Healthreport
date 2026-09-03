import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { sexedGeometry } from '../primitives/proceduralGeometry';
import { buildLungGeometry } from '../primitives/organForms';
import { BODY, SIDE_SIGN } from '../../constants/bodyLayout';
import { SEX_SCALE } from '../../constants/bodyProfile';
import { useViewStore } from '../../store/useViewStore';
import { physiologyEngine } from '../../engine/physiologyEngine';
import { respiratoryExpansion, respiratoryPhase } from '../../data/physiology/mockGenerator';
import type { Side } from '../../constants/bodyLayout';

const LUNG_HEIGHT = 0.235;

function LungSide({ side }: { side: Side }) {
  const groupRef = useRef<THREE.Group>(null);
  const sign = SIDE_SIGN[side];
  const sex = useViewStore((s) => s.anatomySex);
  const organScale = SEX_SCALE[sex].organ;
  // Only the LEFT lung gets the cardiac notch — the heart displaces it on
  // that side, which is also why the left lung is the smaller of the two.
  const geometry = useMemo(
    () => sexedGeometry(sex, `torso.lung.${side}`, () => buildLungGeometry(LUNG_HEIGHT * organScale, sign, side === 'left')),
    [sex, side, sign, organScale],
  );

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const { currentTime, frame } = physiologyEngine.getState();
    const breath = respiratoryExpansion(respiratoryPhase(currentTime, frame.respiratoryRate ?? 14));
    group.scale.set(1 + breath * 0.07, 1 + breath * 0.05, 1 + breath * 0.09);
  });

  return (
    <group ref={groupRef} position={[sign * 0.062 * organScale, BODY.chestCenterY + 0.045, -0.012]}>
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
