import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CameraControls as DreiCameraControls } from '@react-three/drei';
import type CameraControls from 'camera-controls';
import { useAnatomyStore, selectedNodeIdSelector } from '../store/useAnatomyStore';
import { anatomyMap } from '../data/anatomy';
import { getObjectForNodeId } from '../utils/raycast';
import { setActiveCameraControls } from '../hooks/useCameraTransition';

const FIT_PADDING = { paddingLeft: 0.4, paddingRight: 0.4, paddingTop: 0.4, paddingBottom: 0.4 };

/**
 * The whole app's camera navigation in one place: every node selection
 * (click-to-zoom, breadcrumb-back, tree-panel click — they all just change
 * `selectedNodeId`) resolves here to either a hand-authored `cameraTarget`
 * shot, or — for every node that doesn't have one — a live `fitToBox`
 * against that node's actually-rendered geometry (see utils/raycast.ts's
 * object registry). "Going back" is not a special case: it's the exact
 * same effect reacting to the same state changing in the other direction.
 */
export function CameraRig() {
  const controlsRef = useRef<CameraControls>(null);
  const selectedNodeId = useAnatomyStore(selectedNodeIdSelector);

  useEffect(() => {
    setActiveCameraControls(controlsRef.current);
    return () => setActiveCameraControls(null);
  }, []);

  useEffect(() => {
    const controls = controlsRef.current;
    const node = anatomyMap[selectedNodeId];
    if (!controls || !node) return;

    // Defensive: a camera move should never be able to crash the app (an
    // uncaught throw here, inside a useEffect with no error boundary above
    // it, would take down the whole React tree on what's otherwise just a
    // failed animation). Worst case on error: the camera simply doesn't move.
    try {
      if (node.cameraTarget) {
        const { position, target } = node.cameraTarget;
        controls.setLookAt(position[0], position[1], position[2], target[0], target[1], target[2], true);
        return;
      }

      const liveObject = getObjectForNodeId(selectedNodeId);
      if (liveObject) {
        // Computing the Box3 ourselves (rather than passing the Object3D
        // straight to fitToBox) sidesteps any doubt about exactly which
        // overloads fitToBox accepts.
        const box = new THREE.Box3().setFromObject(liveObject);
        if (!box.isEmpty()) {
          controls.fitToBox(box, true, FIT_PADDING);
        }
      }
    } catch (error) {
      console.error('[CameraRig] failed to move camera for node', selectedNodeId, error);
    }
  }, [selectedNodeId]);

  return (
    // minDistance is deliberately far below any real content distance
    // (down to the eye's "fly inside the globe toward the retina" shot,
    // camera-to-target ~R*1.15 ~= 0.0138 world units) — camera-controls
    // clamps setLookAt's resulting distance to this floor, so a
    // too-large minDistance would silently break that shot.
    <DreiCameraControls ref={controlsRef} minDistance={0.005} maxDistance={6} dollyToCursor smoothTime={0.5} />
  );
}
