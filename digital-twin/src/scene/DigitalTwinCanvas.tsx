import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraRig } from './CameraRig';
import { SceneLighting } from './SceneLighting';
import { GridFloor } from './GridFloor';
import { ViewportBackdrop } from './ViewportBackdrop';
import { PhysiologyClock } from './PhysiologyClock';
import { BodyRoot } from './body/BodyRoot';

export function DigitalTwinCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ near: 0.001, far: 100, fov: 42, position: [0, 1.55, 3.3] }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#080b11']} />
      <fog attach="fog" args={['#121924', 4, 15]} />
      <ViewportBackdrop />
      <SceneLighting />
      <GridFloor />
      {/*
        Suspense has nothing to wait on today (every mesh below is built
        procedurally, synchronously). It's here because it's exactly what a
        future `useGLTF('/models/patient-scan.glb')` swap-in would need —
        see README "Replacing procedural anatomy with real scan assets".
      */}
      <Suspense fallback={null}>
        <BodyRoot />
      </Suspense>
      <PhysiologyClock />
      <CameraRig />
    </Canvas>
  );
}
