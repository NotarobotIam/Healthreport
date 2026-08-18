import { useFrame } from '@react-three/fiber';
import { physiologyEngine } from '../engine/physiologyEngine';

/**
 * Drives the mocked 4D physiology playback from R3F's own render loop
 * rather than `setInterval` — matches the canvas's natural frame cadence
 * and pauses for free when the tab isn't visible. Mutates the vanilla
 * `physiologyEngine` store directly; does not touch React state, so this
 * runs at 60fps without triggering any component re-render (see
 * engine/physiologyEngine.ts).
 */
export function PhysiologyClock() {
  useFrame((_state, delta) => {
    const { isPlaying, tick } = physiologyEngine.getState();
    if (isPlaying) tick(delta);
  });
  return null;
}
