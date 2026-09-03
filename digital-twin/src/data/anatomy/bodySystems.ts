// Body-wide systems that span every region rather than living inside one:
// the vascular tree and the superficial trunk musculature. Both are new —
// the earlier build had muscle only as isolated per-limb nodes (biceps,
// quadriceps) and no body-level vasculature at all, which is why the figure
// read as a shell with loose parts inside rather than as a body.
//
// Each is one selectable subassembly per tree/group, not per-vessel or
// per-muscle-head: that matches how these are actually inspected, and keeps
// each to a single merged draw call (see scene/body/Vasculature.tsx).
import type { AnatomyNode } from '../../types';
import { BODY } from '../../constants/bodyLayout';
import { frameShot } from '../../utils/math';

const TRUNK_SHOT = frameShot([0, BODY.chestCenterY, 0], 1.15, { pitch: 0.08 });

/**
 * Sex-specific structures. Both sets live in the map at all times — the
 * anatomy map is built once at module load and is the reference the whole
 * app resolves ids against, so making it depend on runtime UI state would
 * mean rebuilding ancestry and descendant caches on every toggle. Instead
 * each node is tagged, and the tree and renderer filter on it.
 */
const reproductiveNodes: AnatomyNode[] = [
  {
    id: 'body.torso.breasts',
    name: 'Breast Tissue',
    parentId: 'body.torso',
    children: [],
    meshIds: ['body.torso.breasts'],
    systemTags: ['integumentary', 'endocrine'],
    selectable: true,
    sexSpecific: 'female',
    cameraTarget: frameShot([0, BODY.chestCenterY + 0.06, 0.08], 0.62),
    description: 'Glandular and adipose breast tissue. The structure mammography and breast ultrasound findings attach to.',
  },
  {
    id: 'body.pelvis.uterus',
    name: 'Uterus',
    parentId: 'body.pelvis',
    children: [],
    meshIds: ['body.pelvis.uterus'],
    systemTags: ['endocrine'],
    selectable: true,
    sexSpecific: 'female',
    cameraTarget: frameShot([0, 0.88, 0.02], 0.42, { pitch: 0.12 }),
    description: 'Uterus with the fallopian tubes sweeping laterally toward each ovary.',
  },
  {
    id: 'body.pelvis.ovaries',
    name: 'Ovaries',
    parentId: 'body.pelvis',
    children: [],
    meshIds: ['body.pelvis.ovaries'],
    systemTags: ['endocrine'],
    selectable: true,
    sexSpecific: 'female',
    cameraTarget: frameShot([0, 0.89, 0], 0.36, { pitch: 0.1 }),
    description: 'Paired ovaries, sitting lateral to the uterus at the end of each fallopian tube.',
  },
  {
    id: 'body.pelvis.prostate',
    name: 'Prostate',
    parentId: 'body.pelvis',
    children: [],
    meshIds: ['body.pelvis.prostate'],
    systemTags: ['endocrine'],
    selectable: true,
    sexSpecific: 'male',
    cameraTarget: frameShot([0, 0.856, 0.01], 0.34, { pitch: 0.12 }),
    description: 'Prostate gland, immediately below the bladder. The structure a PSA result or prostate MRI attaches to.',
  },
];

export const bodySystemsNodes: AnatomyNode[] = [
  ...reproductiveNodes,
  {
    id: 'body.vasculature',
    name: 'Vascular System',
    parentId: 'body',
    children: [],
    meshIds: [],
    systemTags: ['cardiovascular'],
    selectable: true,
    cameraTarget: frameShot([0, BODY.chestCenterY - 0.05, 0], 1.5, { pitch: 0.05 }),
    description:
      'Major arteries and veins: the aorta and vena cava through the trunk, the carotids into the head, and the limb vessels. Shown as two trees rather than individually named vessels in this build.',
  },
  {
    id: 'body.vasculature.arteries',
    name: 'Arteries',
    parentId: 'body.vasculature',
    children: [],
    meshIds: ['body.vasculature.arteries'],
    systemTags: ['cardiovascular'],
    selectable: true,
    cameraTarget: TRUNK_SHOT,
    description:
      'Arterial tree — aortic root and arch, descending aorta, common carotids, subclavian/brachial vessels into both arms, and iliac/femoral vessels into both legs.',
  },
  {
    id: 'body.vasculature.veins',
    name: 'Veins',
    parentId: 'body.vasculature',
    children: [],
    meshIds: ['body.vasculature.veins'],
    systemTags: ['cardiovascular'],
    selectable: true,
    cameraTarget: TRUNK_SHOT,
    description:
      'Venous return — superior and inferior vena cava with the paired limb and neck veins running alongside their arterial partners.',
  },
  {
    id: 'body.musculature',
    name: 'Musculature',
    parentId: 'body',
    children: [],
    meshIds: [],
    systemTags: ['muscular'],
    selectable: true,
    cameraTarget: frameShot([0, BODY.chestCenterY - 0.02, 0], 1.3, { pitch: 0.06 }),
    description:
      'Superficial trunk muscle groups. Limb muscles are attached to their own limb instead (biceps and triceps under each arm, quadriceps and calf under each leg).',
  },
  {
    id: 'body.musculature.pectorals',
    name: 'Pectorals',
    parentId: 'body.musculature',
    children: [],
    meshIds: ['body.musculature.pectorals'],
    systemTags: ['muscular'],
    selectable: true,
    cameraTarget: frameShot([0, BODY.chestCenterY + 0.08, 0.06], 0.7),
    description: 'Pectoralis major, the paired chest muscles crossing from the sternum to each shoulder.',
  },
  {
    id: 'body.musculature.abdominals',
    name: 'Abdominal Muscles',
    parentId: 'body.musculature',
    children: [],
    meshIds: ['body.musculature.abdominals'],
    systemTags: ['muscular'],
    selectable: true,
    cameraTarget: frameShot([0, 1.03, 0.06], 0.65),
    description: 'Rectus abdominis in its segmented columns, with the external obliques wrapping each flank.',
  },
  {
    id: 'body.musculature.back',
    name: 'Back Muscles',
    parentId: 'body.musculature',
    children: [],
    meshIds: ['body.musculature.back'],
    systemTags: ['muscular'],
    selectable: true,
    cameraTarget: frameShot([0, BODY.chestCenterY, -0.06], 0.95, { yaw: Math.PI }),
    description: 'Trapezius across the upper back and shoulders, with latissimus dorsi below it.',
  },
];
