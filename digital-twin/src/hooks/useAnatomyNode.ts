import { useMemo } from 'react';
import { ancestryMap, descendantSet, getSelectableFrontier } from '../data/anatomy';
import { useAnatomyStore, selectedNodeIdSelector } from '../store/useAnatomyStore';

/** The set of node ids currently reachable via 3D raycast / hover, given the current navigation focus. */
export function useCurrentSelectableSet(): Set<string> {
  const focusId = useAnatomyStore(selectedNodeIdSelector);
  return useMemo(() => new Set(getSelectableFrontier(focusId)), [focusId]);
}

function isRelated(a: string, b: string): boolean {
  if (a === b) return true;
  return (ancestryMap.get(b)?.includes(a) ?? false) || (descendantSet.get(a)?.has(b) ?? false);
}

/**
 * Combined navigation-depth + hover emphasis for one node, in [MIN_EMPHASIS, 1].
 * Two independent effects, matching the spec's two dimming examples:
 *  - zoomed into a subtree -> everything outside it fades (navigation-depth dimming)
 *  - hovering a sibling within the current frontier -> the rest of that
 *    frontier fades a bit more, relative to whatever it was already at
 *    (hover dimming) — e.g. "hover forearm: hand/upper arm/shoulder remain
 *    visible but less emphasized".
 */
const BACKGROUND_EMPHASIS = 0.32;
const HOVER_DIM_FACTOR = 0.55;

export function computeEmphasis(nodeId: string, focusId: string, hoveredNodeId: string | null): number {
  const inFocusSubtree = isRelated(focusId, nodeId);
  let emphasis = inFocusSubtree ? 1 : BACKGROUND_EMPHASIS;

  if (hoveredNodeId && hoveredNodeId !== nodeId && !isRelated(hoveredNodeId, nodeId)) {
    emphasis *= HOVER_DIM_FACTOR;
  }
  return emphasis;
}

export function useNodeEmphasis(nodeId: string): number {
  const focusId = useAnatomyStore(selectedNodeIdSelector);
  const hoveredNodeId = useAnatomyStore((s) => s.hoveredNodeId);
  return useMemo(() => computeEmphasis(nodeId, focusId, hoveredNodeId), [nodeId, focusId, hoveredNodeId]);
}
