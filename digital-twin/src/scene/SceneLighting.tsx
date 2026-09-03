/**
 * Lighting is tuned for tissue rather than for metal: a strong warm key, a
 * soft cool fill opposite it, and a low front bounce so the underside of
 * the jaw, ribs, and limbs never crush to black. The previous rig leaned on
 * a saturated cyan rim, which tinted the (then blue-grey) shell attractively
 * but fights the warm skin/muscle palette this build uses now.
 */
export function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#dfe8f2', '#2a2118', 0.55]} />
      <directionalLight
        position={[2.5, 4, 3]}
        intensity={1.15}
        color="#fff3e6"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* Cool fill from behind-left, separating the figure from the backdrop. */}
      <directionalLight position={[-3, 2.2, -2.2]} intensity={0.42} color="#9fc4e8" />
      {/* Low front bounce so shadowed undersides stay readable. */}
      <pointLight position={[0, 0.9, 2.4]} intensity={0.35} color="#ffd9b8" distance={7} />
    </>
  );
}
