import { useMemo } from 'react';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { sexedGeometry } from '../primitives/proceduralGeometry';
import { buildOrganicBlob } from '../primitives/anatomicalForms';
import { mergeAll } from '../primitives/organForms';
import { BODY, type BodySex } from '../../constants/bodyLayout';
import { SEX_SCALE } from '../../constants/bodyProfile';
import { useViewStore } from '../../store/useViewStore';

/**
 * The superficial trunk muscles — pectorals, rectus abdominis, obliques,
 * trapezius, and the lats across the back. Limb muscles live with their
 * limb (biceps/triceps/quadriceps/calf in Arm.tsx and Leg.tsx); this
 * covers the trunk, which previously had no muscle layer at all and so
 * showed bare ribs floating inside a shell.
 *
 * Each group is mirrored from one builder, so the two sides are exact
 * reflections.
 */

function buildPectorals(m: number, sex: BodySex) {
  // Pectoralis sits deeper and reads flatter under female breast tissue.
  const depth = sex === 'female' ? 0.86 : 1;
  return mergeAll(
    [1, -1].map((sign) => {
      const pec = buildOrganicBlob({ radius: 0.056 * m, scale: [1.05, 0.62, 0.42 * depth], lumpiness: 0.06, phase: sign * 0.7, detail: 3 });
      pec.translate(sign * 0.058, BODY.chestCenterY + 0.088, 0.088);
      return pec;
    }),
  );
}

function buildAbdominals(m: number) {
  const parts = [];
  // Rectus abdominis: two columns of segments either side of the linea alba.
  for (const sign of [1, -1] as const) {
    for (let row = 0; row < 4; row++) {
      const seg = buildOrganicBlob({
        radius: 0.026 * m,
        scale: [0.85, 0.62, 0.42],
        lumpiness: 0.05,
        phase: sign * (0.4 + row * 0.6),
        detail: 2,
      });
      seg.translate(sign * 0.027, 1.085 - row * 0.038, 0.088);
      parts.push(seg);
    }
    // External oblique wrapping the flank.
    const oblique = buildOrganicBlob({ radius: 0.05 * m, scale: [0.62, 1.15, 0.6], lumpiness: 0.06, phase: sign * 1.6, detail: 3 });
    oblique.translate(sign * 0.104, 1.03, 0.03);
    parts.push(oblique);
  }
  return mergeAll(parts);
}

function buildBackMuscles(m: number) {
  const parts = [];
  for (const sign of [1, -1] as const) {
    const trap = buildOrganicBlob({ radius: 0.062 * m, scale: [1.15, 0.72, 0.4], lumpiness: 0.06, phase: sign * 2.2, detail: 3 });
    trap.translate(sign * 0.062, BODY.shoulderY - 0.02, -0.062);
    parts.push(trap);

    const lat = buildOrganicBlob({ radius: 0.058 * m, scale: [0.85, 1.35, 0.42], lumpiness: 0.06, phase: sign * 0.9, detail: 3 });
    lat.translate(sign * 0.088, BODY.chestCenterY - 0.02, -0.07);
    parts.push(lat);
  }
  return mergeAll(parts);
}

export function Musculature() {
  const sex = useViewStore((s) => s.anatomySex);
  const m = SEX_SCALE[sex].muscle;

  const pectorals = useMemo(() => sexedGeometry(sex, 'muscle.pectorals', () => buildPectorals(m, sex)), [sex, m]);
  const abdominals = useMemo(() => sexedGeometry(sex, 'muscle.abdominals', () => buildAbdominals(m)), [sex, m]);
  const back = useMemo(() => sexedGeometry(sex, 'muscle.back', () => buildBackMuscles(m)), [sex, m]);

  return (
    <group>
      <SelectableMesh nodeId="body.musculature.pectorals" geometry={pectorals} tissue="muscle" />
      <SelectableMesh nodeId="body.musculature.abdominals" geometry={abdominals} tissue="muscle" />
      <SelectableMesh nodeId="body.musculature.back" geometry={back} tissue="muscle" />
    </group>
  );
}
