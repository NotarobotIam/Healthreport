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
  bone: '#e8e2d0',
  joint: '#c9d6e0',
  muscle: '#8a3b3b',
  // Outer body surface is intentionally a translucent "3D scan" material
  // rather than an attempt at photoreal skin tone — procedural primitive
  // geometry reads as more convincing (and more "digital twin") stylized
  // and semi-transparent than opaque and literal. See SelectableMesh outer
  // shell handling in scene/primitives/materials.ts.
  skinScan: '#3a5568',
  organGeneric: '#7a4a42',
  heart: '#c23b3b',
  lungs: '#d98a8a',
  brain: '#c9a3c9',
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
