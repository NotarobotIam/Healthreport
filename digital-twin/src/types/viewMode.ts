// View-mode / filter types. ViewMode presets are stylized palette & opacity
// reinterpretations (see store/useViewStore.ts), not simulated imaging —
// there is no volumetric/Hounsfield-unit data to render.
export type ViewMode = 'normal' | 'xray' | 'ct' | 'mri' | 'muscle' | 'vessels' | 'nerves';

export interface CardiovascularSubfilters {
  arteries: boolean;
  veins: boolean;
  microvasculature: boolean;
}

export interface NervousSubfilters {
  central: boolean;
  peripheral: boolean;
}

export type LayerKey =
  | 'skin'
  | 'muscles'
  | 'bones'
  | 'organs'
  | 'arteries'
  | 'veins'
  | 'nerves';
