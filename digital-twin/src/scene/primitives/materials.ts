import * as THREE from 'three';
import { TISSUE_COLORS, type TissueKind } from '../../utils/color';

/**
 * One shared base Material instance per tissue kind, mutated in place when
 * a view-mode preset or tissue-wide styling changes (so restyling "every
 * bone in the body" is one material write, not a scene walk). Each
 * SelectableMesh clones its tissue's base material ONCE on mount to get an
 * independent instance for its own hover/select/opacity state — see
 * SelectableMesh.tsx.
 */
const sharedMaterials = new Map<TissueKind, THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>();

const ROUGHNESS: Partial<Record<TissueKind, number>> = {
  bone: 0.55,
  joint: 0.4,
  muscle: 0.62,
  skinScan: 0.3,
  organGeneric: 0.58,
  liver: 0.6,
  stomach: 0.52,
  intestine: 0.55,
  kidney: 0.55,
  cartilage: 0.4,
  fat: 0.7,
  heart: 0.42,
  lungs: 0.5,
  brain: 0.5,
  artery: 0.3,
  vein: 0.3,
  nerve: 0.4,
  lymphatic: 0.4,
  sclera: 0.35,
  iris: 0.25,
  pupil: 0.05,
  ciliary: 0.55,
  retina: 0.45,
  opticNerve: 0.4,
  eyeMuscle: 0.55,
  eyelid: 0.5,
  lacrimal: 0.45,
};

/** Tissue kinds rendered with a transmissive (glass-like) physical material instead of a plain standard material. */
const TRANSMISSIVE_KINDS = new Set<TissueKind>(['cornea', 'lens', 'vitreous']);

export function getSharedMaterial(kind: TissueKind): THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  const cached = sharedMaterials.get(kind);
  if (cached) return cached;

  const color = TISSUE_COLORS[kind];
  const roughness = ROUGHNESS[kind] ?? 0.5;
  const emissive = new THREE.Color('#000000');

  // Limbs are mirrored left/right with a negative scale on the arm/leg
  // group (see scene/body/Arm.tsx), which inverts triangle winding — under
  // default front-face culling the right-side limbs would render
  // inside-out. Double-siding every tissue is the simplest correct fix and
  // costs nothing on closed body geometry, where backfaces are hidden by
  // depth regardless.
  const side = THREE.DoubleSide;

  const material = TRANSMISSIVE_KINDS.has(kind)
    ? new THREE.MeshPhysicalMaterial({
        color,
        roughness,
        side,
        metalness: 0,
        transmission: 0.85,
        thickness: 0.02,
        ior: 1.37,
        emissive,
        emissiveIntensity: 0,
      })
    : new THREE.MeshStandardMaterial({
        color,
        roughness,
        side,
        metalness: 0.05,
        emissive,
        emissiveIntensity: 0,
      });

  sharedMaterials.set(kind, material);
  return material;
}

/** Outer-shell "3D scan" tissue is translucent even at rest, and fades further as the transparency slider rises. Everything else stays opaque regardless of the slider. */
export function outerShellOpacity(transparencySlider: number): number {
  const clamped = Math.min(1, Math.max(0, transparencySlider));
  return 0.68 - clamped * 0.6;
}

export const HOVER_EMISSIVE = new THREE.Color('#3ee6e0');
export const SELECTED_EMISSIVE = new THREE.Color('#f5a623');
