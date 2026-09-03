import { useMemo } from 'react';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { sexedGeometry } from '../primitives/proceduralGeometry';
import { buildOrganicBlob, buildProfiledForm } from '../primitives/anatomicalForms';
import { buildLongBoneGeometry, mergeAll } from '../primitives/organForms';
import { Hand } from './Hand';
import type { Side } from '../../constants/bodyLayout';
import { ARM, SIDE_SIGN, shoulderPosition, type BodySex } from '../../constants/bodyLayout';
import { FOREARM_PROFILE, SEX_SCALE, UPPER_ARM_PROFILE, scaleProfile } from '../../constants/bodyProfile';
import { useViewStore } from '../../store/useViewStore';

const elbowY = -ARM.upperArmLength;
const forearmStartY = -(ARM.upperArmLength + ARM.elbowGap);
const wristY = -(ARM.upperArmLength + ARM.elbowGap + ARM.forearmLength);

/**
 * Both arms are built from the SAME geometry and profile data, mirrored by
 * a single `scale-x: SIDE_SIGN[side]` on the outer group — so a left/right
 * asymmetry is not expressible here even by accident. (The previous build
 * had two independently hand-positioned arm implementations, which is
 * exactly how a body ends up with one detailed hand and one stump.)
 *
 * Each segment is rendered as three layers sharing one nodeId — translucent
 * skin over muscle over bone — the same "one selectable subassembly,
 * several meshes" pattern the forearm already used for radius + ulna. A
 * bare bone cylinder with no soft tissue over it was the main reason the
 * limbs read as robotic.
 */
function useArmSkeleton(sex: BodySex, boneScale: number) {
  const humerus = useMemo(
    () => sexedGeometry(sex, 'arm.humerus', () => buildLongBoneGeometry(-0.012, elbowY + 0.008, 0.0135 * boneScale)),
    [sex, boneScale],
  );
  const radiusUlna = useMemo(
    () =>
      sexedGeometry(sex, 'arm.radiusUlna', () =>
        mergeAll([
          buildLongBoneGeometry(forearmStartY - 0.004, wristY + 0.006, 0.0092 * boneScale, { offsetX: 0.008, offsetZ: 0.005 }),
          buildLongBoneGeometry(forearmStartY - 0.004, wristY + 0.006, 0.0085 * boneScale, { offsetX: -0.008, offsetZ: -0.005 }),
        ]),
      ),
    [sex, boneScale],
  );
  return { humerus, radiusUlna };
}

function ArmSide({ side }: { side: Side }) {
  const sex = useViewStore((s) => s.anatomySex);
  const upperScale = SEX_SCALE[sex].upperArm;
  const foreScale = SEX_SCALE[sex].forearm;
  const muscleScale = SEX_SCALE[sex].muscle;
  const { humerus, radiusUlna } = useArmSkeleton(sex, upperScale);
  const base = `body.upperExtremity.${side}`;

  const upperArmSkin = useMemo(
    () =>
      sexedGeometry(sex, 'arm.upperArm.skin', () =>
        buildProfiledForm({
          topY: 0.012,
          bottomY: elbowY,
          profile: scaleProfile(UPPER_ARM_PROFILE, upperScale),
          radialSegments: 20,
          slices: 18,
        }),
      ),
    [sex, upperScale],
  );
  const forearmSkin = useMemo(
    () =>
      sexedGeometry(sex, 'arm.forearm.skin', () =>
        buildProfiledForm({
          topY: forearmStartY,
          bottomY: wristY,
          profile: scaleProfile(FOREARM_PROFILE, foreScale),
          radialSegments: 20,
          slices: 18,
        }),
      ),
    [sex, foreScale],
  );
  const shoulderGeometry = useMemo(
    () =>
      sexedGeometry(sex, 'arm.deltoid', () =>
        buildOrganicBlob({ radius: 0.056 * upperScale, scale: [0.95, 1.05, 0.92], lumpiness: 0.05, detail: 3 }),
      ),
    [sex, upperScale],
  );
  const bicepsGeometry = useMemo(
    () =>
      sexedGeometry(sex, 'arm.biceps', () =>
        buildOrganicBlob({ radius: 0.024 * muscleScale, scale: [0.85, 2.4, 0.85], lumpiness: 0.06, phase: 0.5, detail: 3 }),
      ),
    [sex, muscleScale],
  );
  const tricepsGeometry = useMemo(
    () =>
      sexedGeometry(sex, 'arm.triceps', () =>
        buildOrganicBlob({ radius: 0.023 * muscleScale, scale: [0.85, 2.6, 0.8], lumpiness: 0.06, phase: 1.9, detail: 3 }),
      ),
    [sex, muscleScale],
  );
  const elbowGeometry = useMemo(
    () => sexedGeometry(sex, 'arm.elbow', () => buildOrganicBlob({ radius: 0.026 * upperScale, scale: [1, 0.9, 1], lumpiness: 0.05, detail: 2 })),
    [sex, upperScale],
  );
  const wristGeometry = useMemo(
    () => sexedGeometry(sex, 'arm.wrist', () => buildOrganicBlob({ radius: 0.019 * foreScale, scale: [1.15, 0.8, 0.8], lumpiness: 0.04, detail: 2 })),
    [sex, foreScale],
  );

  return (
    <group>
      <SelectableMesh nodeId={`${base}.shoulder`} geometry={shoulderGeometry} tissue="muscle" position={[0, -0.004, 0]} />

      <SelectableMesh nodeId={`${base}.upperArm`} geometry={upperArmSkin} tissue="skinScan" />
      <SelectableMesh nodeId={`${base}.upperArm`} geometry={humerus} tissue="bone" />
      <SelectableMesh nodeId={`${base}.biceps`} geometry={bicepsGeometry} tissue="muscle" position={[0, elbowY * 0.45, 0.018]} />
      <SelectableMesh nodeId={`${base}.triceps`} geometry={tricepsGeometry} tissue="muscle" position={[0, elbowY * 0.45, -0.019]} />

      <SelectableMesh nodeId={`${base}.elbow`} geometry={elbowGeometry} tissue="joint" position={[0, elbowY, 0]} />

      <SelectableMesh nodeId={`${base}.forearm`} geometry={forearmSkin} tissue="skinScan" />
      <SelectableMesh nodeId={`${base}.forearm`} geometry={radiusUlna} tissue="bone" />

      <SelectableMesh nodeId={`${base}.wrist`} geometry={wristGeometry} tissue="joint" position={[0, wristY, 0]} />

      {/*
        The hand scales as a unit about the WRIST rather than each of its
        geometries scaling independently — that keeps the palm, metacarpals,
        and all five fingers in proportion with each other and keeps the
        hand attached to the forearm, which per-geometry scaling would not.
      */}
      <group position={[0, wristY, 0]} scale={SEX_SCALE[sex].hand}>
        <group position={[0, -wristY, 0]}>
          <Hand side={side} />
        </group>
      </group>
    </group>
  );
}

export function Arm({ side }: { side: Side }) {
  const [sx, sy, sz] = shoulderPosition(side);
  return (
    <group
      position={[sx, sy, sz]}
      rotation={[0, 0, SIDE_SIGN[side] * ARM.tiltRad]}
      // Mirroring the whole limb (rather than mirroring coordinates inside
      // it) is what guarantees the two arms are exact reflections. Negative
      // scale flips triangle winding, which is why every tissue material is
      // double-sided — see scene/primitives/materials.ts.
      scale={[SIDE_SIGN[side], 1, 1]}
    >
      <ArmSide side={side} />
    </group>
  );
}
