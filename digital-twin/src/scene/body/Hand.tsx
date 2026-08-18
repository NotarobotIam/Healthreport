import { useMemo } from 'react';
import * as THREE from 'three';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry } from '../primitives/proceduralGeometry';
import { Finger } from './Finger';
import type { Side } from '../../constants/bodyLayout';

const PALM_CENTER_Y = -0.5675;
const MCP_ROW_Y = -0.615;

interface FingerLayout {
  key: string;
  x: number;
  y: number;
  z: number;
  hasMiddle: boolean;
}

const FINGER_LAYOUT: FingerLayout[] = [
  { key: 'index', x: -0.026, y: MCP_ROW_Y, z: 0, hasMiddle: true },
  { key: 'middle', x: -0.009, y: MCP_ROW_Y - 0.006, z: 0, hasMiddle: true },
  { key: 'ring', x: 0.008, y: MCP_ROW_Y, z: 0, hasMiddle: true },
  { key: 'little', x: 0.023, y: MCP_ROW_Y + 0.008, z: 0, hasMiddle: true },
];

const THUMB_LAYOUT: FingerLayout = { key: 'thumb', x: 0.042, y: MCP_ROW_Y + 0.045, z: 0.018, hasMiddle: false };

/** Left hand of the flagship arm drill-down: palm plus five independently selectable fingers. Coordinates are local to the (already-tilted) Arm group — see scene/body/Arm.tsx. */
export function Hand({ side }: { side: Side }) {
  const palmGeometry = useMemo(() => cachedGeometry('hand.palm', () => new THREE.BoxGeometry(0.075, 0.095, 0.022)), []);

  return (
    <group>
      <SelectableMesh
        nodeId={`body.upperExtremity.${side}.hand.palm`}
        geometry={palmGeometry}
        tissue="bone"
        position={[0, PALM_CENTER_Y, 0]}
      />
      {[...FINGER_LAYOUT, THUMB_LAYOUT].map((finger) => (
        <Finger
          key={finger.key}
          side={side}
          fingerKey={finger.key}
          basePosition={[finger.x, finger.y, finger.z]}
          hasMiddle={finger.hasMiddle}
        />
      ))}
    </group>
  );
}
