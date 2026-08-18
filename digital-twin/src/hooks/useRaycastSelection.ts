import { useCallback } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { ancestryMap } from '../data/anatomy';
import { useAnatomyStore } from '../store/useAnatomyStore';
import { getNodeIdForMeshUuid, resolveSelectableAncestor } from '../utils/raycast';
import { useCurrentSelectableSet } from './useAnatomyNode';

// Module-level (shared across every SelectableMesh instance, not per-mesh
// state): when the pointer crosses from one mesh to an ADJACENT mesh that
// resolves to the SAME anatomical subassembly (e.g. the radius and ulna
// meshes both resolving to "forearm"), React Three Fiber still fires
// pointerout on the first mesh and pointerover on the second as two
// separate events, because they're genuinely different Object3Ds. Clearing
// hover synchronously on pointerout would flash the highlight off and back
// on for one frame. Deferring the clear by one animation frame, and
// cancelling it if a pointerover lands before it runs, absorbs that case.
let pendingClearHandle: number | null = null;

function cancelPendingClear(): void {
  if (pendingClearHandle !== null) {
    cancelAnimationFrame(pendingClearHandle);
    pendingClearHandle = null;
  }
}

function scheduleClearHover(hoverNode: (nodeId: string | null) => void): void {
  cancelPendingClear();
  pendingClearHandle = requestAnimationFrame(() => {
    pendingClearHandle = null;
    hoverNode(null);
  });
}

interface RaycastHandlers {
  handlePointerOver: (event: ThreeEvent<PointerEvent>) => void;
  handlePointerOut: (event: ThreeEvent<PointerEvent>) => void;
  handleClick: (event: ThreeEvent<MouseEvent>) => void;
}

/** Resolves a raw event's hit mesh to "the smallest logical anatomical subassembly under the cursor, at the current navigation depth" and wires it to the anatomy store. See utils/raycast.ts for the resolution algorithm itself. */
export function useRaycastSelection(): RaycastHandlers {
  const currentSelectableSet = useCurrentSelectableSet();
  const hoverNode = useAnatomyStore((s) => s.hoverNode);
  const selectNode = useAnatomyStore((s) => s.selectNode);

  const resolveEvent = useCallback(
    (event: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>): string | null => {
      const hitNodeId = getNodeIdForMeshUuid(event.object.uuid);
      if (!hitNodeId) return null;
      return resolveSelectableAncestor(hitNodeId, currentSelectableSet, ancestryMap);
    },
    [currentSelectableSet],
  );

  const handlePointerOver = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      const resolved = resolveEvent(event);
      if (!resolved) return;
      cancelPendingClear();
      hoverNode(resolved);
    },
    [resolveEvent, hoverNode],
  );

  const handlePointerOut = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      scheduleClearHover(hoverNode);
    },
    [hoverNode],
  );

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      // R3F's synthetic pointer events carry `delta`, the pixel distance
      // travelled since pointerdown — without this guard, releasing an
      // orbit-control drag over a mesh fires onClick just like a real
      // click, and the camera would "select" whatever the drag happened to
      // end on.
      if (event.delta > 4) return;
      const resolved = resolveEvent(event);
      if (resolved) selectNode(resolved);
    },
    [resolveEvent, selectNode],
  );

  return { handlePointerOver, handlePointerOut, handleClick };
}
