// Whole-body skeleton nodes. Children arrays are intentionally left empty
// here (and on every node in every data/anatomy/*.ts file) — see index.ts:
// `children` is DERIVED from every node's `parentId` when the tree is
// merged, not hand-maintained per-node. That removes an entire class of
// "forgot to add this id to the parent's children array" bugs that would
// otherwise be undetectable without a compiler running against real data.
import type { AnatomyNode } from '../../types';
import { BODY } from '../../constants/bodyLayout';
import { frameShot } from '../../utils/math';

export const rootNodes: AnatomyNode[] = [
  {
    id: 'body',
    name: 'Whole Body',
    children: [],
    meshIds: [],
    systemTags: [],
    selectable: true,
    cameraTarget: frameShot([0, 1.0, 0], 3.1, { pitch: 0.1 }),
    description: 'Patient-specific digital twin, reconstructed from a 3D body scan. Select a region to begin exploring.',
  },
  {
    id: 'body.head',
    name: 'Head',
    parentId: 'body',
    children: [],
    meshIds: ['body.head'],
    systemTags: ['integumentary'],
    selectable: true,
    cameraTarget: frameShot([0, BODY.headCenterY, 0], 0.46, { pitch: 0.05 }),
    description: 'Cranium and face. Contains the brain and both orbits.',
  },
  {
    id: 'body.neck',
    name: 'Neck',
    parentId: 'body',
    children: [],
    meshIds: ['body.neck'],
    systemTags: ['integumentary'],
    selectable: true,
    cameraTarget: frameShot([0, (BODY.neckBaseY + BODY.neckTopY) / 2, 0], 0.4),
    description: 'Cervical region connecting the head and torso.',
  },
  {
    id: 'body.torso',
    name: 'Torso',
    parentId: 'body',
    children: [],
    meshIds: ['body.torso'],
    systemTags: ['integumentary'],
    selectable: true,
    cameraTarget: frameShot([0, BODY.chestCenterY, 0], 0.85),
    description: 'Chest and rib cage, containing the heart and lungs.',
  },
  {
    id: 'body.abdomen',
    name: 'Abdomen',
    parentId: 'body',
    children: [],
    meshIds: ['body.abdomen'],
    systemTags: ['integumentary'],
    selectable: true,
    cameraTarget: frameShot([0, BODY.waistY - 0.06, 0], 0.7),
    description: 'Abdominal cavity, containing the liver, stomach, intestines, and kidneys.',
  },
  {
    id: 'body.pelvis',
    name: 'Pelvis',
    parentId: 'body',
    children: [],
    meshIds: ['body.pelvis'],
    systemTags: ['skeletal'],
    selectable: true,
    cameraTarget: frameShot([0, BODY.hipY - 0.05, 0], 0.7),
    description: 'Bony pelvic girdle connecting the spine to both hip joints.',
  },
];
