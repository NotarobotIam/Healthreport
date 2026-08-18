import { useMemo } from 'react';
import * as THREE from 'three';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry } from '../primitives/proceduralGeometry';
import { BODY } from '../../constants/bodyLayout';
import { Head } from './Head';
import { Torso } from './Torso';
import { AbdomenPelvis } from './AbdomenPelvis';
import { Arm } from './Arm';
import { Leg } from './Leg';

function Neck() {
  const geometry = useMemo(
    () => cachedGeometry('neck.shell', () => new THREE.CylinderGeometry(0.05, 0.058, BODY.neckTopY - BODY.neckBaseY, 20)),
    [],
  );
  return (
    <SelectableMesh
      nodeId="body.neck"
      geometry={geometry}
      tissue="skinScan"
      position={[0, (BODY.neckBaseY + BODY.neckTopY) / 2, 0]}
    />
  );
}

/**
 * Everything in the digital twin is always mounted, at every navigation
 * depth — "drilling in" is purely a camera move (see scene/CameraRig.tsx)
 * plus dimming non-focused regions (see hooks/useAnatomyNode.ts's
 * useNodeEmphasis), never a mount/unmount of scene content. That matches
 * how the reference platform behaves (the whole body is always there, a
 * zoomed panel is just a camera framing) and avoids any risk of the
 * raycast/camera object registry going stale from mount churn.
 */
export function BodyRoot() {
  return (
    <group>
      <Head />
      <Neck />
      <Torso />
      <AbdomenPelvis />
      <Arm side="left" />
      <Arm side="right" />
      <Leg side="left" />
      <Leg side="right" />
    </group>
  );
}
