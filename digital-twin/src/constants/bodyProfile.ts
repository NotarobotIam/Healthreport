import type { ProfilePoint } from '../scene/primitives/anatomicalForms';
import { sampleProfile } from '../scene/primitives/anatomicalForms';
import { BODY, type BodySex } from './bodyLayout';

/**
 * The human silhouette itself: the cross-section curves every body surface
 * is lofted through. Separate from bodyLayout.ts, which owns the SKELETON
 * of the figure (where joints are); this file owns its FLESH (how wide and
 * how deep the body is at each height).
 *
 * All figures are half-widths in meters for an average adult. Proportions
 * are taken from standard anthropometric ratios rather than any individual
 * patient — this is still a generic mannequin, not a scan (see the README's
 * geometry-provider seam for where real per-patient geometry plugs in).
 *
 * Every value is symmetric about X by construction: the builders mirror
 * left/right from one profile via SIDE_SIGN, so a left/right asymmetry is
 * not expressible here even by mistake.
 *
 * MALE vs FEMALE. The trunk is authored twice, because the difference there
 * is one of SHAPE, not size — a female trunk is not a scaled-down male one:
 * the hips are absolutely wider, the waist narrower, and the ribcage and
 * shoulders narrower, which no single scale factor can express. Everything
 * else (head, neck, limbs) genuinely does differ mostly in scale, so those
 * are derived from one authored profile through SEX_SCALE rather than
 * duplicated — one source of truth, and the two figures cannot drift apart
 * in shape.
 */

/**
 * The trunk, keyed by ABSOLUTE world Y rather than a normalized 0..1 `t`,
 * so that the separately-selectable trunk segments (pelvis / abdomen /
 * chest) can each sample this one curve over their own Y range and meet at
 * an identical boundary ring. That shared sampling is what makes the trunk
 * read as one continuous body instead of three stacked cylinders.
 *
 * Both variants use the SAME control heights, so the two figures' trunk
 * segments still line up with each other and with the fixed skeleton.
 */
const TRUNK_CONTROL_MALE: Array<{ y: number; rx: number; rz: number }> = [
  { y: 0.78, rx: 0.148, rz: 0.108 }, // upper thigh / gluteal fold
  { y: 0.845, rx: 0.157, rz: 0.118 }, // widest point of the hips
  { y: 0.9, rx: 0.148, rz: 0.113 },
  { y: 0.97, rx: 0.136, rz: 0.101 },
  { y: 1.04, rx: 0.127, rz: 0.094 }, // waist — the narrowest trunk slice
  { y: 1.1, rx: 0.139, rz: 0.102 },
  { y: 1.17, rx: 0.157, rz: 0.111 },
  { y: 1.24, rx: 0.168, rz: 0.116 }, // chest at its fullest
  { y: 1.31, rx: 0.171, rz: 0.114 },
  { y: 1.375, rx: 0.162, rz: 0.104 },
  { y: 1.415, rx: 0.142, rz: 0.094 }, // clavicle shelf, tapering to the neck
  { y: 1.45, rx: 0.118, rz: 0.083 },
];

/**
 * Female trunk: wider hips, a markedly narrower waist (waist-to-hip ~0.71
 * against the male figure's ~0.81), and a narrower ribcage and shoulder
 * shelf — the hourglass against the male V-taper.
 */
const TRUNK_CONTROL_FEMALE: Array<{ y: number; rx: number; rz: number }> = [
  { y: 0.78, rx: 0.152, rz: 0.113 },
  { y: 0.845, rx: 0.166, rz: 0.125 }, // widest point of the hips — wider than the male figure's
  { y: 0.9, rx: 0.156, rz: 0.119 },
  { y: 0.97, rx: 0.136, rz: 0.101 },
  { y: 1.04, rx: 0.118, rz: 0.089 }, // waist — narrower, and the tightest point of the figure
  { y: 1.1, rx: 0.130, rz: 0.096 },
  { y: 1.17, rx: 0.144, rz: 0.104 },
  { y: 1.24, rx: 0.152, rz: 0.109 }, // narrower thorax
  { y: 1.31, rx: 0.154, rz: 0.107 },
  { y: 1.375, rx: 0.147, rz: 0.098 },
  { y: 1.415, rx: 0.130, rz: 0.090 }, // narrower clavicle shelf
  { y: 1.45, rx: 0.110, rz: 0.080 },
];

const TRUNK_CONTROL: Record<BodySex, Array<{ y: number; rx: number; rz: number }>> = {
  male: TRUNK_CONTROL_MALE,
  female: TRUNK_CONTROL_FEMALE,
};

/**
 * Scale factors applied to the shared head/neck/limb/organ profiles. These
 * are proportional differences, not a blanket shrink — limbs are relatively
 * more slender, the neck noticeably so, while thighs stay comparatively
 * full, and muscle relief is softer.
 */
export const SEX_SCALE: Record<BodySex, {
  upperArm: number; forearm: number; thigh: number; shin: number;
  head: number; neck: number; organ: number; muscle: number; ribcage: number;
  /** Applied to the whole hand about the wrist, and to the foot's width and length about the ankle. */
  hand: number; foot: number;
}> = {
  male: { upperArm: 1, forearm: 1, thigh: 1, shin: 1, head: 1, neck: 1, organ: 1, muscle: 1, ribcage: 1, hand: 1, foot: 1 },
  female: {
    upperArm: 0.9, forearm: 0.9, thigh: 0.97, shin: 0.92,
    head: 0.95, neck: 0.87, organ: 0.93, muscle: 0.86, ribcage: 0.93,
    hand: 0.92, foot: 0.94,
  },
};

/** Uniformly scales a profile's radii, leaving its centerline offsets intact. */
export function scaleProfile(profile: ProfilePoint[], factor: number): ProfilePoint[] {
  if (factor === 1) return profile;
  return profile.map((p) => ({
    ...p,
    rx: p.rx * factor,
    rz: (p.rz ?? p.rx * 0.88) * factor,
    cx: (p.cx ?? 0) * factor,
    cz: (p.cz ?? 0) * factor,
  }));
}

/** Cross-section of the trunk at an absolute world height. */
export function trunkSectionAt(y: number, sex: BodySex): { rx: number; rz: number } {
  const control = TRUNK_CONTROL[sex];
  const first = control[0];
  const last = control[control.length - 1];
  const span = last.y - first.y;
  const t = (y - first.y) / span;
  // Reuse the same spline sampler the limb profiles use, by mapping the
  // absolute-Y control points onto its 0..1 domain (t=0 is the TOP there,
  // so the list is reversed).
  const asProfile: ProfilePoint[] = [...control]
    .reverse()
    .map((p) => ({ t: (last.y - p.y) / span, rx: p.rx, rz: p.rz }));
  const sampled = sampleProfile(asProfile, 1 - t);
  return { rx: sampled.rx, rz: sampled.rz };
}

/** Ring stack for a trunk segment spanning [bottomY, topY], sampled from the shared trunk curve. */
export function trunkRings(bottomY: number, topY: number, sex: BodySex, slices = 18) {
  const rings = [];
  for (let i = 0; i < slices; i++) {
    const y = bottomY + ((topY - bottomY) * i) / (slices - 1);
    const section = trunkSectionAt(y, sex);
    rings.push({ y, radiusX: section.rx, radiusZ: section.rz });
  }
  return rings;
}

/**
 * Head: cranium above, cheekbones at eye level, tapering to the chin, with
 * the whole mass set slightly forward of the neck axis (`cz`) the way a
 * real skull sits on the spine. t=0 is the crown, t=1 the chin.
 */
export const HEAD_PROFILE: ProfilePoint[] = [
  { t: 0, rx: 0.028, rz: 0.03, cz: 0.002 },
  { t: 0.1, rx: 0.062, rz: 0.068, cz: 0.004 },
  { t: 0.24, rx: 0.082, rz: 0.09, cz: 0.006 },
  { t: 0.38, rx: 0.088, rz: 0.098, cz: 0.008 }, // widest cranial vault
  { t: 0.52, rx: 0.086, rz: 0.098, cz: 0.012 }, // brow / orbital shelf
  { t: 0.64, rx: 0.079, rz: 0.092, cz: 0.016 }, // cheekbones
  { t: 0.78, rx: 0.066, rz: 0.079, cz: 0.014 }, // jaw line
  { t: 0.9, rx: 0.046, rz: 0.058, cz: 0.008 },
  { t: 1, rx: 0.022, rz: 0.03, cz: 0.002 }, // chin
];

export const NECK_PROFILE: ProfilePoint[] = [
  { t: 0, rx: 0.048, rz: 0.05 },
  { t: 0.5, rx: 0.052, rz: 0.053 },
  { t: 1, rx: 0.068, rz: 0.062 }, // flares into the trapezius
];

/** Upper arm: deltoid cap, biceps/triceps belly, narrowing hard at the elbow. */
export const UPPER_ARM_PROFILE: ProfilePoint[] = [
  { t: 0, rx: 0.052, rz: 0.05 },
  { t: 0.12, rx: 0.055, rz: 0.053 }, // deltoid
  { t: 0.38, rx: 0.047, rz: 0.046 }, // biceps belly
  { t: 0.7, rx: 0.039, rz: 0.039 },
  { t: 0.92, rx: 0.032, rz: 0.033 },
  { t: 1, rx: 0.03, rz: 0.031 }, // elbow
];

/** Forearm: flexor mass just below the elbow, then a long taper to a narrow wrist. */
export const FOREARM_PROFILE: ProfilePoint[] = [
  { t: 0, rx: 0.031, rz: 0.032 },
  { t: 0.16, rx: 0.036, rz: 0.036 }, // flexor bulk
  { t: 0.45, rx: 0.031, rz: 0.031 },
  { t: 0.78, rx: 0.024, rz: 0.023 },
  { t: 1, rx: 0.021, rz: 0.018 }, // wrist — flattened front-to-back
];

/** Thigh: heavy at the hip, quadriceps swell, narrowing to the knee. */
export const THIGH_PROFILE: ProfilePoint[] = [
  { t: 0, rx: 0.087, rz: 0.085 },
  { t: 0.22, rx: 0.081, rz: 0.079 },
  { t: 0.55, rx: 0.069, rz: 0.068 },
  { t: 0.85, rx: 0.056, rz: 0.055 },
  { t: 1, rx: 0.05, rz: 0.05 }, // knee
];

/** Shin: calf belly high on the back of the leg, tapering to a thin ankle. */
export const SHIN_PROFILE: ProfilePoint[] = [
  { t: 0, rx: 0.048, rz: 0.049 },
  { t: 0.18, rx: 0.051, rz: 0.055, cz: -0.008 }, // gastrocnemius, set backward
  { t: 0.45, rx: 0.042, rz: 0.045, cz: -0.005 },
  { t: 0.75, rx: 0.031, rz: 0.032 },
  { t: 1, rx: 0.024, rz: 0.026 }, // ankle
];

/** Palm: a flattened wedge, widening toward the knuckles. */
export const PALM_PROFILE: ProfilePoint[] = [
  { t: 0, rx: 0.026, rz: 0.013 },
  { t: 0.3, rx: 0.035, rz: 0.014 },
  { t: 0.75, rx: 0.04, rz: 0.013 },
  { t: 1, rx: 0.039, rz: 0.011 },
];

/** Where the shoulder cap sits relative to the trunk, used by both arm and trunk builders. */
export const SHOULDER_CAP_Y = BODY.shoulderY + 0.012;
