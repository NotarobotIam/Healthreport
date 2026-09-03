/**
 * Anatomy verification suite.
 *
 * The 3D body cannot be checked by tsc or by the bundler: every bug found
 * while building it — organs merging to EMPTY geometry, limb skin rendering
 * opaque over its own bones, toes floating in front of the foot, a brow
 * ridge protruding past the nose tip — produced a clean typecheck and a
 * clean production build. What catches them is measuring the geometry.
 *
 * Run with `npm run verify:anatomy`.
 */
import * as THREE from 'three';
import {
  buildGroundedForwardForm,
  buildLoftGeometry,
  buildOrganicBlob,
  buildProfiledForm,
  buildTubeThrough,
} from '../src/scene/primitives/anatomicalForms';
import {
  buildBrainGeometry,
  buildHeartGeometry,
  buildIntestinesGeometry,
  buildKidneyGeometry,
  buildLiverGeometry,
  buildLongBoneGeometry,
  buildLungGeometry,
  buildRibcageGeometry,
  buildSpineGeometry,
  buildStomachGeometry,
} from '../src/scene/primitives/organForms';
import { buildEarGeometry, buildHeadGeometry } from '../src/scene/primitives/headForms';
import { cachedGeometry, sexedGeometry } from '../src/scene/primitives/proceduralGeometry';
import {
  HEAD_PROFILE,
  SEX_SCALE,
  SHIN_PROFILE,
  THIGH_PROFILE,
  scaleProfile,
  trunkRings,
  trunkSectionAt,
} from '../src/constants/bodyProfile';
import { BODY, EYE, LEG, orbitPosition, type BodySex } from '../src/constants/bodyLayout';
import { anatomyMap } from '../src/data/anatomy';
import { OUTER_SHELL_NODE_IDS } from '../src/data/anatomy/eye';
import { generatePhysiologyFrame } from '../src/data/physiology/mockGenerator';

let failures = 0;
const SEXES: BodySex[] = ['male', 'female'];

function ok(label: string, condition: boolean, detail = '') {
  if (!condition) failures++;
  console.log(`${condition ? 'PASS' : 'FAIL'} ${label.padEnd(52)} ${detail}`);
}
function section(title: string) {
  console.log(`\n--- ${title} ---`);
}

/** Every builder must produce a real, finite, non-empty mesh. */
function checkGeometry(name: string, g: THREE.BufferGeometry) {
  const pos = g.attributes.position as THREE.BufferAttribute | undefined;
  if (!pos || pos.count === 0) {
    ok(name, false, 'EMPTY geometry (a failed merge renders as nothing at all)');
    return;
  }
  let nan = 0;
  for (let i = 0; i < pos.count * 3; i++) if (!Number.isFinite((pos.array as Float32Array)[i])) nan++;
  g.computeBoundingBox();
  const size = new THREE.Vector3();
  g.boundingBox!.getSize(size);
  ok(name, nan === 0 && size.length() > 0, `${pos.count} verts  ${size.toArray().map((v) => v.toFixed(3)).join(' x ')}`);
}

/** Frontmost surface Z near (x, y) — how far the face sticks out at that point. */
function frontZ(g: THREE.BufferGeometry, x: number, y: number, tol = 0.007): number {
  const p = g.attributes.position as THREE.BufferAttribute;
  let best = -Infinity;
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(p.getX(i) - x) < tol && Math.abs(p.getY(i) - y) < tol && p.getZ(i) > 0) best = Math.max(best, p.getZ(i));
  }
  return best;
}
/** Outermost |X| at a given height. */
function sideX(g: THREE.BufferGeometry, y: number, tol = 0.012): number {
  const p = g.attributes.position as THREE.BufferAttribute;
  let best = 0;
  for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - y) < tol) best = Math.max(best, Math.abs(p.getX(i)));
  return best;
}

section('organs and bones build valid geometry');
checkGeometry('brain', buildBrainGeometry(0.057));
checkGeometry('ribcage', buildRibcageGeometry({ topY: 1.375, bottomY: 1.09, maxHalfWidth: 0.134, maxHalfDepth: 0.092 }));
checkGeometry('spine', buildSpineGeometry(1.42, 0.88, -0.072));
checkGeometry('intestines', buildIntestinesGeometry(0.96));
checkGeometry('heart', buildHeartGeometry(0.055));
checkGeometry('liver', buildLiverGeometry(0.055));
checkGeometry('stomach', buildStomachGeometry(0.045));
checkGeometry('femur', buildLongBoneGeometry(-0.01, -0.358, 0.019));
checkGeometry('ear', buildEarGeometry());
for (const sex of SEXES) checkGeometry(`head (${sex})`, buildHeadGeometry(sex));

section('paired organs are mirror images, not independent shapes');
const lungL = buildLungGeometry(0.235, 1, true);
const lungR = buildLungGeometry(0.235, -1, false);
lungL.computeBoundingBox();
lungR.computeBoundingBox();
const skew = (b: THREE.Box3) => Math.abs(b.max.x + b.min.x);
ok('lungs are a mirrored pair', Math.abs(skew(lungL.boundingBox!) - skew(lungR.boundingBox!)) < 1e-6);
// The kidney is built once and mirrored by the component, so the pair is
// symmetric by construction. What IS worth asserting is that the canonical
// shape actually has its hilum notch, since that is what distinguishes a
// kidney from a lump.
const kidney = buildKidneyGeometry(0.036);
kidney.computeBoundingBox();
const kb = kidney.boundingBox!;
ok('kidney hilum is indented on one side', Math.abs(kb.min.x) < Math.abs(kb.max.x) * 0.85,
   `-X ${Math.abs(kb.min.x).toFixed(4)} vs +X ${kb.max.x.toFixed(4)}`);

section('trunk is continuous and human-shaped, for both anatomies');
for (const sex of SEXES) {
  const chestBottom = trunkRings(1.03, 1.45, sex, 20)[0];
  const abdomenTop = trunkRings(0.9, 1.03, sex, 12)[11];
  ok(
    `${sex}: chest/abdomen boundary ring matches exactly`,
    Math.abs(chestBottom.radiusX - abdomenTop.radiusX) < 1e-9 && Math.abs(chestBottom.radiusZ - abdomenTop.radiusZ) < 1e-9,
  );
  const waist = trunkSectionAt(1.04, sex);
  const chest = trunkSectionAt(1.24, sex);
  const hips = trunkSectionAt(0.845, sex);
  ok(`${sex}: waist narrower than chest and hips`, waist.rx < chest.rx && waist.rx < hips.rx);
  ok(`${sex}: trunk is elliptical, not round`, chest.rz / chest.rx < 0.8, `depth/width ${(chest.rz / chest.rx).toFixed(2)}`);
}

section('female is a different SHAPE, not a scaled male');
const m = { waist: trunkSectionAt(1.04, 'male').rx, hip: trunkSectionAt(0.845, 'male').rx, chest: trunkSectionAt(1.24, 'male').rx, sh: trunkSectionAt(1.415, 'male').rx };
const f = { waist: trunkSectionAt(1.04, 'female').rx, hip: trunkSectionAt(0.845, 'female').rx, chest: trunkSectionAt(1.24, 'female').rx, sh: trunkSectionAt(1.415, 'female').rx };
ok('female hips wider', f.hip > m.hip);
ok('female waist, chest and shoulders narrower', f.waist < m.waist && f.chest < m.chest && f.sh < m.sh);
ok('female waist-to-hip is lower', f.waist / f.hip < m.waist / m.hip, `${(f.waist / f.hip).toFixed(3)} vs ${(m.waist / m.hip).toFixed(3)}`);
ok('no single scale factor could produce this', f.hip / m.hip > 1 && f.chest / m.chest < 1, 'hips up, chest down');
ok('scaleProfile is a no-op at 1.0', scaleProfile(THIGH_PROFILE, 1) === THIGH_PROFILE);

section('geometry cache is namespaced by sex');
const cachedMale = sexedGeometry('male', 'verify.probe', () => new THREE.BoxGeometry(1, 1, 1));
const cachedFemale = sexedGeometry('female', 'verify.probe', () => new THREE.BoxGeometry(2, 2, 2));
cachedMale.computeBoundingBox();
cachedFemale.computeBoundingBox();
ok('same key + different sex yields different geometry', cachedMale !== cachedFemale);
ok('each sex gets the geometry it built', Math.abs(cachedFemale.boundingBox!.max.x - 1) < 1e-9 && Math.abs(cachedMale.boundingBox!.max.x - 0.5) < 1e-9);
ok('repeat request is memoized', sexedGeometry('male', 'verify.probe', () => new THREE.BoxGeometry(9, 9, 9)) === cachedMale);
ok(
  'bare cache WOULD collide (why sexedGeometry exists)',
  cachedGeometry('verify.collide', () => new THREE.BoxGeometry(1, 1, 1)) === cachedGeometry('verify.collide', () => new THREE.BoxGeometry(2, 2, 2)),
);

section('feet rest on the ground and toes attach to them');
const KNEE_Y = -LEG.thighLength;
const ANKLE_Y = KNEE_Y - LEG.shinLength;
const TOE_LINE_Z = 0.132;
const foot = buildGroundedForwardForm(
  [
    { z: -0.058, width: 0.042, height: 0.072 },
    { z: -0.032, width: 0.058, height: 0.108 },
    { z: 0.0, width: 0.066, height: 0.144 },
    { z: 0.042, width: 0.064, height: 0.086 },
    { z: 0.086, width: 0.072, height: 0.058 },
    { z: 0.118, width: 0.079, height: 0.048 },
    { z: TOE_LINE_Z, width: 0.075, height: 0.041 },
  ],
  24,
);
foot.computeBoundingBox();
const fb = foot.boundingBox!;
ok('foot sole is exactly on the ground plane', Math.abs(fb.min.y) < 1e-9, `min.y=${fb.min.y.toExponential(1)}`);
ok('figure stands on the grid', Math.abs(BODY.hipY + (BODY.groundY - BODY.hipY)) < 1e-9);
ok('ankle column reaches the shin', BODY.groundY - BODY.hipY + fb.max.y >= ANKLE_Y - 0.005);
for (const toe of [
  { key: 'bigToe', x: -0.026, length: 0.043, width: 0.023 },
  { key: 'secondToe', x: -0.008, length: 0.041, width: 0.018 },
  { key: 'thirdToe', x: 0.006, length: 0.037, width: 0.017 },
  { key: 'fourthToe', x: 0.019, length: 0.031, width: 0.016 },
  { key: 'littleToe', x: 0.031, length: 0.024, width: 0.015 },
]) {
  const g = buildGroundedForwardForm(
    [
      { z: -0.006, width: toe.width * 0.94, height: toe.width * 0.92 },
      { z: toe.length * 0.42, width: toe.width, height: toe.width * 0.95 },
      { z: toe.length * 0.8, width: toe.width * 0.9, height: toe.width * 0.86 },
      { z: toe.length, width: toe.width * 0.5, height: toe.width * 0.48 },
    ],
    12,
  );
  g.computeBoundingBox();
  const gap = TOE_LINE_Z - Math.abs(toe.x) * 0.16 + g.boundingBox!.min.z - fb.max.z;
  ok(`${toe.key} root overlaps the foot`, gap < 0, `${(gap * 1000).toFixed(1)}mm`);
}

section('limb bones fit inside their skin');
const femur = buildLongBoneGeometry(-0.01, KNEE_Y + 0.012, 0.019);
const thighSkin = buildProfiledForm({ topY: 0.02, bottomY: KNEE_Y, profile: THIGH_PROFILE, radialSegments: 22, slices: 20 });
femur.computeBoundingBox();
thighSkin.computeBoundingBox();
ok('femur fits inside the thigh', femur.boundingBox!.max.x < thighSkin.boundingBox!.max.x);
const shinSkin = buildProfiledForm({ topY: KNEE_Y, bottomY: ANKLE_Y, profile: SHIN_PROFILE, radialSegments: 22, slices: 20 });
const tibia = buildLongBoneGeometry(KNEE_Y - 0.006, ANKLE_Y + 0.01, 0.013);
shinSkin.computeBoundingBox();
tibia.computeBoundingBox();
ok('tibia fits inside the shin', tibia.boundingBox!.max.x < shinSkin.boundingBox!.max.x);

section('the head has a face, not a balloon');
for (const sex of SEXES) {
  const head = buildHeadGeometry(sex);
  const plain = buildProfiledForm({ topY: BODY.headTopY, bottomY: BODY.neckTopY, profile: HEAD_PROFILE, radialSegments: 56, slices: 48 });
  const s = SEX_SCALE[sex].head;
  if (s !== 1) plain.scale(s, 1, s);

  const nose = frontZ(head, 0, 1.6);
  const glabella = frontZ(head, 0, 1.652);
  const cheek = frontZ(head, 0.055 * s, 1.6);
  const orbit = frontZ(head, 0.035 * s, BODY.headCenterY - 0.006);
  const projection = nose - frontZ(plain, 0, 1.6);

  ok(`${sex}: nose is the frontmost point of the face`, nose > Math.max(cheek, glabella, frontZ(head, 0, 1.534)));
  ok(`${sex}: nose projects a realistic 15-32mm`, projection > 0.015 && projection < 0.032, `${(projection * 1000).toFixed(1)}mm`);
  ok(`${sex}: orbit is a recessed socket`, frontZ(plain, 0.035 * s, BODY.headCenterY - 0.006) - orbit > 0.004);
  ok(`${sex}: brow overhangs the orbit`, frontZ(head, 0.035 * s, 1.655) > orbit);
  ok(`${sex}: chin protrudes past the crease above it`, frontZ(head, 0, 1.534, 0.008) > frontZ(head, 0, 1.549, 0.008));
  ok(`${sex}: jaw angle widens the lower skull`, sideX(head, 1.562) > sideX(plain, 1.562));
  ok(`${sex}: eyeball stays inside the orbit`, orbitPosition('left')[2] + EYE.radius < orbit);
  head.computeBoundingBox();

  // Signed zero would fake a mismatch here, so compare numerically.
  const p = head.attributes.position as THREE.BufferAttribute;
  const r = (n: number) => Math.round(n * 1e5) / 1e5 + 0;
  const verts = new Set<string>();
  for (let i = 0; i < p.count; i++) verts.add(`${r(p.getX(i))},${r(p.getY(i))},${r(p.getZ(i))}`);
  let asym = 0;
  for (let i = 0; i < p.count; i++) if (!verts.has(`${r(-p.getX(i))},${r(p.getY(i))},${r(p.getZ(i))}`)) asym++;
  ok(`${sex}: face is exactly symmetric across X`, asym === 0, `${asym} unmatched of ${p.count}`);
  ok(`${sex}: head still meets the neck`, Math.abs(head.boundingBox!.min.y - BODY.neckTopY) < 0.012);
}
ok('female brow ridge is lighter', frontZ(buildHeadGeometry('female'), 0, 1.652) < frontZ(buildHeadGeometry('male'), 0, 1.652));
ok('female jaw is narrower', sideX(buildHeadGeometry('female'), 1.562) < sideX(buildHeadGeometry('male'), 1.562));

section('anatomy graph is symmetric');
const ids = Object.keys(anatomyMap);
for (const [label, prefix] of [
  ['arms', 'body.upperExtremity'],
  ['legs', 'body.lowerExtremity'],
  ['eyes', 'body.head.orbit'],
] as const) {
  const shape = (side: string) => ids.filter((i) => i.startsWith(`${prefix}.${side}`)).map((i) => i.replace(`.${side}`, '.S')).sort();
  const l = shape('left');
  const r = shape('right');
  ok(`${label} left/right structure identical`, l.length === r.length && l.every((v, i) => v === r[i]), `${l.length} nodes per side`);
}
ok('eyes are fully modelled, not placeholders', ids.filter((i) => i.startsWith('body.head.orbit.right')).length >= 19);

section('sex-specific nodes are tagged and filterable');
const tagged = Object.values(anatomyMap).filter((n) => n.sexSpecific);
ok('female-only structures present', tagged.filter((n) => n.sexSpecific === 'female').length === 3, 'breasts, uterus, ovaries');
ok('male-only structures present', tagged.filter((n) => n.sexSpecific === 'male').length === 1, 'prostate');
ok('each has a real parent that lists it', tagged.every((n) => anatomyMap[n.parentId!]?.children.includes(n.id)));
for (const sex of SEXES) {
  // Exactly the predicate LeftPanel and SelectableMesh apply.
  const visible = Object.values(anatomyMap).filter((n) => !n.sexSpecific || n.sexSpecific === sex);
  const leaked = visible.filter((n) => n.sexSpecific && n.sexSpecific !== sex);
  const hidden = Object.values(anatomyMap).filter((n) => n.sexSpecific === (sex === 'male' ? 'female' : 'male'));
  ok(`${sex} view shows no other-anatomy nodes`, leaked.length === 0 && hidden.length > 0, `${hidden.length} hidden, ${visible.length} shown`);
}

section('cutaway shells and physiology cover both sides');
const shells = [...OUTER_SHELL_NODE_IDS];
const shellShape = (side: string) => shells.filter((i) => i.includes(`.${side}.`)).map((i) => i.replace(`.${side}.`, '.S.')).sort();
ok('eye cutaway shells match across sides', shellShape('left').length === shellShape('right').length && shellShape('left').every((v, i) => v === shellShape('right')[i]));
const frame = generatePhysiologyFrame(0);
const dangling = Object.values(anatomyMap).filter((n) => n.physiologyKey && !frame.bodyRegions[n.physiologyKey]);
ok('no node points at a missing physiology key', dangling.length === 0, dangling.map((n) => `${n.id} -> ${n.physiologyKey}`).join(', '));

section('unused-geometry smoke checks');
checkGeometry('organic blob', buildOrganicBlob({ radius: 0.05 }));
checkGeometry('tube', buildTubeThrough([[0, 0, 0], [0, 0.1, 0], [0, 0.2, 0.05]], 0.01));
checkGeometry('loft', buildLoftGeometry(trunkRings(1.03, 1.45, 'male', 20), 30));

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
