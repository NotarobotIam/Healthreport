// Upper extremities. BOTH arms carry the full
// shoulder->hand->finger->phalanx/joint drill-down (the product spec calls
// out "Left Arm -> Hand -> Fingers" specifically, but a body with one
// detailed hand and one simplified stump reads as a modelling error, not as
// a scoping decision). One builder generates both sides from identical
// data, mirroring only the camera yaw, so the two arms cannot drift apart —
// the renderer mirrors the geometry the same way, via a single scale-x on
// the arm group (see scene/body/Arm.tsx).
import type { AnatomyNode, AnatomySystem } from '../../types';
import type { Side } from '../../constants/bodyLayout';
import { SIDE_SIGN, armPointWorld } from '../../constants/bodyLayout';
import { frameShot } from '../../utils/math';

const SIDE_LABEL: Record<Side, string> = { left: 'Left', right: 'Right' };

function dataLeaf(base: string, key: string, name: string, tags: AnatomySystem[], ownerLabel: string): AnatomyNode {
  return {
    id: `${base}.${key}`,
    name,
    parentId: base,
    children: [],
    meshIds: [],
    systemTags: tags,
    selectable: false,
    description: `${name} of the ${ownerLabel} — represented as a data reference in this build, not yet individually rendered. A patient-specific scan asset would add real geometry here without changing this node's id.`,
  };
}

const FINGER_LEAVES: Array<[string, string, AnatomySystem[]]> = [
  ['tendon', 'Tendons', ['muscular']],
  ['muscle', 'Muscles', ['muscular']],
  ['nerve', 'Nerves', ['nervous']],
  ['artery', 'Arteries', ['cardiovascular']],
  ['vein', 'Veins', ['cardiovascular']],
  ['skin', 'Skin', ['integumentary']],
];

interface FingerSpec {
  key: string;
  name: string;
  hasMiddle: boolean;
  tipDownDistance: number;
}

const FINGERS: FingerSpec[] = [
  { key: 'thumb', name: 'Thumb', hasMiddle: false, tipDownDistance: 0.67 },
  { key: 'index', name: 'Index Finger', hasMiddle: true, tipDownDistance: 0.735 },
  { key: 'middle', name: 'Middle Finger', hasMiddle: true, tipDownDistance: 0.75 },
  { key: 'ring', name: 'Ring Finger', hasMiddle: true, tipDownDistance: 0.735 },
  { key: 'little', name: 'Pinky Finger', hasMiddle: true, tipDownDistance: 0.705 },
];

function buildFingerDetailed(side: Side, spec: FingerSpec): AnatomyNode[] {
  const base = `body.upperExtremity.${side}.hand.${spec.key}`;
  const label = `${SIDE_LABEL[side].toLowerCase()} ${spec.name.toLowerCase()}`;
  const out: AnatomyNode[] = [];

  out.push({
    id: `${base}.proximalPhalanx`,
    name: 'Proximal Phalanx',
    parentId: base,
    children: [],
    meshIds: [`${base}.proximalPhalanx`],
    systemTags: ['skeletal'],
    selectable: true,
    description: `Proximal phalanx bone of the ${label}.`,
  });
  if (spec.hasMiddle) {
    out.push({
      id: `${base}.middlePhalanx`,
      name: 'Middle Phalanx',
      parentId: base,
      children: [],
      meshIds: [`${base}.middlePhalanx`],
      systemTags: ['skeletal'],
      selectable: true,
      description: `Middle phalanx bone of the ${label}.`,
    });
  }
  out.push({
    id: `${base}.distalPhalanx`,
    name: 'Distal Phalanx',
    parentId: base,
    children: [],
    meshIds: [`${base}.distalPhalanx`],
    systemTags: ['skeletal'],
    selectable: true,
    description: `Distal phalanx bone (fingertip) of the ${label}.`,
  });
  out.push({
    id: `${base}.joints`,
    name: 'Joints',
    parentId: base,
    children: [],
    meshIds: [`${base}.joints`],
    systemTags: ['skeletal'],
    selectable: true,
    description: `Metacarpophalangeal and interphalangeal joints of the ${label}, shown collectively.`,
  });

  for (const [key, name, tags] of FINGER_LEAVES) {
    out.push(dataLeaf(base, key, name, tags, label));
  }

  const fingerNode: AnatomyNode = {
    id: base,
    name: spec.name,
    parentId: `body.upperExtremity.${side}.hand`,
    children: [],
    meshIds: [base],
    systemTags: ['skeletal'],
    selectable: true,
    cameraTarget: frameShot(armPointWorld(side, spec.tipDownDistance - 0.03), 0.13, { pitch: 0.15 }),
    description: `${spec.name}. Independently selectable down to its individual bones and joints.`,
  };
  return [fingerNode, ...out];
}

function buildDetailedArm(side: Side): AnatomyNode[] {
  const label = `${SIDE_LABEL[side]} Arm`;
  const sideWord = SIDE_LABEL[side].toLowerCase();
  // Camera framing is the ONE thing that differs between sides: each arm is
  // shot from its own outboard side, so the yaw mirrors with the limb.
  const yaw = SIDE_SIGN[side];
  const armId = `body.upperExtremity.${side}`;
  const shoulderId = `${armId}.shoulder`;
  const upperArmId = `${armId}.upperArm`;
  const bicepsId = `${armId}.biceps`;
  const tricepsId = `${armId}.triceps`;
  const elbowId = `${armId}.elbow`;
  const forearmId = `${armId}.forearm`;
  const wristId = `${armId}.wrist`;
  const handId = `${armId}.hand`;
  const palmId = `${handId}.palm`;

  const nodes: AnatomyNode[] = [
    {
      id: armId,
      name: label,
      parentId: 'body.upperExtremity',
      children: [],
      meshIds: [],
      systemTags: [],
      selectable: true,
      cameraTarget: frameShot(armPointWorld(side, 0.42), 0.95, { yaw: -0.35 * yaw, pitch: 0.08 }),
      description: `${sideWord.charAt(0).toUpperCase()}${sideWord.slice(1)} upper limb, navigable from shoulder through fingertip.`,
    },
    {
      id: shoulderId,
      name: 'Shoulder',
      parentId: armId,
      children: [],
      meshIds: [shoulderId],
      systemTags: ['skeletal', 'muscular'],
      selectable: true,
      cameraTarget: frameShot(armPointWorld(side, 0), 0.32, { yaw: -0.3 * yaw }),
      description: 'Glenohumeral joint and deltoid region connecting the arm to the torso.',
    },
    {
      id: upperArmId,
      name: 'Upper Arm',
      parentId: armId,
      children: [],
      meshIds: [upperArmId],
      systemTags: ['skeletal'],
      selectable: true,
      cameraTarget: frameShot(armPointWorld(side, 0.14), 0.32, { yaw: -0.3 * yaw }),
      description: 'Humerus, from shoulder to elbow.',
    },
    {
      id: bicepsId,
      name: 'Biceps',
      parentId: armId,
      children: [],
      meshIds: [bicepsId],
      systemTags: ['muscular'],
      selectable: true,
      cameraTarget: frameShot(armPointWorld(side, 0.14), 0.26, { yaw: -0.2 * yaw }),
      description: 'Biceps brachii, anterior compartment of the upper arm.',
    },
    {
      id: tricepsId,
      name: 'Triceps',
      parentId: armId,
      children: [],
      meshIds: [tricepsId],
      systemTags: ['muscular'],
      selectable: true,
      cameraTarget: frameShot(armPointWorld(side, 0.14), 0.26, { yaw: -0.55 * yaw }),
      description: 'Triceps brachii, posterior compartment of the upper arm.',
    },
    {
      id: elbowId,
      name: 'Elbow',
      parentId: armId,
      children: [],
      meshIds: [elbowId],
      systemTags: ['skeletal'],
      selectable: true,
      cameraTarget: frameShot(armPointWorld(side, 0.28), 0.22, { yaw: -0.3 * yaw }),
      description: 'Elbow joint, connecting the humerus to the radius and ulna.',
    },
    {
      id: forearmId,
      name: 'Forearm',
      parentId: armId,
      children: [],
      // Two bones (radius + ulna), one selectable subassembly — the
      // canonical example of "smallest logical subassembly" not being the
      // same thing as "smallest individual mesh".
      meshIds: [`${forearmId}.radius`, `${forearmId}.ulna`],
      systemTags: ['skeletal'],
      selectable: true,
      cameraTarget: frameShot(armPointWorld(side, 0.4), 0.26, { yaw: -0.3 * yaw }),
      description: 'Radius and ulna, from elbow to wrist.',
    },
    {
      id: wristId,
      name: 'Wrist',
      parentId: armId,
      children: [],
      meshIds: [wristId],
      systemTags: ['skeletal'],
      selectable: true,
      cameraTarget: frameShot(armPointWorld(side, 0.53), 0.18, { yaw: -0.3 * yaw }),
      description: 'Carpal region connecting the forearm to the hand.',
    },
    {
      id: handId,
      name: 'Hand',
      parentId: armId,
      children: [],
      meshIds: [],
      systemTags: ['skeletal'],
      selectable: true,
      cameraTarget: frameShot(armPointWorld(side, 0.66), 0.28, { yaw: -0.3 * yaw, pitch: 0.2 }),
      description: `${SIDE_LABEL[side]} hand. Select the palm or an individual finger to continue drilling down.`,
    },
    {
      id: palmId,
      name: 'Palm',
      parentId: handId,
      children: [],
      meshIds: [palmId],
      systemTags: ['skeletal', 'muscular'],
      selectable: true,
      cameraTarget: frameShot(armPointWorld(side, 0.63), 0.16, { yaw: -0.3 * yaw, pitch: 0.2 }),
      description: 'Metacarpal region of the hand, between the wrist and the fingers.',
    },
  ];

  for (const spec of FINGERS) {
    nodes.push(...buildFingerDetailed(side, spec));
  }

  return nodes;
}

export const upperExtremityNodes: AnatomyNode[] = [
  {
    id: 'body.upperExtremity',
    name: 'Upper Extremities',
    parentId: 'body',
    children: [],
    meshIds: [],
    systemTags: [],
    // Organizational grouping only, not an independent raycast target — see
    // hooks/useCurrentSelectableSet.ts, which skips through non-selectable
    // nodes like this one to find the next real selectable frontier (Left
    // Arm / Right Arm).
    selectable: false,
    cameraTarget: frameShot([0, 1.2, 0], 1.6, { pitch: 0.08 }),
    description: 'Both arms, from shoulder to fingertips.',
  },
  ...buildDetailedArm('left'),
  ...buildDetailedArm('right'),
];
