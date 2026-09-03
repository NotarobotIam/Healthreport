import { Head } from './Head';
import { Neck } from './Neck';
import { Torso } from './Torso';
import { AbdomenPelvis } from './AbdomenPelvis';
import { Musculature } from './Musculature';
import { Vasculature } from './Vasculature';
import { Arm } from './Arm';
import { Glutes, Leg } from './Leg';

/**
 * Everything in the digital twin is always mounted, at every navigation
 * depth — "drilling in" is purely a camera move (see scene/CameraRig.tsx)
 * plus dimming non-focused regions (see hooks/useAnatomyNode.ts's
 * useNodeEmphasis), never a mount/unmount of scene content. That matches
 * how the reference platform behaves (the whole body is always there, a
 * zoomed panel is just a camera framing) and avoids any risk of the
 * raycast/camera object registry going stale from mount churn.
 *
 * Layer order below is inside-out — skeleton and organs, then muscle, then
 * vessels, then the translucent skin shells that each region carries — so
 * that turning the transparency slider up peels the body in an
 * anatomically sensible order.
 */
export function BodyRoot() {
  return (
    <group>
      <Head />
      <Neck />
      <Torso />
      <AbdomenPelvis />
      <Musculature />
      <Vasculature />
      <Glutes />
      <Arm side="left" />
      <Arm side="right" />
      <Leg side="left" />
      <Leg side="right" />
    </group>
  );
}
