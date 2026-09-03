// Core anatomy data model.
//
// This describes STRUCTURE only (what exists and how it nests). Time-varying
// PHYSIOLOGICAL state lives separately in `physiology.ts` and is joined to a
// node only via the optional `physiologyKey` below — see types/index.ts for
// why the two domains are kept apart.

export type AnatomySystem =
  | 'skeletal'
  | 'muscular'
  | 'cardiovascular'
  | 'nervous'
  | 'respiratory'
  | 'digestive'
  | 'endocrine'
  | 'lymphatic'
  | 'integumentary';

/** Camera position/look-at pair used to fly to a node on selection. */
export interface CameraTarget {
  position: [number, number, number];
  target: [number, number, number];
}

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
}

export interface AnatomyNode {
  id: string;
  name: string;
  /** undefined only for the single root node. */
  parentId?: string;
  children: string[];
  /**
   * Logical mesh identifiers this node owns. In this build these are just
   * documentation (geometry is built procedurally, one React component per
   * node id — see scene/primitives/SelectableMesh.tsx). When real GLTF scan
   * assets replace the procedural builders, these become the literal named
   * meshes to pull out of the imported scene graph.
   */
  meshIds: string[];
  systemTags: AnatomySystem[];
  /** Hand-authored close-up shot. Nodes without one fall back to fitting the camera to `boundingBox`. */
  cameraTarget?: CameraTarget;
  /** Whether this node can ever be a click target (independent of current nav depth). */
  selectable: boolean;
  boundingBox?: BoundingBox;
  description?: string;
  /** Optional key into PhysiologyFrame.bodyRegions for the right-panel physiology placeholder. */
  physiologyKey?: string;
  /**
   * Present only in one anatomy (uterus, ovaries, prostate, breasts).
   * Undefined means the node is common to both. Nodes for the other sex
   * stay in the map but are filtered out of the tree and never rendered —
   * see components/layout/LeftPanel.tsx and primitives/SelectableMesh.tsx.
   */
  sexSpecific?: 'male' | 'female';
}

export type AnatomyMap = Record<string, AnatomyNode>;

export const ROOT_NODE_ID = 'body';
