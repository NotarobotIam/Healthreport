import { createStore } from 'zustand/vanilla';
import type { BodyRegionState, PhysiologyFrame } from '../types';
import { generatePhysiologyFrame } from '../data/physiology/mockGenerator';
import { mergeRealBodyRegions } from '../data/physiology/realBodyRegions';

export interface PhysiologyEngineState {
  isPlaying: boolean;
  /** Playback speed multiplier applied to physiological (not wall-clock) time. */
  speed: number;
  currentTime: number;
  frame: PhysiologyFrame;
  /** Real (report-derived) per-region data, merged on top of the mock stream every frame — see setRealBodyRegions. Empty until useRemoteImagingData successfully fetches something. */
  realBodyRegions: Record<string, BodyRegionState>;
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
  /** Sets the real-data overlay (see hooks/useRemoteImagingData.ts) and immediately re-derives the current frame, rather than waiting for the next tick. */
  setRealBodyRegions: (regions: Record<string, BodyRegionState>) => void;
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
  realBodyRegions: {},

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
    const mockFrame = generatePhysiologyFrame(clamped);
    const { realBodyRegions } = get();
    const frame: PhysiologyFrame =
      Object.keys(realBodyRegions).length === 0
        ? mockFrame
        : { ...mockFrame, bodyRegions: mergeRealBodyRegions(mockFrame.bodyRegions ?? {}, realBodyRegions) };
    set({ currentTime: clamped, frame });
  },

  tick: (deltaSeconds) => {
    const { currentTime, speed, setPhysiologyFrame } = get();
    setPhysiologyFrame(currentTime + deltaSeconds * speed);
  },

  setRealBodyRegions: (regions) => {
    set({ realBodyRegions: regions });
    get().setPhysiologyFrame(get().currentTime);
  },
}));
