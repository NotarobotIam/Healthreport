import { createStore } from 'zustand/vanilla';
import type { PhysiologyFrame } from '../types';
import { generatePhysiologyFrame } from '../data/physiology/mockGenerator';

export interface PhysiologyEngineState {
  isPlaying: boolean;
  /** Playback speed multiplier applied to physiological (not wall-clock) time. */
  speed: number;
  currentTime: number;
  frame: PhysiologyFrame;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  /** Pauses and jumps directly to `time` — used by the timeline scrubber. */
  scrubTo: (time: number) => void;
  /**
   * The required public API from the spec: recompute physiological state at
   * an arbitrary time. This is the ONE function every future real data
   * source needs to satisfy the same contract as the mock generator.
   */
  setPhysiologyFrame: (time: number) => void;
  /** Advances playback by `deltaSeconds` of wall-clock time, scaled by `speed`. Called from PhysiologyClock's useFrame. */
  tick: (deltaSeconds: number) => void;
}

const INITIAL_TIME = 0;

/**
 * A VANILLA zustand store (not the React-hook `create` from 'zustand') on
 * purpose: this updates once per animation frame while playing, and every
 * mesh that animates with it (heart, lungs, vessels) reads it inside its
 * OWN useFrame via `physiologyEngine.getState()`. If this were a normal
 * React-bound store, every one of those reads-via-hook would re-render its
 * component 60 times a second. The only React binding onto this store is
 * the small, deliberately-scoped `engine/usePhysiologyPlayback.ts`, used by
 * the bottom time-control UI.
 */
export const physiologyEngine = createStore<PhysiologyEngineState>((set, get) => ({
  isPlaying: false,
  speed: 1,
  currentTime: INITIAL_TIME,
  frame: generatePhysiologyFrame(INITIAL_TIME),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  reset: () => get().setPhysiologyFrame(INITIAL_TIME),

  setSpeed: (speed) => set({ speed: Math.min(8, Math.max(0.1, speed)) }),

  scrubTo: (time) => {
    set({ isPlaying: false });
    get().setPhysiologyFrame(time);
  },

  setPhysiologyFrame: (time) => {
    const clamped = Math.max(0, time);
    set({ currentTime: clamped, frame: generatePhysiologyFrame(clamped) });
  },

  tick: (deltaSeconds) => {
    const { currentTime, speed, setPhysiologyFrame } = get();
    setPhysiologyFrame(currentTime + deltaSeconds * speed);
  },
}));
