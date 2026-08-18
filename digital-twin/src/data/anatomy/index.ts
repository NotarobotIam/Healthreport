import type { AnatomyMap, AnatomyNode } from '../../types';
import { ROOT_NODE_ID } from '../../types';
import { rootNodes } from './root';
import { upperExtremityNodes } from './upperExtremity';
import { lowerExtremityNodes } from './lowerExtremity';
import { eyeNodes } from './eye';
import { torsoOrgansNodes } from './torsoOrgans';

const ALL_NODES: AnatomyNode[] = [
  ...rootNodes,
  ...upperExtremityNodes,
  ...lowerExtremityNodes,
  ...eyeNodes,
  ...torsoOrgansNodes,
];

/**
 * Merges every branch file into one flat map and DERIVES every node's
 * `children` from the other nodes' `parentId` — hand-authored `children`
 * arrays in the branch files are ignored on purpose. With ~230 nodes spread
 * across 5 files and no compiler in the loop while writing them, trusting a
 * single direction of truth (child points to parent) removes an entire
 * class of "forgot to list this id under its parent" bugs.
 */
function buildAnatomyMap(nodes: AnatomyNode[]): AnatomyMap {
  const map: AnatomyMap = {};
  for (const node of nodes) {
    if (map[node.id]) {
      console.error(`[anatomy] duplicate node id "${node.id}" — the later definition wins.`);
    }
    map[node.id] = { ...node, children: [] };
  }
  for (const node of nodes) {
    if (!node.parentId) continue;
    const parent = map[node.parentId];
    if (!parent) {
      console.error(`[anatomy] node "${node.id}" references missing parentId "${node.parentId}".`);
      continue;
    }
    parent.children.push(node.id);
  }
  return map;
}

export const anatomyMap: AnatomyMap = buildAnatomyMap(ALL_NODES);

/** Root-to-node ancestor id chain (excludes the node itself), memoized once at load. */
function buildAncestryMap(map: AnatomyMap): Map<string, string[]> {
  const ancestry = new Map<string, string[]>();
  function chainFor(id: string): string[] {
    const cached = ancestry.get(id);
    if (cached) return cached;
    const node = map[id];
    if (!node || !node.parentId) {
      ancestry.set(id, []);
      return [];
    }
    const parentChain = chainFor(node.parentId);
    const chain = [...parentChain, node.parentId];
    ancestry.set(id, chain);
    return chain;
  }
  for (const id of Object.keys(map)) chainFor(id);
  return ancestry;
}

export const ancestryMap = buildAncestryMap(anatomyMap);

/** Full descendant id set per node, memoized once at load (used for O(1) sibling-dimming checks). */
function buildDescendantSets(map: AnatomyMap): Map<string, Set<string>> {
  const descendants = new Map<string, Set<string>>();
  function collect(id: string): Set<string> {
    const cached = descendants.get(id);
    if (cached) return cached;
    const node = map[id];
    const set = new Set<string>();
    if (node) {
      for (const childId of node.children) {
        set.add(childId);
        for (const d of collect(childId)) set.add(d);
      }
    }
    descendants.set(id, set);
    return set;
  }
  for (const id of Object.keys(map)) collect(id);
  return descendants;
}

export const descendantSet = buildDescendantSets(anatomyMap);

/**
 * "Current selectable set" for a given navigation focus: the focused node's
 * children, transparently skipping through non-selectable organizational
 * nodes (e.g. "Upper Extremities", which groups Left/Right Arm without
 * being a click target itself) to find the next real selectable frontier.
 * This is what a raycast hit gets resolved UP to (see utils/raycast.ts) and
 * what the left-panel tree treats as "currently drillable".
 */
export function getSelectableFrontier(focusId: string): string[] {
  const focus = anatomyMap[focusId];
  if (!focus) return [];
  const frontier: string[] = [];
  const visit = (childIds: string[]): void => {
    for (const id of childIds) {
      const node = anatomyMap[id];
      if (!node) continue;
      if (node.selectable) {
        frontier.push(id);
      } else {
        visit(node.children);
      }
    }
  };
  visit(focus.children);
  return frontier;
}

/**
 * Structural integrity checks only — logged, not thrown, so one bad node
 * degrades gracefully instead of blanking the whole app. Deliberately does
 * NOT flag nodes with empty `systemTags`: a node with no system tags simply
 * isn't gated by the system-filter toggles (see store/useViewStore.ts) and
 * is always shown — several eye structures (cornea, sclera, iris, pupil,
 * lens, vitreous humor) are legitimately outside the 9-system taxonomy.
 */
function validate(map: AnatomyMap): void {
  if (!map[ROOT_NODE_ID]) {
    console.error(`[anatomy] root node "${ROOT_NODE_ID}" is missing.`);
  }
  for (const node of Object.values(map)) {
    if (node.parentId && !map[node.parentId]) {
      console.error(`[anatomy] "${node.id}" has missing parentId "${node.parentId}".`);
    }
    for (const childId of node.children) {
      if (!map[childId]) {
        console.error(`[anatomy] "${node.id}" lists missing child "${childId}".`);
      }
    }
  }
}

validate(anatomyMap);

export function getNode(id: string): AnatomyNode | undefined {
  return anatomyMap[id];
}
