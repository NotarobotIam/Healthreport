import type { AnatomySystem } from '../types';

/**
 * Kinds of tissue used across the procedural body — deliberately generic
 * ("what does this LOOK like") rather than tied 1:1 to AnatomySystem, since
 * e.g. both bone and cartilage read as "skeletal" but shouldn't share a
 * color. When a real GLTF scan asset replaces a procedural builder, its
 * material can ignore this and use scan-derived shading instead.
 */
export type TissueKind =
  | 'bone'
  | 'joint'
  | 'muscle'
  | 'skinScan'
  | 'organGeneric'
  | 'liver'
  | 'stomach'
  | 'intestine'
  | 'kidney'
  | 'cartilage'
  | 'fat'
  | 'heart'
  | 'lungs'
  | 'brain'
  | 'artery'
  | 'vein'
  | 'nerve'
  | 'lymphatic'
  | 'cornea'
  | 'sclera'
  | 'iris'
  | 'pupil'
  | 'lens'
  | 'ciliary'
  | 'vitreous'
  | 'retina'
  | 'opticNerve'
  | 'eyeMuscle'
  | 'eyelid'
  | 'lacrimal';

/** Base (unlit-emissive-free) color per tissue kind. */
export const TISSUE_COLORS: Record<TissueKind, string> = {
  bone: '#ece5d2',
  joint: '#cfd9de',
  muscle: '#9c3a36',
  // The outer body surface is a translucent skin layer: warm enough to read
  // as a person at a glance, transparent enough that the muscle, vascular,
  // and organ layers underneath stay legible without touching the slider.
  // It is a stylized anatomical-atlas skin, not photoreal (there is no
  // scan-derived texture in this build) — see materials.ts's outer-shell
  // handling for how the transparency slider drives it.
  skinScan: '#c98f6b',
  organGeneric: '#8a5248',
  liver: '#7d3b32',
  stomach: '#b9705a',
  intestine: '#c08a67',
  kidney: '#8e4038',
  cartilage: '#d8e2e4',
  fat: '#e8d9a8',
  heart: '#b8322f',
  lungs: '#cf8a86',
  brain: '#d0aab0',
  artery: '#ef4444',
  vein: '#3b82f6',
  nerve: '#eab308',
  lymphatic: '#22c55e',
  cornea: '#bfe8e6',
  sclera: '#f0ece0',
  iris: '#3f8f9f',
  pupil: '#05080d',
  lens: '#dce8e0',
  ciliary: '#c9a86b',
  vitreous: '#cfe9e6',
  retina: '#b23a4a',
  opticNerve: '#f5e6a3',
  eyeMuscle: '#a85a5a',
  eyelid: '#c99a7a',
  lacrimal: '#e8c97a',
};

export const HIGHLIGHT = {
  hover: '#3ee6e0',
  selected: '#f5a623',
  pathological: '#ef4444',
} as const;

export const SYSTEM_COLORS: Record<AnatomySystem, string> = {
  skeletal: '#dce8ea',
  muscular: '#8a3b3b',
  cardiovascular: '#ef4444',
  nervous: '#eab308',
  respiratory: '#d98a8a',
  digestive: '#a86b3f',
  endocrine: '#a855f7',
  lymphatic: '#22c55e',
  integumentary: '#3a5568',
};

export function getSystemColor(system: AnatomySystem): string {
  return SYSTEM_COLORS[system];
}
