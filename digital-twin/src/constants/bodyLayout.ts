// Single source of truth for body proportions (world units ~= meters),
// shared by procedural geometry (scene/body/**, scene/eye/**) and
// hand-authored camera targets (data/anatomy/**) so the two data sources
// can never silently drift apart from each other.
//
// Convention: +Y up, +Z toward the viewer, +X = patient's LEFT / viewer's
// right (matches the reference platform: the patient's left arm reads on
// the right side of the screen when facing the camera).

export type Side = 'left' | 'right';

export const SIDE_SIGN: Record<Side, 1 | -1> = { left: 1, right: -1 };

export const BODY = {
  groundY: 0,
  ankleY: 0.1,
  kneeY: 0.47,
  hipY: 0.86,
  pelvisCenterY: 0.9,
  hipHalfWidth: 0.11,
  waistY: 1.04,
  chestCenterY: 1.2,
  ribTopY: 1.38,
  shoulderY: 1.4,
  shoulderHalfWidth: 0.19,
  neckBaseY: 1.44,
  neckTopY: 1.52,
  headCenterY: 1.64,
  headRadius: 0.095,
  headTopY: 1.77,
} as const;

export const ARM = {
  /** Outward tilt from vertical at the shoulder — gives a relaxed A-pose instead of arms-at-attention. */
  tiltRad: 0.2,
  upperArmLength: 0.27,
  elbowGap: 0.01,
  forearmLength: 0.23,
  wristGap: 0.01,
  handLength: 0.095,
} as const;

export const LEG = {
  thighLength: 0.37,
  shinLength: 0.35,
  footLength: 0.24,
} as const;

export const EYE = {
  /** ~12mm — true human eyeball scale. Camera `near` is set very small (see CameraRig) so this stays legible up close. */
  radius: 0.012,
} as const;

/** World position of the shoulder joint (glenohumeral joint) for a given side. */
export function shoulderPosition(side: Side): [number, number, number] {
  return [SIDE_SIGN[side] * BODY.shoulderHalfWidth, BODY.shoulderY, 0];
}

export function hipPosition(side: Side): [number, number, number] {
  return [SIDE_SIGN[side] * BODY.hipHalfWidth, BODY.hipY, 0];
}

/**
 * Approximate world position reached by travelling `downDistance` meters
 * down the tilted arm chain from the shoulder. Used only to hand-author
 * approximate camera targets — the renderer reproduces the same tilt via a
 * single Three.js group rotation (see scene/body/Arm.tsx), so this and the
 * rendered geometry are derived from the same ARM.tiltRad constant and stay
 * in agreement without being literally the same code path.
 */
export function armPointWorld(side: Side, downDistance: number): [number, number, number] {
  const [sx, sy, sz] = shoulderPosition(side);
  const theta = SIDE_SIGN[side] * ARM.tiltRad;
  return [sx + downDistance * Math.sin(theta), sy - downDistance * Math.cos(theta), sz];
}

/** Approximate world position travelling `downDistance` meters down the (untilted, vertical) leg chain. */
export function legPointWorld(side: Side, downDistance: number): [number, number, number] {
  const [hx, hy, hz] = hipPosition(side);
  return [hx, hy - downDistance, hz];
}

export function orbitPosition(side: Side): [number, number, number] {
  return [SIDE_SIGN[side] * 0.035, BODY.headCenterY - 0.006, BODY.headRadius * 0.9];
}
