import { useMemo } from 'react';
import * as THREE from 'three';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry } from '../primitives/proceduralGeometry';
import { buildProfiledForm } from '../primitives/anatomicalForms';
import type { Side } from '../../constants/bodyLayout';

interface FingerProps {
  side: Side;
  fingerKey: string;
  /** Position of the MCP joint (where the finger meets the palm), in the arm group's local space. */
  basePosition: [number, number, number];
  hasMiddle: boolean;
}

const RADIUS = 0.0058;
const PROXIMAL_LEN = 0.044;
const MIDDLE_LEN = 0.027;
const DISTAL_LEN = 0.021;
const JOINT_GAP = 0.005;

/**
 * One finger: a translucent skin sheath over its phalanges, rather than
 * bare bones floating in space. The sheath is a single tapered form running
 * the whole finger with slight swells at the knuckles — fingers read as
 * continuous soft tissue, not as a chain of separate segments, even though
 * the bones inside stay individually selectable.
 *
 * The sheath carries the FINGER's node id while the bones inside carry
 * their own phalanx ids, so hovering the finger selects the finger, and
 * drilling into it exposes the individual bones underneath — the same
 * layering the limbs use.
 */
export function Finger({ side, fingerKey, basePosition, hasMiddle }: FingerProps) {
  const base = `body.upperExtremity.${side}.hand.${fingerKey}`;
  const [bx, by, bz] = basePosition;

  const proximalGeometry = useMemo(
    () => cachedGeometry('finger.proximal', () => new THREE.CapsuleGeometry(RADIUS, PROXIMAL_LEN, 3, 6)),
    [],
  );
  const middleGeometry = useMemo(
    () => cachedGeometry('finger.middle', () => new THREE.CapsuleGeometry(RADIUS * 0.9, MIDDLE_LEN, 3, 6)),
    [],
  );
  const distalGeometry = useMemo(
    () => cachedGeometry('finger.distal', () => new THREE.CapsuleGeometry(RADIUS * 0.8, DISTAL_LEN, 3, 6)),
    [],
  );
  const jointGeometry = useMemo(
    () => cachedGeometry('finger.joint', () => new THREE.SphereGeometry(RADIUS * 1.1, 8, 6)),
    [],
  );

  const mcpY = by;
  const proximalCenterY = mcpY - PROXIMAL_LEN / 2;
  const afterProximalY = mcpY - PROXIMAL_LEN - JOINT_GAP;

  const middleCenterY = hasMiddle ? afterProximalY - MIDDLE_LEN / 2 : null;
  const afterMiddleY = hasMiddle ? afterProximalY - MIDDLE_LEN - JOINT_GAP : afterProximalY;

  const distalCenterY = afterMiddleY - DISTAL_LEN / 2;
  const tipY = afterMiddleY - DISTAL_LEN;

  // One sheath geometry per finger LENGTH class (with vs. without a middle
  // phalanx), not per finger — four fingers share a single cached geometry.
  const skinGeometry = useMemo(
    () =>
      cachedGeometry(`finger.skin.${hasMiddle ? 'long' : 'short'}`, () =>
        buildProfiledForm({
          topY: 0,
          bottomY: tipY - mcpY - 0.004,
          profile: [
            { t: 0, rx: 0.0092, rz: 0.0085 }, // knuckle
            { t: 0.22, rx: 0.0086, rz: 0.008 },
            { t: 0.46, rx: 0.0082, rz: 0.0076 }, // PIP joint swell
            { t: 0.7, rx: 0.0075, rz: 0.007 },
            { t: 0.88, rx: 0.0069, rz: 0.0064 },
            { t: 1, rx: 0.0042, rz: 0.0039 }, // fingertip
          ],
          radialSegments: 14,
          slices: 16,
        }),
      ),
    [hasMiddle, tipY, mcpY],
  );

  return (
    <group>
      <SelectableMesh nodeId={base} geometry={skinGeometry} tissue="skinScan" position={[bx, mcpY, bz]} />

      <SelectableMesh
        nodeId={`${base}.proximalPhalanx`}
        geometry={proximalGeometry}
        tissue="bone"
        position={[bx, proximalCenterY, bz]}
      />
      {hasMiddle && middleCenterY !== null && (
        <SelectableMesh
          nodeId={`${base}.middlePhalanx`}
          geometry={middleGeometry}
          tissue="bone"
          position={[bx, middleCenterY, bz]}
        />
      )}
      <SelectableMesh
        nodeId={`${base}.distalPhalanx`}
        geometry={distalGeometry}
        tissue="bone"
        position={[bx, distalCenterY, bz]}
      />
      <SelectableMesh nodeId={`${base}.joints`} geometry={jointGeometry} tissue="joint" position={[bx, mcpY, bz]} />
    </group>
  );
}
