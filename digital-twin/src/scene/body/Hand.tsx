import { useMemo } from 'react';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry } from '../primitives/proceduralGeometry';
import { buildProfiledForm, buildTubeThrough } from '../primitives/anatomicalForms';
import { mergeAll } from '../primitives/organForms';
import { Finger } from './Finger';
import { PALM_PROFILE } from '../../constants/bodyProfile';
import type { Side } from '../../constants/bodyLayout';

const PALM_TOP_Y = -0.525;
const PALM_BOTTOM_Y = -0.615;
const MCP_ROW_Y = -0.615;

interface FingerLayout {
  key: string;
  x: number;
  y: number;
  z: number;
  hasMiddle: boolean;
}

/**
 * Finger roots, splayed and staggered the way a real hand's knuckle line
 * is (the middle finger sits proud, the little finger sits back and high).
 */
const FINGER_LAYOUT: FingerLayout[] = [
  { key: 'index', x: -0.026, y: MCP_ROW_Y, z: 0.001, hasMiddle: true },
  { key: 'middle', x: -0.009, y: MCP_ROW_Y - 0.006, z: 0.002, hasMiddle: true },
  { key: 'ring', x: 0.008, y: MCP_ROW_Y - 0.002, z: 0.001, hasMiddle: true },
  { key: 'little', x: 0.024, y: MCP_ROW_Y + 0.008, z: -0.001, hasMiddle: true },
];

const THUMB_LAYOUT: FingerLayout = { key: 'thumb', x: 0.042, y: MCP_ROW_Y + 0.048, z: 0.02, hasMiddle: false };

/**
 * Palm as a lofted wedge (widening toward the knuckles, flattened
 * front-to-back) with the metacarpal bones inside it, rather than the box
 * it used to be. Identical geometry serves both hands — the arm group
 * mirrors it, so the two hands are exact reflections by construction.
 */
export function Hand({ side }: { side: Side }) {
  const palmGeometry = useMemo(
    () =>
      cachedGeometry('hand.palm', () =>
        buildProfiledForm({
          topY: PALM_TOP_Y,
          bottomY: PALM_BOTTOM_Y,
          profile: PALM_PROFILE,
          radialSegments: 18,
          slices: 10,
        }),
      ),
    [],
  );

  const metacarpalGeometry = useMemo(
    () =>
      cachedGeometry('hand.metacarpals', () =>
        mergeAll(
          FINGER_LAYOUT.map((finger) =>
            buildTubeThrough(
              [
                [finger.x * 0.45, PALM_TOP_Y + 0.004, 0],
                [finger.x, finger.y + 0.004, finger.z],
              ],
              0.0045,
              { radialSegments: 6, tubularSegments: 6 },
            ),
          ),
        ),
      ),
    [],
  );

  return (
    <group>
      <SelectableMesh nodeId={`body.upperExtremity.${side}.hand.palm`} geometry={palmGeometry} tissue="skinScan" />
      <SelectableMesh nodeId={`body.upperExtremity.${side}.hand.palm`} geometry={metacarpalGeometry} tissue="bone" />
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
