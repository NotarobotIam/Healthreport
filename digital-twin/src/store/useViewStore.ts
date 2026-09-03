import { create } from 'zustand';
import type { AnatomySystem, CardiovascularSubfilters, NervousSubfilters, ViewMode } from '../types';
import type { BodySex } from '../constants/bodyLayout';

export const ALL_SYSTEMS: AnatomySystem[] = [
  'skeletal',
  'muscular',
  'cardiovascular',
  'nervous',
  'respiratory',
  'digestive',
  'endocrine',
  'lymphatic',
  'integumentary',
];

function allSystemsVisible(): Record<AnatomySystem, boolean> {
  return ALL_SYSTEMS.reduce(
    (acc, system) => {
      acc[system] = true;
      return acc;
    },
    {} as Record<AnatomySystem, boolean>,
  );
}

function onlySystemsVisible(systems: AnatomySystem[]): Record<AnatomySystem, boolean> {
  const visible = ALL_SYSTEMS.reduce(
    (acc, system) => {
      acc[system] = false;
      return acc;
    },
    {} as Record<AnatomySystem, boolean>,
  );
  for (const system of systems) visible[system] = true;
  return visible;
}

interface ViewModePreset {
  visibleSystems: Record<AnatomySystem, boolean>;
  transparency: number;
}

/**
 * View modes are stylized palette/visibility presets layered on the SAME
 * visibleSystems + transparency state the manual toggles use — not a
 * parallel mechanism — and are explicitly NOT simulated medical imaging
 * (no volumetric data, no Hounsfield units).
 */
function presetForViewMode(mode: ViewMode): ViewModePreset {
  switch (mode) {
    case 'xray':
      return { visibleSystems: allSystemsVisible(), transparency: 0.82 };
    case 'ct':
      return { visibleSystems: onlySystemsVisible(['skeletal', 'respiratory', 'digestive', 'cardiovascular']), transparency: 0.5 };
    case 'mri':
      return { visibleSystems: onlySystemsVisible(['muscular', 'nervous', 'cardiovascular', 'digestive']), transparency: 0.5 };
    case 'muscle':
      return { visibleSystems: onlySystemsVisible(['muscular', 'skeletal']), transparency: 0.3 };
    case 'vessels':
      return { visibleSystems: onlySystemsVisible(['cardiovascular', 'lymphatic']), transparency: 0 };
    case 'nerves':
      return { visibleSystems: onlySystemsVisible(['nervous']), transparency: 0 };
    case 'normal':
    default:
      return { visibleSystems: allSystemsVisible(), transparency: 0 };
  }
}

interface ViewStoreState {
  /**
   * Which anatomical model to render. Deliberately NOT cleared by
   * resetView(): the other fields here are view filters the user toggles
   * while exploring, but the sex of the model is a property of the patient
   * being examined — silently flipping it on "Reset View" would be wrong.
   */
  anatomySex: BodySex;
  setAnatomySex: (sex: BodySex) => void;
  visibleSystems: Record<AnatomySystem, boolean>;
  cardiovascularSubfilters: CardiovascularSubfilters;
  nervousSubfilters: NervousSubfilters;
  viewMode: ViewMode;
  /** 0 (opaque) .. 1 (fully transparent) — affects outer-shell tissue only, see utils/color.ts + scene/primitives/materials.ts. */
  transparency: number;
  toggleSystem: (system: AnatomySystem) => void;
  toggleCardiovascularSubfilter: (key: keyof CardiovascularSubfilters) => void;
  toggleNervousSubfilter: (key: keyof NervousSubfilters) => void;
  setViewMode: (mode: ViewMode) => void;
  setTransparency: (value: number) => void;
  resetView: () => void;
}

export const useViewStore = create<ViewStoreState>((set) => ({
  anatomySex: 'male',
  setAnatomySex: (sex) => set({ anatomySex: sex }),
  visibleSystems: allSystemsVisible(),
  cardiovascularSubfilters: { arteries: true, veins: true, microvasculature: true },
  nervousSubfilters: { central: true, peripheral: true },
  viewMode: 'normal',
  transparency: 0,

  toggleSystem: (system) =>
    set((state) => ({ visibleSystems: { ...state.visibleSystems, [system]: !state.visibleSystems[system] } })),

  toggleCardiovascularSubfilter: (key) =>
    set((state) => ({
      cardiovascularSubfilters: { ...state.cardiovascularSubfilters, [key]: !state.cardiovascularSubfilters[key] },
    })),

  toggleNervousSubfilter: (key) =>
    set((state) => ({ nervousSubfilters: { ...state.nervousSubfilters, [key]: !state.nervousSubfilters[key] } })),

  setViewMode: (mode) => set({ viewMode: mode, ...presetForViewMode(mode) }),

  setTransparency: (value) => set({ transparency: Math.min(1, Math.max(0, value)) }),

  resetView: () =>
    set({
      visibleSystems: allSystemsVisible(),
      cardiovascularSubfilters: { arteries: true, veins: true, microvasculature: true },
      nervousSubfilters: { central: true, peripheral: true },
      viewMode: 'normal',
      transparency: 0,
    }),
}));
