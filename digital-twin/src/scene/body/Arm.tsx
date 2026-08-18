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
  const shoulderGeometry = useMemo(() => cachedGeometry('arm.shoulder', () => new THREE.SphereGeometry(0.052, 16, 12)), []);
  const upperArmGeometry = useMemo(
    () => cachedGeometry('arm.generic.upperArm', () => new THREE.CylinderGeometry(0.027, 0.023, ARM.upperArmLength * 0.94, 12)),
    [],
  );
  const forearmGeometry = useMemo(
    () => cachedGeometry('arm.generic.forearm', () => new THREE.CylinderGeometry(0.019, 0.015, ARM.forearmLength * 0.94, 12)),
    [],
  );
  const handGeometry = useMemo(
    () => cachedGeometry('arm.generic.hand', () => new THREE.CapsuleGeometry(0.023, ARM.handLength * 0.6, 3, 8)),
    [],
  );

  const handCenterY = -(ARM.upperArmLength + ARM.elbowGap + ARM.forearmLength + ARM.wristGap) - ARM.handLength / 2;

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
      <SelectableMesh
        nodeId={`body.upperExtremity.${side}.hand`}
        geometry={handGeometry}
        tissue="bone"
        position={[0, handCenterY, 0]}
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
