// Upper extremities. The LEFT arm is the flagship drill-down (full
// shoulder->hand->finger->phalanx/joint detail, per the product spec's
// "Left Arm -> Hand -> Fingers" demonstration). The RIGHT arm is a
// deliberately generic mirror (see buildGenericArm) so the whole body stays
// navigable without doubling the authoring/geometry effort — this contrast
// is intentional, not an oversight (see the build plan's "trims" section).
import type { AnatomyNode, AnatomySystem } from '../../types';
import type { Side } from '../../constants/bodyLayout';
import { armPointWorld } from '../../constants/bodyLayout';
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

const LEFT_FINGERS: FingerSpec[] = [
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

function buildDetailedLeftArm(): AnatomyNode[] {
  const side: Side = 'left';
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
      name: 'Left Arm',
      parentId: 'body.upperExtremity',
      children: [],
      meshIds: [],
      systemTags: [],
      selectable: true,
      cameraTarget: frameShot(armPointWorld(side, 0.42), 0.95, { yaw: -0.35, pitch: 0.08 }),
      description: 'Left upper limb. The flagship drill-down of this build: shoulder through fingertip.',
    },
    {
      id: shoulderId,
      name: 'Shoulder',
      parentId: armId,
      children: [],
      meshIds: [shoulderId],
      systemTags: ['skeletal', 'muscular'],
      selectable: true,
      cameraTarget: frameShot(armPointWorld(side, 0), 0.32, { yaw: -0.3 }),
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
      cameraTarget: frameShot(armPointWorld(side, 0.14), 0.32, { yaw: -0.3 }),
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
      cameraTarget: frameShot(armPointWorld(side, 0.14), 0.26, { yaw: -0.2 }),
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
      cameraTarget: frameShot(armPointWorld(side, 0.14), 0.26, { yaw: -0.55 }),
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
      cameraTarget: frameShot(armPointWorld(side, 0.28), 0.22, { yaw: -0.3 }),
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
      cameraTarget: frameShot(armPointWorld(side, 0.4), 0.26, { yaw: -0.3 }),
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
      cameraTarget: frameShot(armPointWorld(side, 0.53), 0.18, { yaw: -0.3 }),
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
      cameraTarget: frameShot(armPointWorld(side, 0.66), 0.28, { yaw: -0.3, pitch: 0.2 }),
      description: 'Left hand. Select the palm or an individual finger to continue drilling down.',
    },
    {
      id: palmId,
      name: 'Palm',
      parentId: handId,
      children: [],
      meshIds: [palmId],
      systemTags: ['skeletal', 'muscular'],
      selectable: true,
      cameraTarget: frameShot(armPointWorld(side, 0.63), 0.16, { yaw: -0.3, pitch: 0.2 }),
      description: 'Metacarpal region of the hand, between the wrist and the fingers.',
    },
  ];

  for (const spec of LEFT_FINGERS) {
    nodes.push(...buildFingerDetailed(side, spec));
  }

  return nodes;
}

function buildGenericArm(side: Side): AnatomyNode[] {
  const label = `${SIDE_LABEL[side]} Arm`;
  const armId = `body.upperExtremity.${side}`;
  const shoulderId = `${armId}.shoulder`;
  const upperArmId = `${armId}.upperArm`;
  const forearmId = `${armId}.forearm`;
  const handId = `${armId}.hand`;

  return [
    {
      id: armId,
      name: label,
      parentId: 'body.upperExtremity',
      children: [],
      meshIds: [],
      systemTags: [],
      selectable: true,
      cameraTarget: frameShot(armPointWorld(side, 0.42), 0.95, { yaw: 0.35, pitch: 0.08 }),
      description: `${label}. Shown in simplified form in this build — the left arm has the fully detailed shoulder-to-fingertip drill-down.`,
    },
    {
      id: shoulderId,
      name: 'Shoulder',
      parentId: armId,
      children: [],
      meshIds: [shoulderId],
      systemTags: ['skeletal', 'muscular'],
      selectable: true,
      description: `${label} shoulder (deltoid / glenohumeral region).`,
    },
    {
      id: upperArmId,
      name: 'Upper Arm',
      parentId: armId,
      children: [],
      meshIds: [upperArmId],
      systemTags: ['muscular'],
      selectable: true,
      description: `${label} upper arm (humerus and surrounding muscle).`,
    },
    {
      id: forearmId,
      name: 'Forearm',
      parentId: armId,
      children: [],
      meshIds: [forearmId],
      systemTags: ['skeletal'],
      selectable: true,
      description: `${label} forearm (radius and ulna).`,
    },
    {
      id: handId,
      name: 'Hand',
      parentId: armId,
      children: [],
      meshIds: [handId],
      systemTags: ['skeletal'],
      selectable: true,
      description: `${label} hand, shown as a single structure in this build.`,
    },
  ];
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
  ...buildDetailedLeftArm(),
  ...buildGenericArm('right'),
];
