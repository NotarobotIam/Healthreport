import { useMemo } from 'react';
import * as THREE from 'three';

const DEEP_COLOR = new THREE.Color('#080b11');
const HORIZON_COLOR = new THREE.Color('#24374d');
const RADIUS = 40;
const HORIZON_Y = 1.4;

function buildBackdropGeometry() {
  const geometry = new THREE.SphereGeometry(RADIUS, 32, 24);
  const position = geometry.attributes.position;
  const colors: number[] = [];
  const mixed = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    const t = 1 - THREE.MathUtils.clamp(Math.abs(y - HORIZON_Y) / RADIUS, 0, 1);
    mixed.copy(DEEP_COLOR).lerp(HORIZON_COLOR, t);
    colors.push(mixed.r, mixed.g, mixed.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

/**
 * Large inverted sphere with a vertex-colored horizon glow, standing in for
 * a flat background fill. A single flat `<color>` reads as "nothing
 * rendered" (a small hex tweak alone still looked solid black) — this gives
 * the void actual gradient/depth without any texture asset, consistent with
 * the rest of this build's fully-procedural geometry. `fog={false}` keeps
 * the scene fog (meant to fade the floor grid into the distance) from
 * flattening this back to a single flat color.
 */
export function ViewportBackdrop() {
  const geometry = useMemo(() => buildBackdropGeometry(), []);
  return (
    <mesh geometry={geometry} renderOrder={-1}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
}
