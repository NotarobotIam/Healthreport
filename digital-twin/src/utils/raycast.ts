import type { Object3D } from 'three';

/**
 * Runtime mesh <-> anatomy-node bookkeeping. Deliberately NOT part of the
 * Zustand stores: it's imperative, populated by mount/unmount effects on
 * every `SelectableMesh`, and read synchronously during pointer events and
 * camera framing — putting it in React state would cause a render on every
 * mount/unmount of every anatomical mesh for no benefit.
 */
const meshUuidToNodeId = new Map<string, string>();
const nodeIdToObject = new Map<string, Object3D>();

export function registerSelectableMesh(uuid: string, nodeId: string, object: Object3D): void {
  meshUuidToNodeId.set(uuid, nodeId);
  nodeIdToObject.set(nodeId, object);
}

export function unregisterSelectableMesh(uuid: string, nodeId: string): void {
  meshUuidToNodeId.delete(uuid);
  // Only clear the nodeId->object entry if it still points at THIS object —
  // React StrictMode double-invokes mount/unmount effects in dev, which
  // would otherwise let a stale unmount delete a fresher registration.
  if (nodeIdToObject.get(nodeId)?.uuid === uuid) {
    nodeIdToObject.delete(nodeId);
  }
}

export function getNodeIdForMeshUuid(uuid: string): string | undefined {
  return meshUuidToNodeId.get(uuid);
}

/** Live Object3D for a node, used by CameraRig's `fitToBox` fallback when a node has no authored `cameraTarget`. */
export function getObjectForNodeId(nodeId: string): Object3D | undefined {
  return nodeIdToObject.get(nodeId);
}

/**
 * Resolves a raw raycast hit to "the smallest logical anatomical
 * subassembly under the cursor" for the CURRENT navigation depth: if the
 * exact mesh hit is itself in the current selectable set, use it; otherwise
 * walk its precomputed ancestor chain outward until one member of that
 * chain is in the current selectable set. Deliberately walks the DATA
 * ancestry chain, not `object.parent` — how many plain Three.js `<group>`
 * wrappers a mesh happens to sit inside is irrelevant.
 */
export function resolveSelectableAncestor(
  hitNodeId: string,
  currentSelectableIds: ReadonlySet<string> | readonly string[],
  ancestryMap: ReadonlyMap<string, string[]>,
): string | null {
  const selectable = currentSelectableIds instanceof Set ? currentSelectableIds : new Set(currentSelectableIds);
  if (selectable.has(hitNodeId)) return hitNodeId;
  const chain = ancestryMap.get(hitNodeId);
  if (!chain) return null;
  for (let i = chain.length - 1; i >= 0; i--) {
    if (selectable.has(chain[i])) return chain[i];
  }
  return null;
}
