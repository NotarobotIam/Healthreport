import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry, sexedGeometry } from '../primitives/proceduralGeometry';
import { buildLoftGeometry, buildOrganicBlob } from '../primitives/anatomicalForms';
import { buildRibcageGeometry, buildSpineGeometry, mergeAll } from '../primitives/organForms';
import { BODY, type BodySex } from '../../constants/bodyLayout';
import { SEX_SCALE, trunkRings } from '../../constants/bodyProfile';
import { useViewStore } from '../../store/useViewStore';
import { physiologyEngine } from '../../engine/physiologyEngine';
import { respiratoryExpansion, respiratoryPhase } from '../../data/physiology/mockGenerator';
import { Heart } from './Heart';
import { Lungs } from './Lungs';

/**
 * Trunk segment boundaries. The chest, abdomen, and pelvis are three
 * separately-selectable nodes but ONE continuous surface: each samples the
 * shared trunk curve (constants/bodyProfile.ts) over its own Y range, so
 * adjoining segments share an identical boundary ring by construction. This
 * is what stopped the trunk reading as stacked cylinders — see
 * AbdomenPelvis.tsx for the lower two segments.
 */
export const CHEST_BOTTOM_Y = 1.03;
export const CHEST_TOP_Y = 1.45;

const RIB_TOP_Y = 1.375;
const RIB_BOTTOM_Y = 1.09;

/**
 * Geometry here is authored in ABSOLUTE world Y (not centered on the mesh's
 * own origin), which is safe for the breathing animation below only because
 * that animation scales X and Z alone — and the trunk is centered on
 * x=0,z=0, so scaling about the world origin is equivalent to scaling about
 * the chest's own axis. A Y scale here would need the geometry recentered
 * first (which is why Heart/Lungs, which DO scale on all axes, keep their
 * geometry centered on their own origin instead).
 */
function ChestShell({ sex }: { sex: BodySex }) {
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(
    () => sexedGeometry(sex, 'torso.shell', () => buildLoftGeometry(trunkRings(CHEST_BOTTOM_Y, CHEST_TOP_Y, sex, 20), 30)),
    [sex],
  );

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const { currentTime, frame } = physiologyEngine.getState();
    const breath = respiratoryExpansion(respiratoryPhase(currentTime, frame.respiratoryRate ?? 14));
    group.scale.set(1 + breath * 0.022, 1, 1 + breath * 0.03);
  });

  return (
    <group ref={groupRef}>
      <SelectableMesh nodeId="body.torso" geometry={geometry} tissue="skinScan" />
    </group>
  );
}

/**
 * Breast tissue, female only. Clinically relevant rather than cosmetic —
 * it is the structure a mammography or breast-ultrasound report attaches
 * to — so it is a real selectable node, not decoration on the chest shell.
 */
function Breasts({ sex }: { sex: BodySex }) {
  const geometry = useMemo(
    () =>
      sexedGeometry(sex, 'torso.breasts', () =>
        mergeAll(
          [1, -1].map((sign) => {
            const lobe = buildOrganicBlob({
              radius: 0.058,
              scale: [1, 0.95, 0.82],
              lumpiness: 0.04,
              phase: sign * 0.6,
              detail: 3,
            });
            lobe.translate(sign * 0.062, BODY.chestCenterY + 0.055, 0.076);
            return lobe;
          }),
        ),
      ),
    [sex],
  );
  return <SelectableMesh nodeId="body.torso.breasts" geometry={geometry} tissue="fat" />;
}

export function Torso() {
  const sex = useViewStore((s) => s.anatomySex);
  const ribScale = SEX_SCALE[sex].ribcage;

  const ribcageGeometry = useMemo(
    () =>
      sexedGeometry(sex, 'torso.ribcage', () =>
        buildRibcageGeometry({
          topY: RIB_TOP_Y,
          bottomY: RIB_BOTTOM_Y,
          maxHalfWidth: 0.134 * ribScale,
          maxHalfDepth: 0.092 * ribScale,
        }),
      ),
    [sex, ribScale],
  );

  const spineGeometry = useMemo(
    () => cachedGeometry('torso.spine', () => buildSpineGeometry(BODY.neckBaseY - 0.02, 0.88, -0.072)),
    [],
  );

  return (
    <group>
      <ChestShell sex={sex} />
      {sex === 'female' && <Breasts sex={sex} />}
      <SelectableMesh nodeId="body.torso.ribcage" geometry={ribcageGeometry} tissue="bone" />
      <SelectableMesh nodeId="body.torso.spine" geometry={spineGeometry} tissue="bone" />
      <Heart />
      <Lungs />
    </group>
  );
}
