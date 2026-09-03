import { EyeGlobe } from './EyeGlobe';
import { EyeRetina } from './EyeRetina';
import { EyeAdnexa } from './EyeAdnexa';
import { SIDE_SIGN, orbitPosition } from '../../constants/bodyLayout';
import type { Side } from '../../constants/bodyLayout';

/**
 * Head -> Orbit -> Eye -> Eyeball, the second flagship demonstration. Both
 * eyes get the full cornea/sclera/iris/.../retina/optic nerve/muscles/
 * eyelids/lacrimal breakdown from the same components.
 *
 * The right eye is the LEFT eye's geometry mirrored on X by this group's
 * scale, exactly as the arms and legs are mirrored (see scene/body/Arm.tsx).
 * That is what makes each eye's nasal and temporal structures land on the
 * correct side: the optic disc sits nasally and the macula temporally in
 * BOTH eyes, which are opposite world directions. Hand-mirroring those
 * coordinates per eye would be a second source of truth for the same fact,
 * and the two would eventually disagree.
 *
 * Every tissue material is double-sided, so the mirrored side's inverted
 * triangle winding renders correctly — see scene/primitives/materials.ts.
 */
export function Eye({ side }: { side: Side }) {
  return (
    <group position={orbitPosition(side)} scale={[SIDE_SIGN[side], 1, 1]}>
      <EyeGlobe side={side} />
      <EyeRetina side={side} />
      <EyeAdnexa side={side} />
    </group>
  );
}
