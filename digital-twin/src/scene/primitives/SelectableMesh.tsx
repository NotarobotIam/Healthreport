import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { TissueKind } from '../../utils/color';
import { getSharedMaterial, outerShellOpacity, HOVER_EMISSIVE, SELECTED_EMISSIVE } from './materials';
import { useAnatomyStore, selectedNodeIdSelector } from '../../store/useAnatomyStore';
import { useViewStore } from '../../store/useViewStore';
import { useNodeEmphasis } from '../../hooks/useAnatomyNode';
import { useRaycastSelection } from '../../hooks/useRaycastSelection';
import { registerSelectableMesh, unregisterSelectableMesh } from '../../utils/raycast';
import { anatomyMap } from '../../data/anatomy';
import { OUTER_SHELL_NODE_IDS } from '../../data/anatomy/eye';

interface SelectableMeshProps {
  nodeId: string;
  geometry: THREE.BufferGeometry;
  tissue: TissueKind;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
}

/**
 * THE geometry-provider seam described in the README: every anatomical
 * component in scene/body/** and scene/eye/** wraps its procedural geometry
 * in one of these. Replacing procedural geometry with a real GLTF-derived
 * mesh later means changing what `geometry` this receives — the
 * registration, highlighting, dimming, and system/transparency visibility
 * logic below all stay exactly as-is.
 */
export function SelectableMesh({ nodeId, geometry, tissue, position, rotation, scale }: SelectableMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { handlePointerOver, handlePointerOut, handleClick } = useRaycastSelection();

  const isHovered = useAnatomyStore((s) => s.hoveredNodeId === nodeId);
  const isSelected = useAnatomyStore((s) => selectedNodeIdSelector(s) === nodeId);
  const emphasis = useNodeEmphasis(nodeId);
  const transparency = useViewStore((s) => s.transparency);
  const systemVisible = useViewStore((s) => {
    const node = anatomyMap[nodeId];
    if (!node || node.systemTags.length === 0) return true; // ungated tissue (e.g. cornea/lens) always shows
    return node.systemTags.some((tag) => s.visibleSystems[tag]);
  });
  // Cardiovascular/nervous sub-filters key off the tissue kind itself
  // (this mesh already knows whether it's arterial/venous/etc) rather than
  // needing a parallel per-node data field. Only wired where a tissue kind
  // unambiguously maps to a sub-filter today (arteries, veins, brain ==
  // central nervous system) — see store/useViewStore.ts.
  const subfilterVisible = useViewStore((s) => {
    if (tissue === 'artery') return s.cardiovascularSubfilters.arteries;
    if (tissue === 'vein') return s.cardiovascularSubfilters.veins;
    if (tissue === 'brain') return s.nervousSubfilters.central;
    return true;
  });

  // A node belonging to the other anatomy must never render, even if a
  // component asks for it — this is the backstop behind the per-component
  // `sex === 'female' && ...` guards, so one missed guard cannot put a
  // prostate inside the female figure.
  const anatomySex = useViewStore((s) => s.anatomySex);
  const sexVisible = (anatomyMap[nodeId]?.sexSpecific ?? anatomySex) === anatomySex;

  const material = useMemo(() => getSharedMaterial(tissue).clone(), [tissue]);
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return undefined;
    registerSelectableMesh(mesh.uuid, nodeId, mesh);
    return () => unregisterSelectableMesh(mesh.uuid, nodeId);
  }, [nodeId]);

  useLayoutEffect(() => {
    // `skinScan` IS the outer-shell tissue, so it drives this directly.
    // Deriving "is this skin?" from the node's systemTags alone was wrong
    // once limbs gained a skin layer: nodes like `...left.thigh` are tagged
    // 'muscular'/'skeletal' (they own bone and muscle meshes too), so their
    // skin rendered fully OPAQUE and hid the femur, tibia, and limb muscles
    // inside it. The node-id/tag checks stay as-is for the eye's outer
    // shells, which are not skinScan.
    const isOuterShell =
      tissue === 'skinScan' ||
      OUTER_SHELL_NODE_IDS.has(nodeId) ||
      (anatomyMap[nodeId]?.systemTags.includes('integumentary') ?? false);
    const baseOpacity = isOuterShell ? outerShellOpacity(transparency) : 1;
    const finalOpacity = Math.max(0.02, baseOpacity * emphasis);

    material.opacity = finalOpacity;
    material.transparent = finalOpacity < 0.999;
    // Faded-out shells shouldn't win the depth-sort against what they're revealing.
    material.depthWrite = finalOpacity > 0.35;

    if (isHovered) {
      material.emissive.copy(HOVER_EMISSIVE);
      material.emissiveIntensity = 0.9;
    } else if (isSelected) {
      material.emissive.copy(SELECTED_EMISSIVE);
      material.emissiveIntensity = 0.55;
    } else {
      material.emissiveIntensity = 0;
    }
  }, [material, isHovered, isSelected, emphasis, transparency, nodeId, tissue]);

  if (!systemVisible || !subfilterVisible || !sexVisible) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={position}
      rotation={rotation}
      scale={scale}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    />
  );
}
