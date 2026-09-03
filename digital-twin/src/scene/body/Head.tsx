import { useMemo } from 'react';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { sexedGeometry } from '../primitives/proceduralGeometry';
import { buildBrainGeometry } from '../primitives/organForms';
import { buildEarGeometry, buildHeadGeometry, EAR_POSITION_Y } from '../primitives/headForms';
import { BODY, SIDE_SIGN } from '../../constants/bodyLayout';
import { SEX_SCALE } from '../../constants/bodyProfile';
import { useViewStore } from '../../store/useViewStore';
import { Eye } from '../eye/Eye';

const CRANIUM_CENTER_Y = BODY.headCenterY + 0.045;
const BRAIN_RADIUS = BODY.headRadius * 0.6;

/**
 * The head is a sculpted skull-and-face form — cranial vault, brow ridge,
 * recessed orbits, nose, cheekbones, lips, chin, and jaw angle — rather
 * than the smooth lofted ovoid it used to be. See
 * primitives/headForms.ts for the landmark definitions; the brain inside is
 * a real gyrified cerebrum with cerebellum and brainstem.
 *
 * Ears are separate meshes rather than sculpted into the skull: they stand
 * clear of the head, so a surface displacement cannot produce them.
 */
export function Head() {
  const sex = useViewStore((s) => s.anatomySex);
  const scale = SEX_SCALE[sex].head;

  const headGeometry = useMemo(() => sexedGeometry(sex, 'head.shell', () => buildHeadGeometry(sex)), [sex]);
  const brainGeometry = useMemo(
    () => sexedGeometry(sex, 'head.brain', () => buildBrainGeometry(BRAIN_RADIUS * scale)),
    [sex, scale],
  );
  const earGeometry = useMemo(() => sexedGeometry(sex, 'head.ear', buildEarGeometry), [sex]);

  return (
    <group>
      <SelectableMesh nodeId="body.head" geometry={headGeometry} tissue="skinScan" />
      <SelectableMesh
        nodeId="body.head.brain"
        geometry={brainGeometry}
        tissue="brain"
        position={[0, CRANIUM_CENTER_Y, 0.004]}
      />
      {(['left', 'right'] as const).map((side) => (
        <SelectableMesh
          key={side}
          nodeId="body.head"
          geometry={earGeometry}
          tissue="skinScan"
          // Set slightly back from the head's mid-depth and angled out from
          // the skull, as real ears sit.
          position={[SIDE_SIGN[side] * 0.083 * scale, EAR_POSITION_Y, -0.012]}
          rotation={[0, 0, SIDE_SIGN[side] * 0.12]}
        />
      ))}
      <Eye side="left" />
      <Eye side="right" />
    </group>
  );
}
