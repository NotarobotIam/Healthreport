import { useMemo } from 'react';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { cachedGeometry } from '../primitives/proceduralGeometry';
import { buildTubeThrough } from '../primitives/anatomicalForms';
import { mergeAll } from '../primitives/organForms';
import { BODY } from '../../constants/bodyLayout';

/**
 * The major arterial and venous trees, as two selectable subassemblies
 * (`body.vasculature.arteries` / `.veins`). Both are single merged
 * geometries — one draw call each — matching how a vessel tree is actually
 * selected: as a system, not per-twig. Vessels are the one structure that
 * reads instantly as "this is a body and not a mannequin", which is why
 * they are here even though the previous build had no body-level
 * vasculature at all.
 *
 * Every path is mirrored from a single side-parameterised builder, so the
 * left and right trees cannot diverge. Both trees already respond to the
 * existing cardiovascular arteries/veins sub-filters, which key off tissue
 * kind in SelectableMesh — no extra wiring needed here.
 */

type Path = Array<[number, number, number]>;

/** Aorta: ascending root, arch, then descending in front of the spine to the iliac split. */
const AORTA: Path = [
  [0.016, BODY.chestCenterY + 0.06, 0.012],
  [0.014, BODY.chestCenterY + 0.13, -0.006],
  [-0.004, BODY.chestCenterY + 0.165, -0.03],
  [-0.012, BODY.chestCenterY + 0.1, -0.05],
  [-0.011, BODY.chestCenterY - 0.02, -0.052],
  [-0.009, 1.05, -0.05],
  [-0.007, 0.95, -0.045],
  [0, 0.9, -0.04],
];

const VENA_CAVA: Path = [
  [-0.026, BODY.chestCenterY + 0.09, -0.01],
  [-0.03, BODY.chestCenterY + 0.02, -0.03],
  [-0.03, 1.1, -0.038],
  [-0.026, 0.98, -0.038],
  [-0.014, 0.9, -0.036],
];

function carotid(sign: 1 | -1): Path {
  return [
    [sign * 0.02, BODY.chestCenterY + 0.16, -0.026],
    [sign * 0.028, BODY.neckBaseY + 0.02, 0.004],
    [sign * 0.03, BODY.neckTopY, 0.014],
    [sign * 0.026, BODY.headCenterY - 0.02, 0.01],
  ];
}

/** Subclavian into the axilla, then brachial down the inner arm to the elbow and forearm. */
function armVessel(sign: 1 | -1, inset: number): Path {
  return [
    [sign * 0.03, BODY.shoulderY + 0.01, -0.02],
    [sign * 0.12, BODY.shoulderY - 0.005, -0.008],
    [sign * (0.185 + inset), BODY.shoulderY - 0.06, 0.002],
    [sign * (0.215 + inset), BODY.shoulderY - 0.18, 0.004],
    [sign * (0.245 + inset), BODY.shoulderY - 0.29, 0.006],
    [sign * (0.27 + inset), BODY.shoulderY - 0.42, 0.004],
    [sign * (0.285 + inset), BODY.shoulderY - 0.5, 0.002],
  ];
}

/** Common iliac into the femoral artery, down the thigh and behind the knee. */
function legVessel(sign: 1 | -1, inset: number): Path {
  return [
    [sign * 0.02, 0.9, -0.04],
    [sign * 0.07, 0.865, -0.02],
    [sign * (0.105 + inset), 0.8, 0.008],
    [sign * (0.11 + inset), 0.68, 0.004],
    [sign * (0.11 + inset), 0.55, -0.004],
    [sign * (0.11 + inset), 0.44, -0.012],
    [sign * (0.11 + inset), 0.28, -0.008],
    [sign * (0.11 + inset), 0.16, -0.004],
  ];
}

function buildTree(kind: 'artery' | 'vein') {
  // Veins run just superficial and lateral to their arterial partners, the
  // way the venae comitantes actually pair with the arteries they drain.
  const inset = kind === 'vein' ? 0.012 : 0;
  const trunkRadius = kind === 'vein' ? 0.0105 : 0.0115;
  const limbRadius = kind === 'vein' ? 0.0052 : 0.0048;

  const parts = [
    buildTubeThrough(kind === 'artery' ? AORTA : VENA_CAVA, trunkRadius, { radialSegments: 8, tubularSegments: 70 }),
  ];

  for (const sign of [1, -1] as const) {
    parts.push(buildTubeThrough(carotid(sign), limbRadius * 0.95, { radialSegments: 7, tubularSegments: 34 }));
    parts.push(buildTubeThrough(armVessel(sign, inset), limbRadius, { radialSegments: 7, tubularSegments: 54 }));
    parts.push(buildTubeThrough(legVessel(sign, inset), limbRadius * 1.15, { radialSegments: 7, tubularSegments: 60 }));
  }

  return mergeAll(parts);
}

export function Vasculature() {
  const arteries = useMemo(() => cachedGeometry('vasculature.arteries', () => buildTree('artery')), []);
  const veins = useMemo(() => cachedGeometry('vasculature.veins', () => buildTree('vein')), []);

  return (
    <group>
      <SelectableMesh nodeId="body.vasculature.arteries" geometry={arteries} tissue="artery" />
      <SelectableMesh nodeId="body.vasculature.veins" geometry={veins} tissue="vein" />
    </group>
  );
}
