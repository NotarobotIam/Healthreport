// Generic torso/abdomen/pelvis organs and the brain. Heart and lungs get a
// little more care than the rest (they're the mocked-4D-physiology
// showcase — see data/physiology/mockGenerator.ts) but none of this branch
// attempts the flagship-level detail of the arm or eye.
import type { AnatomyNode } from '../../types';
import { BODY, hipPosition } from '../../constants/bodyLayout';
import { frameShot } from '../../utils/math';
import type { Side } from '../../constants/bodyLayout';

const SIDE_LABEL: Record<Side, string> = { left: 'Left', right: 'Right' };

export const torsoOrgansNodes: AnatomyNode[] = [
  {
    id: 'body.head.brain',
    name: 'Brain',
    parentId: 'body.head',
    children: [],
    meshIds: ['body.head.brain'],
    systemTags: ['nervous'],
    selectable: true,
    cameraTarget: frameShot([0, BODY.headCenterY + 0.01, 0], 0.26, { pitch: 0.1 }),
    description: 'Central nervous system control center, shown as a single simplified structure in this build.',
  },
  {
    id: 'body.torso.ribcage',
    name: 'Rib Cage',
    parentId: 'body.torso',
    children: [],
    meshIds: ['body.torso.ribcage'],
    systemTags: ['skeletal'],
    selectable: true,
    description: 'Bony thoracic cage protecting the heart and lungs.',
  },
  {
    id: 'body.torso.spine',
    name: 'Thoracic Spine',
    parentId: 'body.torso',
    children: [],
    meshIds: ['body.torso.spine'],
    systemTags: ['skeletal'],
    selectable: true,
    description: 'Thoracic portion of the vertebral column.',
  },
  {
    id: 'body.torso.heart',
    name: 'Heart',
    parentId: 'body.torso',
    children: [],
    meshIds: ['body.torso.heart'],
    systemTags: ['cardiovascular'],
    selectable: true,
    cameraTarget: frameShot([0.02, BODY.chestCenterY + 0.02, 0.03], 0.2, { pitch: 0.1 }),
    physiologyKey: 'heart',
    description: 'Muscular pump driving the cardiovascular system. Animates with the mocked 4D playback (see the bottom time controls).',
  },
  {
    id: 'body.torso.lungs.left',
    name: 'Left Lung',
    parentId: 'body.torso',
    children: [],
    meshIds: ['body.torso.lungs.left'],
    systemTags: ['respiratory'],
    selectable: true,
    physiologyKey: 'lungLeft',
    description: 'Left lung. Subtly expands and contracts with the mocked respiratory cycle.',
  },
  {
    id: 'body.torso.lungs.right',
    name: 'Right Lung',
    parentId: 'body.torso',
    children: [],
    meshIds: ['body.torso.lungs.right'],
    systemTags: ['respiratory'],
    selectable: true,
    physiologyKey: 'lungRight',
    description: 'Right lung. Subtly expands and contracts with the mocked respiratory cycle.',
  },
  {
    id: 'body.abdomen.liver',
    name: 'Liver',
    parentId: 'body.abdomen',
    children: [],
    meshIds: ['body.abdomen.liver'],
    systemTags: ['digestive'],
    selectable: true,
    description: 'Largest solid abdominal organ; metabolic and detoxification functions.',
  },
  {
    id: 'body.abdomen.stomach',
    name: 'Stomach',
    parentId: 'body.abdomen',
    children: [],
    meshIds: ['body.abdomen.stomach'],
    systemTags: ['digestive'],
    selectable: true,
    description: 'Muscular sac responsible for initial digestion of food.',
  },
  {
    id: 'body.abdomen.intestines',
    name: 'Intestines',
    parentId: 'body.abdomen',
    children: [],
    meshIds: ['body.abdomen.intestines'],
    systemTags: ['digestive'],
    selectable: true,
    description: 'Small and large intestine, shown as a single simplified structure in this build.',
  },
  {
    id: 'body.abdomen.kidneys.left',
    name: 'Left Kidney',
    parentId: 'body.abdomen',
    children: [],
    meshIds: ['body.abdomen.kidneys.left'],
    // The AnatomySystem union (spec'd) has no dedicated renal/urinary
    // category; 'digestive' is the nearest broad abdominal-organ fit for
    // this build's simplified system-filter scheme.
    systemTags: ['digestive'],
    selectable: true,
    description: 'Left kidney.',
  },
  {
    id: 'body.abdomen.kidneys.right',
    name: 'Right Kidney',
    parentId: 'body.abdomen',
    children: [],
    meshIds: ['body.abdomen.kidneys.right'],
    systemTags: ['digestive'],
    selectable: true,
    description: 'Right kidney.',
  },
  ...(['left', 'right'] as Side[]).map(
    (side): AnatomyNode => ({
      id: `body.pelvis.hip.${side}`,
      name: `${SIDE_LABEL[side]} Hip`,
      parentId: 'body.pelvis',
      children: [],
      meshIds: [`body.pelvis.hip.${side}`],
      systemTags: ['skeletal'],
      selectable: true,
      cameraTarget: frameShot(hipPosition(side), 0.3, { pitch: 0.1 }),
      description: `${SIDE_LABEL[side]} hip joint, connecting the femur to the pelvis.`,
    }),
  ),
];
