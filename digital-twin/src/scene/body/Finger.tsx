import { useMemo } from 'react';
import * as THREE from 'three';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry } from '../primitives/proceduralGeometry';
import type { Side } from '../../constants/bodyLayout';

interface FingerProps {
  side: Side;
  fingerKey: string;
  /** Position of the MCP joint (where the finger meets the palm), in the arm group's local space. */
  basePosition: [number, number, number];
  hasMiddle: boolean;
}

const RADIUS = 0.0068;
const PROXIMAL_LEN = 0.044;
const MIDDLE_LEN = 0.027;
const DISTAL_LEN = 0.021;
const JOINT_GAP = 0.005;

/**
 * One finger of the flagship left-hand drill-down: proximal/(middle)/distal
 * phalanges plus a single "Joints" marker, each its own SelectableMesh so
 * hovering/selecting one bone never lights up its neighbors — including the
 * neighboring FINGER, since geometry cache keys and node ids are per-finger.
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

  return (
    <group>
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
