import type { PhysiologyFrame } from '../../types';

// TODO(real-data): every value produced by this file is a fabricated
// placeholder that exists only to prove out the 4D playback architecture
// end to end (see engine/physiologyEngine.ts). A real integration —
// streaming patient monitor data, an EHR-derived time series, or a
// reduced-order simulation (CFD/ROM) output — would replace the body of
// `generatePhysiologyFrame` with a lookup/interpolation against real data,
// while keeping the exact same `PhysiologyFrame` return shape so nothing
// else in the app (stores, scene, UI) has to change.

const MOCK_HEART_RATE = 72; // bpm, fabricated
const MOCK_RESPIRATORY_RATE = 14; // breaths/min, fabricated

/** 0..1 position within the current cardiac cycle. */
export function cardiacPhase(time: number, heartRate: number): number {
  const cycleSeconds = 60 / heartRate;
  return (time % cycleSeconds) / cycleSeconds;
}

/**
 * 0..1 contraction curve: a fast systolic rise followed by a slower
 * diastolic relaxation. Deliberately a plain closed-form sine/cosine
 * blend (not a lookup table or noise function) so it's cheap to evaluate
 * per-mesh, per-frame, and easy to hand-verify just by reading it.
 */
export function cardiacContraction(phase: number): number {
  const systole = 0.35;
  if (phase < systole) {
    return Math.sin((phase / systole) * (Math.PI / 2));
  }
  const relax = (phase - systole) / (1 - systole);
  return Math.cos(relax * (Math.PI / 2));
}

/** 0..1 position within the current respiratory cycle. */
export function respiratoryPhase(time: number, respiratoryRate: number): number {
  const cycleSeconds = 60 / respiratoryRate;
  return (time % cycleSeconds) / cycleSeconds;
}

/** 0..1 chest-expansion curve (smooth in/out breathing). */
export function respiratoryExpansion(phase: number): number {
  return 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
}

export function generatePhysiologyFrame(time: number): PhysiologyFrame {
  const heartRate = MOCK_HEART_RATE;
  const respiratoryRate = MOCK_RESPIRATORY_RATE;
  const contraction = cardiacContraction(cardiacPhase(time, heartRate));
  const breath = respiratoryExpansion(respiratoryPhase(time, respiratoryRate));

  return {
    time,
    heartRate,
    respiratoryRate,
    bloodPressure: { systolic: 118, diastolic: 76, map: 90 }, // mock, static for this build
    bodyRegions: {
      heart: { perfusion: 0.6 + contraction * 0.4, flow: contraction, state: 'normal' },
      lungLeft: { perfusion: 0.7 + breath * 0.2, flow: breath, state: 'normal' },
      lungRight: { perfusion: 0.7 + breath * 0.2, flow: breath, state: 'normal' },
      // Both eyes, since both are now fully modelled. Values are identical
      // per side by design: this is the MOCK stream, and inventing a
      // left/right difference would read as a real clinical asymmetry.
      // Real per-eye data arrives via realBodyRegions and overrides these.
      ...Object.fromEntries(
        (['left', 'right'] as const).flatMap((side) => [
          [`eye.${side}.iop`, { pressure: 15.5, state: 'normal' }], // mock mmHg, static placeholder
          [`eye.${side}.retina`, { perfusion: 0.55 + contraction * 0.15, flow: contraction, state: 'normal' }],
          [`eye.${side}.retinalFlow`, { flow: contraction, perfusion: 0.55 + contraction * 0.15, state: 'normal' }],
          [`eye.${side}.opticNerve`, { perfusion: 0.5 + contraction * 0.1, state: 'normal' }],
        ]),
      ),
    },
  };
}
