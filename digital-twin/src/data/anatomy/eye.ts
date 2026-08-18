// The eye is the other flagship demonstration (alongside the left arm/hand/
// fingers): Head -> Orbit -> Eye -> Eyeball -> cornea/sclera/iris/pupil/
// lens/ciliary body/vitreous humor/retina(->macula/optic disc/retinal
// vessels)/optic nerve, plus extraocular muscles/eyelids/lacrimal apparatus
// as siblings of the eyeball. The LEFT eye gets this full treatment; the
// RIGHT eye is a single generic placeholder sphere (see buildSimpleEye) —
// same flagship/generic split rationale as the arms.
import type { AnatomyNode, CameraTarget } from '../../types';
import type { Side } from '../../constants/bodyLayout';
import { EYE, orbitPosition } from '../../constants/bodyLayout';
import { frameShot } from '../../utils/math';

const SIDE_LABEL: Record<Side, string> = { left: 'Left', right: 'Right' };

/**
 * The "camera flies inside the globe toward the posterior pole" shot used
 * when drilling into the retina. Uses the SAME cameraTarget mechanism as
 * every other node (CameraRig has no special-case code for this) — it's
 * just a target point deliberately placed inside the sphere radius. Deeper
 * retina children (macula/optic disc/vessels) intentionally have no
 * cameraTarget of their own: they rely on CameraRig's live fitToBox
 * fallback, which reframes relative to the CURRENT camera position — since
 * that position is already inside the globe once you've clicked retina, the
 * fallback naturally stays inside too rather than resetting outside it.
 */
function insideGlobeShot(center: [number, number, number]): CameraTarget {
  const [cx, cy, cz] = center;
  const anterior = EYE.radius * 0.3;
  const posterior = EYE.radius * 0.85;
  return {
    position: [cx, cy, cz + anterior],
    target: [cx, cy, cz - posterior],
  };
}

function buildDetailedEye(side: Side): AnatomyNode[] {
  const label = `${SIDE_LABEL[side]} Eye`;
  const center = orbitPosition(side);
  const yaw = side === 'left' ? -0.18 : 0.18;

  const orbitId = `body.head.orbit.${side}`;
  const eyeId = `${orbitId}.eye`;
  const eyeballId = `${eyeId}.eyeball`;
  const retinaId = `${eyeballId}.retina`;

  return [
    {
      id: orbitId,
      name: 'Orbit',
      parentId: 'body.head',
      children: [],
      meshIds: [],
      systemTags: ['skeletal'],
      selectable: true,
      cameraTarget: frameShot(center, 0.075, { yaw, pitch: 0.1 }),
      description: `Bony eye socket housing the ${label.toLowerCase()} and its supporting structures.`,
    },
    {
      id: eyeId,
      name: label,
      parentId: orbitId,
      children: [],
      meshIds: [],
      systemTags: [],
      selectable: true,
      cameraTarget: frameShot(center, 0.052, { yaw, pitch: 0.06 }),
      description: `${label} — globe, extraocular muscles, eyelids, and lacrimal apparatus.`,
    },
    {
      id: eyeballId,
      name: 'Eyeball',
      parentId: eyeId,
      children: [],
      meshIds: [],
      systemTags: [],
      selectable: true,
      cameraTarget: frameShot(center, EYE.radius * 3.4, { yaw, pitch: 0.05 }),
      physiologyKey: `eye.${side}.iop`,
      description: 'The globe of the eye. Rotate freely, raise transparency for a cutaway view of the internal structures, or select a structure directly.',
    },
    {
      id: `${eyeballId}.cornea`,
      name: 'Cornea',
      parentId: eyeballId,
      children: [],
      meshIds: [`${eyeballId}.cornea`],
      systemTags: [],
      selectable: true,
      description: 'Transparent anterior window of the eye, continuous with the sclera.',
    },
    {
      id: `${eyeballId}.sclera`,
      name: 'Sclera',
      parentId: eyeballId,
      children: [],
      meshIds: [`${eyeballId}.sclera`],
      systemTags: [],
      selectable: true,
      description: "The eye's tough, opaque outer coat — the visible \"white\" of the eye.",
    },
    {
      id: `${eyeballId}.iris`,
      name: 'Iris',
      parentId: eyeballId,
      children: [],
      meshIds: [`${eyeballId}.iris`],
      systemTags: [],
      selectable: true,
      description: 'Pigmented, muscular diaphragm controlling pupil size.',
    },
    {
      id: `${eyeballId}.pupil`,
      name: 'Pupil',
      parentId: eyeballId,
      children: [],
      meshIds: [`${eyeballId}.pupil`],
      systemTags: [],
      selectable: true,
      description: 'Central aperture of the iris through which light enters the eye.',
    },
    {
      id: `${eyeballId}.lens`,
      name: 'Lens',
      parentId: eyeballId,
      children: [],
      meshIds: [`${eyeballId}.lens`],
      systemTags: [],
      selectable: true,
      description: 'Biconvex, transparent structure that fine-focuses light onto the retina.',
    },
    {
      id: `${eyeballId}.ciliaryBody`,
      name: 'Ciliary Body',
      parentId: eyeballId,
      children: [],
      meshIds: [`${eyeballId}.ciliaryBody`],
      systemTags: ['muscular'],
      selectable: true,
      description: 'Ring of muscle and tissue that reshapes the lens and produces aqueous humor.',
    },
    {
      id: `${eyeballId}.vitreousHumor`,
      name: 'Vitreous Humor',
      parentId: eyeballId,
      children: [],
      meshIds: [`${eyeballId}.vitreousHumor`],
      systemTags: [],
      selectable: true,
      description: 'Clear gel filling the posterior chamber, between the lens and the retina.',
    },
    {
      id: retinaId,
      name: 'Retina',
      parentId: eyeballId,
      children: [],
      meshIds: [`${retinaId}.surface`],
      systemTags: ['nervous'],
      selectable: true,
      cameraTarget: insideGlobeShot(center),
      physiologyKey: `eye.${side}.retina`,
      description: 'Light-sensitive neural tissue lining the posterior globe. Selecting it moves the camera inside the globe toward the posterior pole.',
    },
    {
      id: `${retinaId}.macula`,
      name: 'Macula',
      parentId: retinaId,
      children: [],
      meshIds: [`${retinaId}.macula`],
      systemTags: ['nervous'],
      selectable: true,
      description: 'Small central region of the retina responsible for sharp, detailed vision.',
    },
    {
      id: `${retinaId}.opticDisc`,
      name: 'Optic Disc',
      parentId: retinaId,
      children: [],
      meshIds: [`${retinaId}.opticDisc`],
      systemTags: ['nervous'],
      selectable: true,
      physiologyKey: `eye.${side}.opticNerve`,
      description: 'The "blind spot" — point where the optic nerve and retinal vessels enter the eye.',
    },
    {
      id: `${retinaId}.retinalArteries`,
      name: 'Retinal Arteries',
      parentId: retinaId,
      children: [],
      meshIds: [`${retinaId}.retinalArteries`],
      systemTags: ['cardiovascular'],
      selectable: true,
      physiologyKey: `eye.${side}.retinalFlow`,
      description: 'Branching arterial network supplying the inner retina, radiating from the optic disc.',
    },
    {
      id: `${retinaId}.retinalVeins`,
      name: 'Retinal Veins',
      parentId: retinaId,
      children: [],
      meshIds: [`${retinaId}.retinalVeins`],
      systemTags: ['cardiovascular'],
      selectable: true,
      description: 'Venous drainage network of the retina, converging toward the optic disc.',
    },
    {
      id: `${eyeballId}.opticNerve`,
      name: 'Optic Nerve',
      parentId: eyeballId,
      children: [],
      meshIds: [`${eyeballId}.opticNerve`],
      systemTags: ['nervous'],
      selectable: true,
      physiologyKey: `eye.${side}.opticNerve`,
      description: 'Bundle of retinal ganglion cell axons carrying visual signals from the eye to the brain.',
    },
    {
      id: `${eyeId}.extraocularMuscles`,
      name: 'Extraocular Muscles',
      parentId: eyeId,
      children: [],
      meshIds: [`${eyeId}.extraocularMuscles`],
      systemTags: ['muscular'],
      selectable: true,
      description: 'The recti and oblique muscles that rotate the eye within the orbit, shown as one group.',
    },
    {
      id: `${eyeId}.eyelids`,
      name: 'Eyelids',
      parentId: eyeId,
      children: [],
      meshIds: [`${eyeId}.eyelids`],
      systemTags: ['integumentary'],
      selectable: true,
      description: 'Upper and lower eyelids, shown as one group.',
    },
    {
      id: `${eyeId}.lacrimalApparatus`,
      name: 'Lacrimal Apparatus',
      parentId: eyeId,
      children: [],
      meshIds: [`${eyeId}.lacrimalApparatus`],
      systemTags: ['integumentary'],
      selectable: true,
      description: 'Lacrimal gland and drainage structures responsible for tear production.',
    },
  ];
}

function buildSimpleEye(side: Side): AnatomyNode[] {
  const label = `${SIDE_LABEL[side]} Eye`;
  const center = orbitPosition(side);
  const yaw = side === 'left' ? -0.18 : 0.18;
  const orbitId = `body.head.orbit.${side}`;
  const eyeId = `${orbitId}.eye`;
  const eyeballId = `${eyeId}.eyeball`;

  return [
    {
      id: orbitId,
      name: 'Orbit',
      parentId: 'body.head',
      children: [],
      meshIds: [],
      systemTags: ['skeletal'],
      selectable: true,
      cameraTarget: frameShot(center, 0.075, { yaw, pitch: 0.1 }),
      description: `Bony eye socket housing the ${label.toLowerCase()}.`,
    },
    {
      id: eyeId,
      name: label,
      parentId: orbitId,
      children: [],
      meshIds: [],
      systemTags: [],
      selectable: true,
      cameraTarget: frameShot(center, 0.052, { yaw, pitch: 0.06 }),
      description: `${label}. Shown in simplified form in this build — the left eye has the fully detailed internal drill-down.`,
    },
    {
      id: eyeballId,
      name: 'Eyeball',
      parentId: eyeId,
      children: [],
      meshIds: [eyeballId],
      systemTags: [],
      selectable: true,
      cameraTarget: frameShot(center, EYE.radius * 3.4, { yaw, pitch: 0.05 }),
      description: 'The globe of the eye, shown as a single structure in this build.',
    },
  ];
}

export const eyeNodes: AnatomyNode[] = [...buildDetailedEye('left'), ...buildSimpleEye('right')];

/**
 * Nodes that respond to the global transparency slider ("cutaway mode") in
 * addition to whatever nodes are already covered by the generic
 * `systemTags.includes('integumentary')` rule. Deliberately local to the
 * eye branch rather than a field on AnatomyNode itself — see
 * scene/primitives/SelectableMesh.tsx, the one place this is read.
 */
export const OUTER_SHELL_NODE_IDS = new Set<string>([
  'body.head.orbit.left.eye.eyeball.cornea',
  'body.head.orbit.left.eye.eyeball.sclera',
  'body.head.orbit.left.eye.eyeball.iris',
  'body.head.orbit.right.eye.eyeball',
]);
