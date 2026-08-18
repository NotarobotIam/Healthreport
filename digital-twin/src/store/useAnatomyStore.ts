import { create } from 'zustand';
import { anatomyMap, ancestryMap } from '../data/anatomy';
import { ROOT_NODE_ID } from '../types';

interface AnatomyStoreState {
  /** Root-to-focus breadcrumb trail; the last entry is the current navigation focus. */
  navStack: string[];
  hoveredNodeId: string | null;
  expandedNodeIds: Set<string>;
  hoverNode: (nodeId: string | null) => void;
  selectNode: (nodeId: string) => void;
  goToBreadcrumb: (index: number) => void;
  goBack: () => void;
  resetToRoot: () => void;
  toggleExpanded: (nodeId: string) => void;
}

function pathTo(nodeId: string): string[] {
  const chain = ancestryMap.get(nodeId) ?? [];
  return [...chain, nodeId];
}

export const useAnatomyStore = create<AnatomyStoreState>((set, get) => ({
  navStack: [ROOT_NODE_ID],
  hoveredNodeId: null,
  expandedNodeIds: new Set([ROOT_NODE_ID]),

  hoverNode: (nodeId) => {
    // No-op guard: without this, moving the cursor between two meshes that
    // resolve to the SAME subassembly (e.g. the radius and ulna meshes,
    // both resolving to "forearm") fires spurious over/out churn on every
    // pointer-move as the raycast hits first one mesh, then the other.
    if (get().hoveredNodeId === nodeId) return;
    set({ hoveredNodeId: nodeId });
  },

  selectNode: (nodeId) => {
    if (!anatomyMap[nodeId]) return;
    const stack = pathTo(nodeId);
    set((state) => ({
      navStack: stack,
      hoveredNodeId: null,
      expandedNodeIds: new Set([...state.expandedNodeIds, ...stack]),
    }));
  },

  goToBreadcrumb: (index) => {
    set((state) => ({
      navStack: state.navStack.slice(0, index + 1),
      hoveredNodeId: null,
    }));
  },

  goBack: () => {
    set((state) =>
      state.navStack.length > 1
        ? { navStack: state.navStack.slice(0, -1), hoveredNodeId: null }
        : state,
    );
  },

  resetToRoot: () => set({ navStack: [ROOT_NODE_ID], hoveredNodeId: null }),

  toggleExpanded: (nodeId) => {
    set((state) => {
      const next = new Set(state.expandedNodeIds);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return { expandedNodeIds: next };
    });
  },
}));

/** `navStack` always has at least the root, so this is total. */
export function selectedNodeIdSelector(state: AnatomyStoreState): string {
  return state.navStack[state.navStack.length - 1] ?? ROOT_NODE_ID;
}
