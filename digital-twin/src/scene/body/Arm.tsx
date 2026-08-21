import { useMemo } from 'react';
import * as THREE from 'three';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry } from '../primitives/proceduralGeometry';
import { Hand } from './Hand';
import type { Side } from '../../constants/bodyLayout';
import { ARM, SIDE_SIGN, shoulderPosition } from '../../constants/bodyLayout';

const upperArmCenterY = -ARM.upperArmLength / 2;
const elbowY = -ARM.upperArmLength;
const forearmStartY = -(ARM.upperArmLength + ARM.elbowGap);
const forearmCenterY = forearmStartY - ARM.forearmLength / 2;
const wristY = -(ARM.upperArmLength + ARM.elbowGap + ARM.forearmLength);

/**
 * The fully-detailed left arm: shoulder -> upper arm (+ biceps/triceps as
 * separate muscle nodes) -> elbow -> forearm (radius + ulna, ONE
 * selectable node rendered as two meshes — see the double SelectableMesh
 * below) -> wrist -> hand/fingers.
 */
function DetailedLeftArm() {
  const side: Side = 'left';

  const shoulderGeometry = useMemo(() => cachedGeometry('arm.shoulder', () => new THREE.SphereGeometry(0.052, 16, 12)), []);
  const upperArmGeometry = useMemo(
    () => cachedGeometry('arm.upperArm', () => new THREE.CylinderGeometry(0.023, 0.02, ARM.upperArmLength * 0.9, 14)),
    [],
  );
  const bicepsGeometry = useMemo(
    () => cachedGeometry('arm.biceps', () => new THREE.CapsuleGeometry(0.025, ARM.upperArmLength * 0.5, 3, 10)),
    [],
  );
  const tricepsGeometry = useMemo(
    () => cachedGeometry('arm.triceps', () => new THREE.CapsuleGeometry(0.023, ARM.upperArmLength * 0.55, 3, 10)),
    [],
  );
  const elbowGeometry = useMemo(() => cachedGeometry('arm.elbow', () => new THREE.SphereGeometry(0.026, 14, 10)), []);
  const radiusGeometry = useMemo(
    () => cachedGeometry('arm.radius', () => new THREE.CylinderGeometry(0.013, 0.011, ARM.forearmLength * 0.92, 12)),
    [],
  );
  const ulnaGeometry = useMemo(
    () => cachedGeometry('arm.ulna', () => new THREE.CylinderGeometry(0.012, 0.011, ARM.forearmLength * 0.95, 12)),
    [],
  );
  const wristGeometry = useMemo(() => cachedGeometry('arm.wrist', () => new THREE.SphereGeometry(0.02, 14, 10)), []);

  return (
    <group>
      <SelectableMesh nodeId="body.upperExtremity.left.shoulder" geometry={shoulderGeometry} tissue="bone" position={[0, 0, 0]} />
      <SelectableMesh
        nodeId="body.upperExtremity.left.upperArm"
        geometry={upperArmGeometry}
        tissue="bone"
        position={[0, upperArmCenterY, 0]}
      />
      <SelectableMesh
        nodeId="body.upperExtremity.left.biceps"
        geometry={bicepsGeometry}
        tissue="muscle"
        position={[0, upperArmCenterY, 0.019]}
      />
      <SelectableMesh
        nodeId="body.upperExtremity.left.triceps"
        geometry={tricepsGeometry}
        tissue="muscle"
        position={[0, upperArmCenterY, -0.019]}
      />
      <SelectableMesh nodeId="body.upperExtremity.left.elbow" geometry={elbowGeometry} tissue="joint" position={[0, elbowY, 0]} />
      {/* "Forearm" is one selectable subassembly rendered from two bones (radius + ulna) — hovering/selecting either highlights both, since both meshes share the same nodeId. */}
      <SelectableMesh
        nodeId="body.upperExtremity.left.forearm"
        geometry={radiusGeometry}
        tissue="bone"
        position={[0.009, forearmCenterY, 0.006]}
      />
      <SelectableMesh
        nodeId="body.upperExtremity.left.forearm"
        geometry={ulnaGeometry}
        tissue="bone"
        position={[-0.008, forearmCenterY, -0.005]}
      />
      <SelectableMesh nodeId="body.upperExtremity.left.wrist" geometry={wristGeometry} tissue="joint" position={[0, wristY, 0]} />
      <Hand side={side} />
    </group>
  );
}

/** Simplified mirror for the right arm — see upperExtremity.ts data file for the flagship/generic rationale. */
function GenericArm({ side }: { side: Side }) {
  const mirror = SIDE_SIGN[side];
  const shoulderGeometry = useMemo(() => cachedGeometry('arm.shoulder', () => new THREE.SphereGeometry(0.052, 16, 12)), []);
  const upperArmGeometry = useMemo(
    () => cachedGeometry('arm.generic.upperArm', () => new THREE.CylinderGeometry(0.027, 0.023, ARM.upperArmLength * 0.94, 12)),
    [],
  );
  const forearmGeometry = useMemo(
    () => cachedGeometry('arm.generic.forearm', () => new THREE.CylinderGeometry(0.019, 0.015, ARM.forearmLength * 0.94, 12)),
    [],
  );
  const palmGeometry = useMemo(
    () => cachedGeometry('arm.generic.hand.palm', () => new THREE.BoxGeometry(0.062, 0.04, 0.018)),
    [],
  );
  const fingerGeometry = useMemo(
    () => cachedGeometry('arm.generic.hand.finger', () => new THREE.CapsuleGeometry(0.0075, 0.05, 3, 6)),
    [],
  );
  const thumbGeometry = useMemo(
    () => cachedGeometry('arm.generic.hand.thumb', () => new THREE.CapsuleGeometry(0.0085, 0.032, 3, 6)),
    [],
  );

  const handTopY = -(ARM.upperArmLength + ARM.elbowGap + ARM.forearmLength + ARM.wristGap);
  const palmCenterY = handTopY - 0.02;
  const fingerBaseY = handTopY - 0.04;
  const fingerCenterY = fingerBaseY - 0.025;
  const handId = `body.upperExtremity.${side}.hand`;

  return (
    <group>
      <SelectableMesh nodeId={`body.upperExtremity.${side}.shoulder`} geometry={shoulderGeometry} tissue="bone" position={[0, 0, 0]} />
      <SelectableMesh
        nodeId={`body.upperExtremity.${side}.upperArm`}
        geometry={upperArmGeometry}
        tissue="muscle"
        position={[0, upperArmCenterY, 0]}
      />
      <SelectableMesh
        nodeId={`body.upperExtremity.${side}.forearm`}
        geometry={forearmGeometry}
        tissue="bone"
        position={[0, forearmCenterY, 0]}
      />
      {/*
        Hand: a palm plus five fingers, all sharing one nodeId — same "one
        selectable subassembly, several meshes" pattern as the detailed left
        arm's forearm (radius+ulna). The right hand stays a single
        selectable node in this build (matching its one AnatomyNode entry in
        upperExtremity.ts), it just isn't a featureless capsule anymore.
      */}
      <SelectableMesh nodeId={handId} geometry={palmGeometry} tissue="bone" position={[0, palmCenterY, 0]} />
      {[-0.021, -0.007, 0.007, 0.021].map((x) => (
        <SelectableMesh
          key={x}
          nodeId={handId}
          geometry={fingerGeometry}
          tissue="bone"
          position={[x * mirror, fingerCenterY, 0]}
        />
      ))}
      <SelectableMesh
        nodeId={handId}
        geometry={thumbGeometry}
        tissue="bone"
        position={[0.032 * mirror, fingerBaseY + 0.008, 0.016]}
      />
    </group>
  );
}

export function Arm({ side }: { side: Side }) {
  return (
    <group position={shoulderPosition(side)} rotation={[0, 0, SIDE_SIGN[side] * ARM.tiltRad]}>
      {side === 'left' ? <DetailedLeftArm /> : <GenericArm side={side} />}
    </group>
  );
}
