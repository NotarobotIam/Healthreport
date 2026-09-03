import * as THREE from 'three';
import { buildOrganicBlob, buildProfiledForm, sculptFeatures, type SurfaceFeature } from './anatomicalForms';
import { mergeAll } from './organForms';
import { HEAD_PROFILE, SEX_SCALE } from '../../constants/bodyProfile';
import { BODY, type BodySex } from '../../constants/bodyLayout';

/**
 * The head, sculpted rather than lofted.
 *
 * A lofted profile alone produced a smooth egg with no face on it: lofts
 * yield elliptical cross-sections, and no ellipse has a nose. The loft is
 * still the right base — it gives the correct cranial vault, jaw taper, and
 * chin height — but the FACE is the set of local departures from it defined
 * below, applied by sculptFeatures().
 *
 * All landmarks are absolute world Y, matching the rest of the body, and
 * are authored for ONE side with `mirror: true` doing the other, so the
 * face cannot come out lopsided.
 *
 * Still a generic anatomical mannequin, not a scan of anyone — see the
 * README's geometry-provider seam for where real per-patient head geometry
 * would replace this.
 */

// Vertical landmarks. The head spans neckTopY (chin) to headTopY (crown).
const CHIN_Y = BODY.neckTopY; // 1.52
const BROW_Y = 1.652;
const EYE_Y = BODY.headCenterY - 0.006; // matches orbitPosition()
const NOSE_TIP_Y = 1.6;
const NOSE_BASE_Y = 1.592;
const MOUTH_Y = 1.557;
const CHIN_POINT_Y = 1.534;
const JAW_ANGLE_Y = 1.562;
const EAR_Y = 1.618;

/**
 * Per-sex expression of the features that actually differ between a male
 * and female skull: brow ridge prominence, jaw squareness, and nose size.
 * The chin is relatively more pointed on the female figure, which is why
 * its chin pad is narrower rather than simply smaller.
 */
function featureScale(sex: BodySex) {
  return sex === 'female'
    ? { brow: 0.45, jaw: 0.6, nose: 0.88, chinWidth: 0.82, cheek: 1.1 }
    : { brow: 1, jaw: 1, nose: 1, chinWidth: 1, cheek: 1 };
}

function faceFeatures(sex: BodySex): SurfaceFeature[] {
  const f = featureScale(sex);

  return [
    // Supraorbital ridge — one wide, shallow bar across both brows, which
    // is what makes the eyes read as set UNDER something rather than
    // painted on a curve.
    // Kept deliberately shallow: the base loft is already deeper at brow
    // height than at nose height, so a strong brow here ends up protruding
    // FURTHER than the nose tip, which reads as a heavy forehead.
    { center: [0, BROW_Y, 0.098], direction: [0, 0.25, 1], amount: 0.005 * f.brow, falloff: [0.058, 0.013, 0.055] },
    // Glabella, the small rise between the brows.
    { center: [0, BROW_Y - 0.004, 0.103], direction: [0, 0, 1], amount: 0.0015 * f.brow, falloff: [0.013, 0.012, 0.04] },

    // Orbits. Recessed sockets so each eyeball sits in a cavity instead of
    // resting on the surface. Depth is bounded by the eyeball itself — too
    // deep and the globe pokes back out through the skin.
    { center: [0.035, EYE_Y, 0.096], direction: [0, 0, -1], amount: 0.0075, falloff: [0.027, 0.019, 0.042], mirror: true },
    // Lateral orbital rim, giving the socket a defined outer edge.
    { center: [0.058, EYE_Y + 0.004, 0.078], direction: [0.6, 0, 1], amount: 0.0035, falloff: [0.016, 0.022, 0.03], mirror: true },

    // Nose: dorsum ridge from glabella down to the tip, then the tip, then
    // the alae. Built as three overlapping pieces because a single bump
    // gives a rounded knob rather than a nose.
    { center: [0, 1.618, 0.104], direction: [0, 0, 1], amount: 0.013 * f.nose, falloff: [0.011, 0.026, 0.05] },
    { center: [0, NOSE_TIP_Y, 0.107], direction: [0, -0.15, 1], amount: 0.017 * f.nose, falloff: [0.013, 0.011, 0.042] },
    { center: [0.013, NOSE_BASE_Y, 0.099], direction: [0.45, 0, 1], amount: 0.0055 * f.nose, falloff: [0.009, 0.009, 0.03], mirror: true },
    // Philtrum, the shallow groove from nose base to upper lip.
    { center: [0, 1.575, 0.094], direction: [0, 0, -1], amount: 0.0018, falloff: [0.007, 0.011, 0.03] },

    // Zygomatic arches — the cheekbones, set out and slightly forward.
    { center: [0.061, 1.617, 0.055], direction: [0.86, 0, 0.51], amount: 0.006 * f.cheek, falloff: [0.026, 0.019, 0.042], mirror: true },
    // Slight hollow beneath them, so the cheekbone reads as a ridge.
    { center: [0.052, 1.588, 0.062], direction: [0.8, 0, 0.6], amount: -0.0035, falloff: [0.022, 0.016, 0.035], mirror: true },

    // Lips, with the mouth line creased between them.
    { center: [0, MOUTH_Y + 0.006, 0.086], direction: [0, 0, 1], amount: 0.0045, falloff: [0.021, 0.006, 0.028] },
    { center: [0, MOUTH_Y - 0.005, 0.085], direction: [0, 0, 1], amount: 0.004, falloff: [0.019, 0.006, 0.028] },
    { center: [0, MOUTH_Y, 0.088], direction: [0, 0, -1], amount: 0.0022, falloff: [0.023, 0.0035, 0.026] },

    // Mental protuberance — the chin proper.
    // Tightly concentrated in Y: a broader chin pad bleeds up into the
    // crease above it, lifting both together so the chin never reads as
    // protruding at all.
    { center: [0, CHIN_POINT_Y + 0.0015, 0.052], direction: [0, -0.2, 1], amount: 0.026, falloff: [0.021 * f.chinWidth, 0.012, 0.038] },
    // Labiomental crease separating chin from lower lip.
    { center: [0, 1.549, 0.07], direction: [0, 0, -1], amount: 0.0045, falloff: [0.019, 0.0055, 0.026] },

    // Gonial angle — the corner of the jaw. Without it the jaw tapers
    // smoothly into the neck and the head loses its lower silhouette.
    { center: [0.056, JAW_ANGLE_Y, -0.004], direction: [0.9, -0.2, 0.1], amount: 0.009 * f.jaw, falloff: [0.024, 0.021, 0.04], mirror: true },
    // Jaw line running forward from that corner toward the chin.
    { center: [0.042, 1.545, 0.038], direction: [0.7, -0.3, 0.6], amount: 0.005 * f.jaw, falloff: [0.022, 0.013, 0.032], mirror: true },

    // Temples flatten above the cheekbones — skulls are not round there.
    { center: [0.081, 1.681, 0.032], direction: [1, 0, 0], amount: -0.005, falloff: [0.022, 0.032, 0.05], mirror: true },

    // Occiput: a fuller back of the skull, and the flattening where it
    // meets the neck below it.
    { center: [0, 1.668, -0.09], direction: [0, 0, -1], amount: 0.007, falloff: [0.062, 0.042, 0.05] },
    { center: [0, 1.545, -0.05], direction: [0, 0, 1], amount: 0.006, falloff: [0.05, 0.026, 0.04] },
  ];
}

/** Head and face. Width/depth scale with the model; height stays fixed so the head still meets the neck. */
export function buildHeadGeometry(sex: BodySex): THREE.BufferGeometry {
  const geometry = buildProfiledForm({
    topY: BODY.headTopY,
    bottomY: CHIN_Y,
    profile: HEAD_PROFILE,
    // High resolution: facial features are centimetre-scale, and a coarse
    // loft cannot resolve a nose or an orbital rim no matter how it is
    // sculpted.
    radialSegments: 56,
    slices: 48,
  });

  sculptFeatures(geometry, faceFeatures(sex));

  const s = SEX_SCALE[sex].head;
  if (s !== 1) {
    // X/Z only. Scaling Y as well would shorten the head and open a gap
    // above the neck, whose top is fixed by the shared body layout.
    geometry.scale(s, 1, s);
    geometry.computeVertexNormals();
  }
  return geometry;
}

/**
 * An ear: the outer helix as a thin vertical form, a raised antihelix
 * ridge, and the lobe. Flattened hard on X so it reads as a plate against
 * the skull rather than a ball stuck to the side of it.
 */
export function buildEarGeometry(): THREE.BufferGeometry {
  const helix = buildOrganicBlob({ radius: 0.023, scale: [0.3, 1.12, 0.66], lumpiness: 0.06, phase: 0.7, detail: 3 });
  const antihelix = buildOrganicBlob({ radius: 0.013, scale: [0.28, 1.0, 0.5], lumpiness: 0.05, phase: 2.1, detail: 2 });
  antihelix.translate(-0.002, 0.002, -0.004);
  const lobe = buildOrganicBlob({ radius: 0.009, scale: [0.34, 0.85, 0.7], lumpiness: 0.05, phase: 1.4, detail: 2 });
  lobe.translate(0, -0.024, 0.002);
  return mergeAll([helix, antihelix, lobe]);
}

export const EAR_POSITION_Y = EAR_Y;
