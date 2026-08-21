import { Grid } from '@react-three/drei';

/** Subtle technical-HUD reference grid on the ground plane. Purely decorative. */
export function GridFloor() {
  return (
    <Grid
      position={[0, 0, 0]}
      args={[10, 10]}
      cellSize={0.25}
      cellThickness={0.5}
      cellColor="#22384a"
      sectionSize={1}
      sectionThickness={1}
      sectionColor="#2f5871"
      fadeDistance={9}
      fadeStrength={1}
      infiniteGrid
    />
  );
}
