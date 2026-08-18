import type { CameraTarget } from '../types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Builds a hand-authorable `CameraTarget`: look at `target`, from `distance`
 * away, along a yaw/pitch direction. Centralizing this arithmetic (rather
 * than hand-computing camera positions individually per node) is what keeps
 * every authored camera shot pointed at something sane even without being
 * able to render/verify it while writing the data.
 *
 * yaw: radians around Y, 0 = viewed from world +Z ("front").
 * pitch: radians above the horizontal plane.
 */
export function frameShot(
  target: [number, number, number],
  distance: number,
  opts?: { yaw?: number; pitch?: number },
): CameraTarget {
  const yaw = opts?.yaw ?? 0;
  const pitch = opts?.pitch ?? 0.18;
  const dx = Math.sin(yaw) * Math.cos(pitch);
  const dz = Math.cos(yaw) * Math.cos(pitch);
  const dy = Math.sin(pitch);
  const [tx, ty, tz] = target;
  return {
    target,
    position: [tx + distance * dx, ty + distance * dy, tz + distance * dz],
  };
}
