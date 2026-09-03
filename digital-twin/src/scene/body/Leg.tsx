import { useMemo } from 'react';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry, sexedGeometry } from '../primitives/proceduralGeometry';
import { buildGroundedForwardForm, buildOrganicBlob, buildProfiledForm } from '../primitives/anatomicalForms';
import { buildLongBoneGeometry, mergeAll } from '../primitives/organForms';
import type { Side } from '../../constants/bodyLayout';
import { BODY, LEG, SIDE_SIGN, hipPosition } from '../../constants/bodyLayout';
import { SEX_SCALE, SHIN_PROFILE, THIGH_PROFILE, scaleProfile } from '../../constants/bodyProfile';
import { useViewStore } from '../../store/useViewStore';

// Local space: y=0 at the hip joint, running downward.
const KNEE_Y = -LEG.thighLength;
const ANKLE_Y = KNEE_Y - LEG.shinLength;

/**
 * The sole is placed on the ground plane rather than at an arbitrary offset
 * below the ankle, so the figure stands on the grid instead of hovering
 * above it. Everything in the foot is measured up from here.
 */
const SOLE_Y = BODY.groundY - BODY.hipY;

/** Z of the toe line — where the ball of the foot ends and the toes begin. */
const TOE_LINE_Z = 0.132;

/**
 * Toes, medial (big toe) to lateral. Each is its own anatomy node, so the
 * order here has to match the anatomy data's toe order. Local -X is medial
 * on BOTH legs because the whole limb is mirrored by the group's scale-x —
 * see the Leg component at the bottom of this file.
 */
const TOES: Array<{ key: string; x: number; length: number; width: number }> = [
  { key: 'bigToe', x: -0.026, length: 0.043, width: 0.023 },
  { key: 'secondToe', x: -0.008, length: 0.041, width: 0.018 },
  { key: 'thirdToe', x: 0.006, length: 0.037, width: 0.017 },
  { key: 'fourthToe', x: 0.019, length: 0.031, width: 0.016 },
  { key: 'littleToe', x: 0.031, length: 0.024, width: 0.015 },
];

/**
 * Legs use the same layered construction as the arms — translucent skin
 * over muscle over bone, all three sharing the segment's nodeId — and the
 * same single-source mirroring, so left and right are exact reflections.
 * See scene/body/Arm.tsx for the full rationale.
 */
function LegSide({ side }: { side: Side }) {
  const sex = useViewStore((s) => s.anatomySex);
  const thighScale = SEX_SCALE[sex].thigh;
  const shinScale = SEX_SCALE[sex].shin;
  const muscleScale = SEX_SCALE[sex].muscle;
  const footScale = SEX_SCALE[sex].foot;
  const base = `body.lowerExtremity.${side}`;

  const thighSkin = useMemo(
    () =>
      sexedGeometry(sex, 'leg.thigh.skin', () =>
        buildProfiledForm({
          topY: 0.02,
          bottomY: KNEE_Y,
          profile: scaleProfile(THIGH_PROFILE, thighScale),
          radialSegments: 22,
          slices: 20,
        }),
      ),
    [sex, thighScale],
  );
  const femur = useMemo(
    () => sexedGeometry(sex, 'leg.femur', () => buildLongBoneGeometry(-0.01, KNEE_Y + 0.012, 0.019 * thighScale)),
    [sex, thighScale],
  );
  const quadriceps = useMemo(
    () =>
      sexedGeometry(sex, 'leg.quadriceps', () =>
        buildOrganicBlob({ radius: 0.038 * thighScale, scale: [0.95, 2.9, 0.72], lumpiness: 0.06, phase: 0.9, detail: 3 }),
      ),
    [sex, thighScale],
  );
  const hamstring = useMemo(
    () =>
      sexedGeometry(sex, 'leg.hamstring', () =>
        buildOrganicBlob({ radius: 0.033 * thighScale, scale: [0.95, 2.8, 0.66], lumpiness: 0.06, phase: 2.4, detail: 3 }),
      ),
    [sex, thighScale],
  );

  const shinSkin = useMemo(
    () =>
      sexedGeometry(sex, 'leg.shin.skin', () =>
        buildProfiledForm({
          topY: KNEE_Y,
          bottomY: ANKLE_Y,
          profile: scaleProfile(SHIN_PROFILE, shinScale),
          radialSegments: 22,
          slices: 20,
        }),
      ),
    [sex, shinScale],
  );
  const tibiaFibula = useMemo(
    () =>
      sexedGeometry(sex, 'leg.tibiaFibula', () =>
        mergeAll([
          buildLongBoneGeometry(KNEE_Y - 0.006, ANKLE_Y + 0.01, 0.013 * shinScale, { offsetX: 0.005, offsetZ: 0.004 }),
          buildLongBoneGeometry(KNEE_Y - 0.012, ANKLE_Y + 0.012, 0.007 * shinScale, { offsetX: -0.017, offsetZ: -0.004 }),
        ]),
      ),
    [sex, shinScale],
  );
  const calf = useMemo(
    () =>
      sexedGeometry(sex, 'leg.calf', () =>
        buildOrganicBlob({ radius: 0.032 * muscleScale, scale: [1.05, 1.9, 0.8], lumpiness: 0.07, phase: 1.5, detail: 3 }),
      ),
    [sex, muscleScale],
  );

  const kneeGeometry = useMemo(
    () => sexedGeometry(sex, 'leg.knee', () => buildOrganicBlob({ radius: 0.037 * thighScale, scale: [1, 0.95, 1], lumpiness: 0.05, detail: 3 })),
    [sex, thighScale],
  );
  const ankleGeometry = useMemo(
    () => sexedGeometry(sex, 'leg.ankle', () => buildOrganicBlob({ radius: 0.024 * shinScale, scale: [1.1, 0.9, 0.95], lumpiness: 0.05, detail: 2 })),
    [sex, shinScale],
  );

  /**
   * Foot: heel, ankle column, instep, and the ball of the foot — built
   * FORWARD along +Z with a flat sole on the ground, not as a vertical loft
   * with the rings nudged forward. The station heights are what make the
   * ankle column rise to meet the shin while the forefoot stays low.
   */
  const footGeometry = useMemo(
    () =>
      cachedGeometry('leg.foot', () =>
        buildGroundedForwardForm(
          [
            { z: -0.058, width: 0.042, height: 0.072 }, // back of the heel
            { z: -0.032, width: 0.058, height: 0.108 },
            { z: 0.0, width: 0.066, height: 0.144 }, // ankle column, rising to the shin
            { z: 0.042, width: 0.064, height: 0.086 }, // instep
            { z: 0.086, width: 0.072, height: 0.058 },
            { z: 0.118, width: 0.079, height: 0.048 }, // ball of the foot — widest
            { z: TOE_LINE_Z, width: 0.075, height: 0.041 },
          ],
          24,
        ),
      ),
    [],
  );

  /** One toe: a short forward form that tapers and rounds off at the tip. */
  const toeGeometry = (key: string, length: number, width: number) =>
    cachedGeometry(`leg.toe.${key}`, () =>
      buildGroundedForwardForm(
        [
          { z: -0.006, width: width * 0.94, height: width * 0.92 },
          { z: length * 0.42, width, height: width * 0.95 },
          { z: length * 0.8, width: width * 0.9, height: width * 0.86 },
          { z: length, width: width * 0.5, height: width * 0.48 },
        ],
        12,
      ),
    );

  return (
    <group>
      <SelectableMesh nodeId={`${base}.thigh`} geometry={thighSkin} tissue="skinScan" />
      <SelectableMesh nodeId={`${base}.thigh`} geometry={femur} tissue="bone" />
      <SelectableMesh nodeId={`${base}.thigh`} geometry={quadriceps} tissue="muscle" position={[0, KNEE_Y * 0.46, 0.026]} />
      <SelectableMesh nodeId={`${base}.thigh`} geometry={hamstring} tissue="muscle" position={[0, KNEE_Y * 0.48, -0.03]} />

      <SelectableMesh nodeId={`${base}.knee`} geometry={kneeGeometry} tissue="joint" position={[0, KNEE_Y, 0.006]} />

      <SelectableMesh nodeId={`${base}.shin`} geometry={shinSkin} tissue="skinScan" />
      <SelectableMesh nodeId={`${base}.shin`} geometry={tibiaFibula} tissue="bone" />
      <SelectableMesh nodeId={`${base}.shin`} geometry={calf} tissue="muscle" position={[0, KNEE_Y - 0.075, -0.026]} />

      <SelectableMesh nodeId={`${base}.ankle`} geometry={ankleGeometry} tissue="joint" position={[0, ANKLE_Y, 0]} />

      {/*
        Foot and toes scale in WIDTH and LENGTH only. A uniform scale would
        also shrink the foot vertically and lift the sole off the ground —
        limb lengths are identical between the two anatomies (the skeleton
        is fixed), so the sole has to stay exactly on the ground plane.
      */}
      <group scale={[footScale, 1, footScale]}>
        <SelectableMesh nodeId={`${base}.foot`} geometry={footGeometry} tissue="skinScan" position={[0, SOLE_Y, 0]} />

        {TOES.map((toe) => (
          <SelectableMesh
            key={toe.key}
            nodeId={`${base}.foot.${toe.key}`}
            geometry={toeGeometry(toe.key, toe.length, toe.width)}
            tissue="skinScan"
            // Every toe starts ON the toe line and grows forward from it, so
            // none can drift off the front of the foot. The row curves back
            // slightly toward the little toe, as a real toe line does.
            position={[toe.x, SOLE_Y, TOE_LINE_Z - Math.abs(toe.x) * 0.16]}
          />
        ))}
      </group>
    </group>
  );
}

export function Leg({ side }: { side: Side }) {
  const [hx, hy, hz] = hipPosition(side);
  return (
    <group position={[hx, hy, hz]} scale={[SIDE_SIGN[side], 1, 1]}>
      <LegSide side={side} />
    </group>
  );
}

/** Gluteal mass bridging the pelvis into both thighs — rendered once, not per-leg. */
export function Glutes() {
  const sex = useViewStore((s) => s.anatomySex);
  // Fuller and set slightly wider on the female figure, matching its wider
  // pelvis rather than following the general muscle-scale factor.
  const spread = sex === 'female' ? 1.09 : 1;
  const bulk = sex === 'female' ? 1.05 : 1;
  const geometry = useMemo(
    () =>
      sexedGeometry(sex, 'leg.glutes', () =>
        mergeAll(
          [1, -1].map((sign) => {
            const lobe = buildOrganicBlob({ radius: 0.062 * bulk, scale: [0.95, 0.85, 0.78], lumpiness: 0.07, phase: sign * 1.2, detail: 3 });
            lobe.translate(sign * 0.055 * spread, 0.855, -0.052);
            return lobe;
          }),
        ),
      ),
    [sex, spread, bulk],
  );
  return <SelectableMesh nodeId="body.pelvis" geometry={geometry} tissue="muscle" />;
}
