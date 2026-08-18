// Lower extremities — generic branch (see upperExtremity.ts for the
// flagship/generic split rationale). Toes ARE individually selectable, but
// with single-segment placeholder geometry rather than the fingers' full
// phalanx+joint treatment: a deliberate, visible contrast between the
// flagship and generic branches rather than an oversight.
import type { AnatomyNode } from '../../types';
import type { Side } from '../../constants/bodyLayout';
import { legPointWorld } from '../../constants/bodyLayout';
import { frameShot } from '../../utils/math';

const SIDE_LABEL: Record<Side, string> = { left: 'Left', right: 'Right' };

const TOES: Array<{ key: string; name: string }> = [
  { key: 'bigToe', name: 'Big Toe' },
  { key: 'secondToe', name: 'Second Toe' },
  { key: 'thirdToe', name: 'Third Toe' },
  { key: 'fourthToe', name: 'Fourth Toe' },
  { key: 'littleToe', name: 'Little Toe' },
];

function buildLeg(side: Side): AnatomyNode[] {
  const label = `${SIDE_LABEL[side]} Leg`;
  const legId = `body.lowerExtremity.${side}`;
  const thighId = `${legId}.thigh`;
  const kneeId = `${legId}.knee`;
  const shinId = `${legId}.shin`;
  const ankleId = `${legId}.ankle`;
  const footId = `${legId}.foot`;

  const nodes: AnatomyNode[] = [
    {
      id: legId,
      name: label,
      parentId: 'body.lowerExtremity',
      children: [],
      meshIds: [],
      systemTags: [],
      selectable: true,
      cameraTarget: frameShot(legPointWorld(side, 0.35), 1.0, { pitch: 0.05 }),
      description: `${label}, from hip to toes. Shown in generic/simplified form in this build.`,
    },
    {
      id: thighId,
      name: 'Thigh',
      parentId: legId,
      children: [],
      meshIds: [thighId],
      systemTags: ['muscular'],
      selectable: true,
      description: `${label} thigh (femur and surrounding muscle).`,
    },
    {
      id: kneeId,
      name: 'Knee',
      parentId: legId,
      children: [],
      meshIds: [kneeId],
      systemTags: ['skeletal'],
      selectable: true,
      description: `${label} knee joint.`,
    },
    {
      id: shinId,
      name: 'Shin',
      parentId: legId,
      children: [],
      meshIds: [shinId],
      systemTags: ['skeletal'],
      selectable: true,
      description: `${label} shin (tibia and fibula).`,
    },
    {
      id: ankleId,
      name: 'Ankle',
      parentId: legId,
      children: [],
      meshIds: [ankleId],
      systemTags: ['skeletal'],
      selectable: true,
      description: `${label} ankle joint.`,
    },
    {
      id: footId,
      name: 'Foot',
      parentId: legId,
      children: [],
      meshIds: [footId],
      systemTags: ['skeletal'],
      selectable: true,
      cameraTarget: frameShot(legPointWorld(side, 0.78), 0.3, { pitch: 0.25 }),
      description: `${label} foot. Select an individual toe to continue drilling down.`,
    },
  ];

  for (const toe of TOES) {
    nodes.push({
      id: `${footId}.${toe.key}`,
      name: toe.name,
      parentId: footId,
      children: [],
      meshIds: [`${footId}.${toe.key}`],
      systemTags: ['skeletal'],
      selectable: true,
      description: `${toe.name} of the ${label.toLowerCase()}, shown as a single simplified segment in this build (contrast with the fully-detailed fingers).`,
    });
  }

  return nodes;
}

export const lowerExtremityNodes: AnatomyNode[] = [
  {
    id: 'body.lowerExtremity',
    name: 'Lower Extremities',
    parentId: 'body',
    children: [],
    meshIds: [],
    systemTags: [],
    selectable: false,
    cameraTarget: frameShot([0, 0.5, 0], 1.8, { pitch: 0.05 }),
    description: 'Both legs, from hip to toes.',
  },
  ...buildLeg('left'),
  ...buildLeg('right'),
];
