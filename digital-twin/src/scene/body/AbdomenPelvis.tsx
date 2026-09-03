import { useMemo } from 'react';
import { SelectableMesh } from '../primitives/SelectableMesh';
import { sexedGeometry } from '../primitives/proceduralGeometry';
import { buildLoftGeometry, buildOrganicBlob, buildTubeThrough } from '../primitives/anatomicalForms';
import {
  buildIntestinesGeometry,
  buildKidneyGeometry,
  buildLiverGeometry,
  buildStomachGeometry,
  mergeAll,
} from '../primitives/organForms';
import { SIDE_SIGN, hipPosition, type BodySex } from '../../constants/bodyLayout';
import { SEX_SCALE, trunkRings } from '../../constants/bodyProfile';
import { useViewStore } from '../../store/useViewStore';
import { CHEST_BOTTOM_Y } from './Torso';

/** Continues the shared trunk curve below the chest — see the note in Torso.tsx. */
const ABDOMEN_BOTTOM_Y = 0.9;
const PELVIS_BOTTOM_Y = 0.79;

const INTESTINE_CENTER_Y = 0.96;

export function AbdomenPelvis() {
  const sex = useViewStore((s) => s.anatomySex);
  const organScale = SEX_SCALE[sex].organ;
  // The female pelvis is genuinely wider and shallower than the male one —
  // a broader iliac flare and a wider subpubic arch — which is the single
  // most reliable skeletal sex difference, so it is modelled rather than
  // left to the soft-tissue profile alone.
  const pelvisWidth = sex === 'female' ? 1.08 : 1;

  const abdomenGeometry = useMemo(
    () => sexedGeometry(sex, 'abdomen.shell', () => buildLoftGeometry(trunkRings(ABDOMEN_BOTTOM_Y, CHEST_BOTTOM_Y, sex, 12), 30)),
    [sex],
  );
  const pelvisShellGeometry = useMemo(
    () => sexedGeometry(sex, 'pelvis.shell', () => buildLoftGeometry(trunkRings(PELVIS_BOTTOM_Y, ABDOMEN_BOTTOM_Y, sex, 12), 30)),
    [sex],
  );

  const liverGeometry = useMemo(
    () => sexedGeometry(sex, 'abdomen.liver', () => buildLiverGeometry(0.055 * organScale)),
    [sex, organScale],
  );
  const stomachGeometry = useMemo(
    () => sexedGeometry(sex, 'abdomen.stomach', () => buildStomachGeometry(0.045 * organScale)),
    [sex, organScale],
  );
  const intestinesGeometry = useMemo(
    () => sexedGeometry(sex, 'abdomen.intestines', () => buildIntestinesGeometry(INTESTINE_CENTER_Y)),
    [sex],
  );

  /**
   * Pelvis: the two iliac blades plus the pubic arch, built from tubes
   * rather than the sphere this used to be — the iliac crest flare is most
   * of what makes a pelvis recognisable, and it also gives the hip joints
   * and femurs something anatomically plausible to attach to.
   */
  const pelvisBoneGeometry = useMemo(
    () =>
      sexedGeometry(sex, 'pelvis.bone', () => {
        const w = pelvisWidth;
        const crest = (sign: 1 | -1) =>
          buildTubeThrough(
            [
              [sign * 0.028 * w, 0.95, -0.058],
              [sign * 0.092 * w, 0.958, -0.018],
              [sign * 0.112 * w, 0.942, 0.036],
              [sign * 0.092 * w, 0.898, 0.058],
              [sign * 0.052 * w, 0.864, 0.048],
            ],
            0.014,
            { radialSegments: 8, tubularSegments: 40 },
          );
        const arch = buildTubeThrough(
          [
            [-0.052 * w, 0.864, 0.048],
            [0, 0.844, 0.06],
            [0.052 * w, 0.864, 0.048],
          ],
          0.012,
          { radialSegments: 8, tubularSegments: 24 },
        );
        const sacrum = buildTubeThrough(
          [
            [0, 0.955, -0.062],
            [0, 0.905, -0.05],
            [0, 0.868, -0.03],
          ],
          0.019,
          { radialSegments: 8, tubularSegments: 20 },
        );
        return mergeAll([crest(1), crest(-1), arch, sacrum]);
      }),
    [sex, pelvisWidth],
  );

  const kidneyGeometry = useMemo(
    () => sexedGeometry(sex, 'abdomen.kidney', () => buildKidneyGeometry(0.036 * organScale)),
    [sex, organScale],
  );

  const hipJointGeometry = useMemo(
    () => sexedGeometry(sex, 'pelvis.hipJoint', () => buildOrganicBlob({ radius: 0.028, lumpiness: 0.04, detail: 2 })),
    [sex],
  );

  return (
    <group>
      <SelectableMesh nodeId="body.abdomen" geometry={abdomenGeometry} tissue="skinScan" />
      <SelectableMesh nodeId="body.pelvis" geometry={pelvisShellGeometry} tissue="skinScan" />
      <SelectableMesh nodeId="body.pelvis" geometry={pelvisBoneGeometry} tissue="bone" />

      {/* Liver sits high on the patient's RIGHT (-X), tucked under the diaphragm. */}
      <SelectableMesh
        nodeId="body.abdomen.liver"
        geometry={liverGeometry}
        tissue="liver"
        position={[-0.03, 1.045, 0.028]}
        rotation={[0, 0, -0.12]}
      />
      <SelectableMesh
        nodeId="body.abdomen.stomach"
        geometry={stomachGeometry}
        tissue="stomach"
        position={[0.055, 1.035, 0.012]}
        rotation={[0, 0, 0.25]}
      />
      <SelectableMesh nodeId="body.abdomen.intestines" geometry={intestinesGeometry} tissue="intestine" />

      {/*
        One canonical kidney, mirrored on X for the other side, so the pair
        cannot drift into two different shapes. Negating the scale alongside
        the already-mirrored rotation is what makes this a true reflection
        rather than a rotated copy.
      */}
      {(['left', 'right'] as const).map((side) => (
        <SelectableMesh
          key={side}
          nodeId={`body.abdomen.kidneys.${side}`}
          geometry={kidneyGeometry}
          tissue="kidney"
          position={[SIDE_SIGN[side] * 0.062, 1.01, -0.05]}
          rotation={[0, 0, SIDE_SIGN[side] * 0.14]}
          scale={[SIDE_SIGN[side], 1, 1]}
        />
      ))}

      {(['left', 'right'] as const).map((side) => (
        <SelectableMesh
          key={side}
          nodeId={`body.pelvis.hip.${side}`}
          geometry={hipJointGeometry}
          tissue="joint"
          position={hipPosition(side)}
        />
      ))}

      <ReproductiveOrgans sex={sex} />
    </group>
  );
}

/**
 * The pelvic organs that differ between the two anatomies. These are the
 * reason a sex switch matters clinically rather than cosmetically: a
 * pelvic ultrasound or PSA result has nowhere to attach without them.
 */
function ReproductiveOrgans({ sex }: { sex: BodySex }) {
  const uterus = useMemo(
    () =>
      sexedGeometry(sex, 'pelvis.uterus', () => {
        // Inverted pear, with the fallopian tubes sweeping out to each ovary.
        const body = buildOrganicBlob({ radius: 0.026, scale: [0.82, 1.05, 0.62], lumpiness: 0.05, detail: 3 });
        body.translate(0, 0.878, 0.012);
        const tube = (sign: 1 | -1) =>
          buildTubeThrough(
            [
              [sign * 0.016, 0.895, 0.012],
              [sign * 0.036, 0.902, 0.004],
              [sign * 0.05, 0.893, -0.004],
            ],
            0.0042,
            { radialSegments: 6, tubularSegments: 16 },
          );
        return mergeAll([body, tube(1), tube(-1)]);
      }),
    [sex],
  );

  const ovaries = useMemo(
    () =>
      sexedGeometry(sex, 'pelvis.ovaries', () =>
        mergeAll(
          [1, -1].map((sign) => {
            const o = buildOrganicBlob({ radius: 0.011, scale: [1, 0.8, 0.7], lumpiness: 0.08, phase: sign, detail: 2 });
            o.translate(sign * 0.056, 0.891, -0.006);
            return o;
          }),
        ),
      ),
    [sex],
  );

  const prostate = useMemo(
    () =>
      sexedGeometry(sex, 'pelvis.prostate', () => {
        const g = buildOrganicBlob({ radius: 0.019, scale: [1, 0.82, 0.9], lumpiness: 0.06, detail: 3 });
        g.translate(0, 0.856, 0.006);
        return g;
      }),
    [sex],
  );

  if (sex === 'female') {
    return (
      <group>
        <SelectableMesh nodeId="body.pelvis.uterus" geometry={uterus} tissue="organGeneric" />
        <SelectableMesh nodeId="body.pelvis.ovaries" geometry={ovaries} tissue="organGeneric" />
      </group>
    );
  }
  return <SelectableMesh nodeId="body.pelvis.prostate" geometry={prostate} tissue="organGeneric" />;
}
