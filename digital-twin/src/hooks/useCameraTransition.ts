import type CameraControls from 'camera-controls';

// Module-level mutable reference to the single active CameraControls
// instance, set once by CameraRig on mount. Almost everything about camera
// movement in this app is a discrete state transition driven by
// useAnatomyStore's `selectedNodeId` (see scene/CameraRig.tsx) — this is the
// one deliberate exception, for the left panel's press-to-nudge
// rotate/pan/zoom buttons, which are continuous imperative camera commands
// that don't correspond to "navigating to a node" and so don't belong in
// zustand state.
let activeControls: CameraControls | null = null;

export function setActiveCameraControls(controls: CameraControls | null): void {
  activeControls = controls;
}

const ROTATE_STEP = 0.22; // radians
const PAN_STEP = 0.05; // world units
const DOLLY_STEP = 0.18; // world units, toward/away from target

export function nudgeRotate(direction: 'left' | 'right' | 'up' | 'down'): void {
  if (!activeControls) return;
  switch (direction) {
    case 'left':
      activeControls.rotate(-ROTATE_STEP, 0, true);
      break;
    case 'right':
      activeControls.rotate(ROTATE_STEP, 0, true);
      break;
    case 'up':
      activeControls.rotate(0, -ROTATE_STEP, true);
      break;
    case 'down':
      activeControls.rotate(0, ROTATE_STEP, true);
      break;
    default:
      break;
  }
}

export function nudgePan(direction: 'left' | 'right' | 'up' | 'down'): void {
  if (!activeControls) return;
  switch (direction) {
    case 'left':
      activeControls.truck(-PAN_STEP, 0, true);
      break;
    case 'right':
      activeControls.truck(PAN_STEP, 0, true);
      break;
    case 'up':
      activeControls.truck(0, PAN_STEP, true);
      break;
    case 'down':
      activeControls.truck(0, -PAN_STEP, true);
      break;
    default:
      break;
  }
}

export function nudgeZoom(direction: 'in' | 'out'): void {
  if (!activeControls) return;
  activeControls.dolly(direction === 'in' ? DOLLY_STEP : -DOLLY_STEP, true);
}
