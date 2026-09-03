import { useMemo } from 'react';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { sexedGeometry } from '../primitives/proceduralGeometry';
import { buildProfiledForm, buildTubeThrough } from '../primitives/anatomicalForms';
import { BODY } from '../../constants/bodyLayout';
import { NECK_PROFILE, SEX_SCALE, scaleProfile } from '../../constants/bodyProfile';
import { useViewStore } from '../../store/useViewStore';

/**
 * Neck as a tapered column that flares into the trapezius at its base,
 * rather than a bare cylinder, so the head/trunk join reads as continuous.
 * The trachea is rendered as part of the same node (one selectable
 * subassembly, several meshes — the same pattern the forearm uses for
 * radius + ulna).
 */
export function Neck() {
  const sex = useViewStore((s) => s.anatomySex);
  const scale = SEX_SCALE[sex].neck;

  const shellGeometry = useMemo(
    () =>
      sexedGeometry(sex, 'neck.shell', () =>
        buildProfiledForm({
          topY: BODY.neckTopY + 0.01,
          bottomY: BODY.neckBaseY - 0.03,
          profile: scaleProfile(NECK_PROFILE, scale),
          radialSegments: 22,
          slices: 12,
        }),
      ),
    [sex, scale],
  );

  const tracheaGeometry = useMemo(
    () =>
      sexedGeometry(sex, 'neck.trachea', () =>
        buildTubeThrough(
          [
            [0, BODY.neckTopY, 0.022],
            [0, BODY.neckBaseY, 0.02],
            [0, BODY.neckBaseY - 0.06, 0.014],
          ],
          0.012 * scale,
          { radialSegments: 10 },
        ),
      ),
    [sex, scale],
  );

  return (
    <group>
      <SelectableMesh nodeId="body.neck" geometry={shellGeometry} tissue="skinScan" />
      <SelectableMesh nodeId="body.neck" geometry={tracheaGeometry} tissue="cartilage" />
    </group>
  );
}
