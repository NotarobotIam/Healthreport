export function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.48} />
      <directionalLight
        position={[2.5, 4, 3]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* Cool cyan rim light + a faint warm accent — restrained HUD accent colors on the key light only, not the whole scene. */}
      <directionalLight position={[-3, 2, -2.2]} intensity={0.28} color="#3ee6e0" />
      <pointLight position={[0, 1.3, 2.2]} intensity={0.2} color="#f5a623" distance={6} />
    </>
  );
}
