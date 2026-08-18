import { useStore } from 'zustand';
import { shallow } from 'zustand/shallow';
import { physiologyEngine } from './physiologyEngine';
import type { BodyRegionState } from '../types';

interface PhysiologyPlaybackView {
  isPlaying: boolean;
  speed: number;
  currentTime: number;
  heartRate?: number;
  respiratoryRate?: number;
  bodyRegions?: Record<string, BodyRegionState>;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  scrubTo: (time: number) => void;
}

/**
 * The one deliberately narrow React binding onto the vanilla
 * `physiologyEngine` store (see engine/physiologyEngine.ts for why it's
 * vanilla in the first place). Used only by small DOM readouts (bottom time
 * controls, the right panel's physiology placeholder) — nothing in the 3D
 * scene should use this hook; scene meshes read
 * `physiologyEngine.getState()` directly inside their own `useFrame`. A few
 * small DOM text nodes re-rendering at playback frame-rate is normal and
 * cheap; it's mesh materials/transforms re-rendering via React that would
 * not be.
 */
export function usePhysiologyPlayback(): PhysiologyPlaybackView {
  return useStore(
    physiologyEngine,
    (s) => ({
      isPlaying: s.isPlaying,
      speed: s.speed,
      currentTime: s.currentTime,
      heartRate: s.frame.heartRate,
      respiratoryRate: s.frame.respiratoryRate,
      bodyRegions: s.frame.bodyRegions,
      play: s.play,
      pause: s.pause,
      reset: s.reset,
      setSpeed: s.setSpeed,
      scrubTo: s.scrubTo,
    }),
    shallow,
  );
}
