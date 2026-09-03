import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildOrganicBlob, buildProfiledForm, buildTubeThrough, type ProfilePoint } from './anatomicalForms';

/**
 * Builders for the specific organs whose recognisable shape IS the point —
 * a brain without gyri, a gut without coils, or a ribcage without curved
 * ribs reads as a placeholder sphere no matter how it's shaded. Generic
 * shape tools live in anatomicalForms.ts; this file is where those tools
 * get composed into named anatomy.
 *
 * Still procedural approximations, not scan-derived meshes.
 */

/**
 * Merges parts into one geometry, normalizing indexing first.
 *
 * This normalization is load-bearing, not defensive tidiness:
 * `mergeGeometries` requires an index attribute on ALL inputs or NONE, and
 * silently returns null otherwise. THREE's polyhedron-derived geometries
 * (IcosahedronGeometry, the basis of every organic blob here) are
 * non-indexed while TubeGeometry and our own lofts are indexed — so any
 * organ mixing a blob with a tube (brain + brainstem, heart + great
 * vessels, stomach + duodenum, foot + heel) merged to null and rendered as
 * an EMPTY mesh. That failure is invisible to both tsc and the bundler,
 * which is exactly how it survived into a "successful" build once already.
 */
export function mergeAll(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  const merged = mergeGeometries(normalized, false);

  for (let i = 0; i < parts.length; i++) {
    if (normalized[i] !== parts[i]) normalized[i].dispose();
    parts[i].dispose();
  }

  if (!merged) {
    // Loud rather than silent: an empty geometry renders as nothing at all,
    // which looks like a missing body part rather than like an error.
    console.error('[anatomy] geometry merge failed — an organ will be missing from the scene.');
    return new THREE.BufferGeometry();
  }
  return merged;
}

/**
 * One cerebral hemisphere. The convoluted surface comes from a wandering
 * ridge function — `sin(9u + 3sin(5v))`, whose inner term bends the ridge
 * lines instead of letting them run as clean latitude stripes — which is
 * what makes the result read as gyri and sulci rather than as a golf ball.
 */
function buildHemisphere(radius: number, sign: 1 | -1): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(radius, 4);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    const n = v.clone().normalize();

    const u = Math.atan2(n.z, n.x);
    const w = Math.acos(THREE.MathUtils.clamp(n.y, -1, 1));

    const gyri =
      Math.sin(9 * u + 3 * Math.sin(5 * w)) * 0.5 +
      Math.sin(11 * w + 2.5 * Math.sin(4 * u)) * 0.36 +
      Math.sin(15 * u + 7 * w) * 0.16;

    // Ridges flatten out toward the midline so the two hemispheres meet in
    // a clean longitudinal fissure instead of interpenetrating.
    const midlineFade = THREE.MathUtils.smoothstep(Math.abs(n.x), 0.05, 0.42);
    v.multiplyScalar(1 + gyri * 0.05 * midlineFade);

    // Ellipsoidal: a brain is markedly longer front-to-back than it is wide
    // or tall, and its underside is flat where it rests on the skull base.
    const flatBase = n.y < 0 ? 1 + n.y * 0.28 : 1;
    position.setXYZ(i, v.x * 0.5 + sign * radius * 0.48, v.y * 0.8 * flatBase, v.z * 1.22);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** Cerebrum (two gyrified hemispheres) + cerebellum + brainstem. */
export function buildBrainGeometry(radius: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [buildHemisphere(radius, 1), buildHemisphere(radius, -1)];

  // Cerebellum: a pair of tightly-foliated lobes tucked under the back of
  // the cerebrum. Higher ridge frequency, smaller amplitude than cortex.
  for (const sign of [1, -1] as const) {
    const lobe = buildOrganicBlob({
      radius: radius * 0.34,
      scale: [1, 0.72, 0.9],
      lumpiness: 0.2,
      phase: sign * 1.7,
      detail: 3,
    });
    lobe.translate(sign * radius * 0.3, -radius * 0.62, -radius * 0.66);
    parts.push(lobe);
  }

  const brainstem = buildTubeThrough(
    [
      [0, -radius * 0.35, -radius * 0.2],
      [0, -radius * 0.7, -radius * 0.3],
      [0, -radius * 1.15, -radius * 0.32],
    ],
    radius * 0.13,
    { radialSegments: 10 },
  );
  parts.push(brainstem);

  return mergeAll(parts);
}

export interface RibcageOptions {
  /** World Y the topmost rib pair meets the spine. */
  topY: number;
  /** World Y the lowest rib pair meets the spine. */
  bottomY: number;
  /** Half-width of the widest rib pair. */
  maxHalfWidth: number;
  /** Half-depth (front-to-back) of the widest rib pair. */
  maxHalfDepth: number;
}

/**
 * Twelve rib pairs sweeping from the spine around and DOWNWARD to the
 * sternum, plus the sternum itself. The downward sweep matters: ribs that
 * sit in flat horizontal planes read as a barrel, which is exactly what the
 * previous stacked-torus version looked like.
 *
 * Rib length follows real costal anatomy — pairs 1-7 reach the sternum,
 * 8-10 stop short at the costal margin, and 11-12 float free.
 */
export function buildRibcageGeometry(opts: RibcageOptions): THREE.BufferGeometry {
  const { topY, bottomY, maxHalfWidth, maxHalfDepth } = opts;
  const parts: THREE.BufferGeometry[] = [];
  const pairCount = 12;

  for (let i = 0; i < pairCount; i++) {
    const t = i / (pairCount - 1);
    const spineY = THREE.MathUtils.lerp(topY, bottomY, t);

    // Cage widens over the upper ribs, then tucks back in over the floating pairs.
    const widthScale = 0.62 + 0.38 * Math.sin(Math.min(1, t * 1.35) * Math.PI * 0.72);
    const halfWidth = maxHalfWidth * widthScale;
    const halfDepth = maxHalfDepth * widthScale;

    // How far around the chest this pair reaches: true -> costal -> floating.
    const sweep = i <= 6 ? 1 : i <= 9 ? 0.82 : 0.5;
    const drop = (0.035 + t * 0.03) * sweep;

    for (const side of [1, -1] as const) {
      const points: Array<[number, number, number]> = [];
      const steps = 9;
      for (let s = 0; s <= steps; s++) {
        const a = (s / steps) * Math.PI * sweep;
        points.push([
          side * halfWidth * Math.sin(a),
          spineY - drop * Math.pow(s / steps, 1.35),
          -halfDepth * Math.cos(a) * (a > Math.PI * 0.5 ? 0.86 : 1),
        ]);
      }
      parts.push(buildTubeThrough(points, 0.0062, { radialSegments: 6, tubularSegments: 26 }));
    }
  }

  const sternumTopY = topY - 0.02;
  const sternum = buildProfiledForm({
    topY: sternumTopY,
    bottomY: sternumTopY - 0.17,
    profile: [
      { t: 0, rx: 0.022, rz: 0.007 },
      { t: 0.35, rx: 0.026, rz: 0.008 },
      { t: 0.8, rx: 0.019, rz: 0.007 },
      { t: 1, rx: 0.011, rz: 0.006 },
    ],
    offsetZ: maxHalfDepth * 0.9,
    radialSegments: 12,
    slices: 10,
  });
  parts.push(sternum);

  return mergeAll(parts);
}

/** A stack of vertebrae plus intervertebral discs, rather than one smooth capsule. */
export function buildSpineGeometry(topY: number, bottomY: number, backZ: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const count = 17;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const y = THREE.MathUtils.lerp(topY, bottomY, t);
    // Lumbar vertebrae are visibly larger than thoracic ones.
    const scale = 0.7 + t * 0.5;
    // Natural sagittal curve: thoracic kyphosis back, lumbar lordosis forward.
    const z = backZ + Math.sin(t * Math.PI * 1.6) * 0.012;

    const body = new THREE.CylinderGeometry(0.016 * scale, 0.016 * scale, 0.019, 10);
    body.translate(0, y, z);
    parts.push(body);

    const process = new THREE.BoxGeometry(0.007, 0.016, 0.022 * scale);
    process.translate(0, y - 0.004, z - 0.019 * scale);
    parts.push(process);
  }

  return mergeAll(parts);
}

/**
 * Large intestine framing the abdomen (ascending / transverse / descending
 * / sigmoid) wrapped around a coiled small intestine. The coil is generated
 * from a fixed descending spiral, so it packs the abdominal cavity the way
 * jejunum and ileum actually do instead of reading as one smooth loop.
 */
export function buildIntestinesGeometry(centerY: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const colonRadius = 0.019;

  const colonPath: Array<[number, number, number]> = [
    [-0.085, centerY - 0.075, 0.015], // cecum, lower right (patient's right = -X)
    [-0.095, centerY - 0.02, 0.02], // ascending
    [-0.092, centerY + 0.045, 0.022],
    [-0.06, centerY + 0.068, 0.028], // hepatic flexure
    [0, centerY + 0.075, 0.03], // transverse
    [0.062, centerY + 0.066, 0.028], // splenic flexure
    [0.094, centerY + 0.04, 0.022],
    [0.096, centerY - 0.025, 0.02], // descending
    [0.075, centerY - 0.075, 0.018],
    [0.03, centerY - 0.095, 0.012], // sigmoid
    [0, centerY - 0.105, 0.005],
  ];
  parts.push(buildTubeThrough(colonPath, colonRadius, { radialSegments: 9, tubularSegments: 90 }));

  const coilPath: Array<[number, number, number]> = [];
  const loops = 26;
  for (let i = 0; i <= loops; i++) {
    const a = i * 1.05;
    const r = 0.036 + Math.sin(i * 0.62) * 0.019;
    coilPath.push([
      Math.cos(a) * r,
      centerY + 0.048 - (i / loops) * 0.115,
      Math.sin(a) * r * 0.55 + 0.022,
    ]);
  }
  parts.push(buildTubeThrough(coilPath, 0.0135, { radialSegments: 8, tubularSegments: 190 }));

  return mergeAll(parts);
}

/** Heart: rounded atrial base tapering to the apex, with the great vessels leaving the top. */
export function buildHeartGeometry(scale: number): THREE.BufferGeometry {
  const profile: ProfilePoint[] = [
    { t: 0, rx: 0.6, rz: 0.55 },
    { t: 0.14, rx: 0.78, rz: 0.68 },
    { t: 0.34, rx: 0.86, rz: 0.72 }, // ventricular mass at its widest
    { t: 0.58, rx: 0.74, rz: 0.63 },
    { t: 0.8, rx: 0.48, rz: 0.42 },
    { t: 1, rx: 0.09, rz: 0.09 }, // apex
  ].map((p) => ({ ...p, rx: p.rx * scale, rz: (p.rz ?? p.rx) * scale }));

  const parts: THREE.BufferGeometry[] = [
    buildProfiledForm({ topY: scale * 0.95, bottomY: -scale * 1.15, profile, radialSegments: 24, slices: 22 }),
  ];

  // Atrial appendages — the two soft lobes that sit on top of the ventricles.
  for (const sign of [1, -1] as const) {
    const atrium = buildOrganicBlob({
      radius: scale * 0.36,
      scale: [1, 0.78, 0.9],
      lumpiness: 0.1,
      phase: sign * 0.8,
      detail: 2,
    });
    atrium.translate(sign * scale * 0.44, scale * 0.78, -scale * 0.1);
    parts.push(atrium);
  }

  // Aortic root + pulmonary trunk.
  const aorticRoot = buildTubeThrough(
    [
      [0, scale * 0.7, 0],
      [scale * 0.1, scale * 1.15, -scale * 0.1],
      [scale * 0.16, scale * 1.5, -scale * 0.24],
    ],
    scale * 0.19,
    { radialSegments: 10 },
  );
  parts.push(aorticRoot);

  return mergeAll(parts);
}

/**
 * A lung: narrow apex, broad base, with the medial face flattened where it
 * meets the mediastinum and a domed underside sitting on the diaphragm.
 * `notch` carves the cardiac notch out of the left lung's medial border.
 */
export function buildLungGeometry(height: number, sign: 1 | -1, notch: boolean): THREE.BufferGeometry {
  const geometry = buildProfiledForm({
    topY: height * 0.5,
    bottomY: -height * 0.5,
    profile: [
      { t: 0, rx: 0.018, rz: 0.02 }, // apex, above the clavicle
      { t: 0.16, rx: 0.038, rz: 0.043 },
      { t: 0.42, rx: 0.05, rz: 0.056 },
      { t: 0.72, rx: 0.056, rz: 0.061 },
      { t: 0.93, rx: 0.056, rz: 0.058 },
      { t: 1, rx: 0.046, rz: 0.046 }, // diaphragmatic base
    ],
    radialSegments: 24,
    slices: 22,
  });

  const position = geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    // Flatten the medial surface (the side facing the heart).
    const medial = sign > 0 ? -v.x : v.x;
    if (medial > 0) v.x *= 0.52;
    if (notch && medial > 0 && v.y > -height * 0.1 && v.y < height * 0.22) {
      v.x *= 0.55;
      v.z *= 0.86;
    }
    position.setXYZ(i, v.x, v.y, v.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Kidney: bean-shaped, with the hilum indented on one side.
 *
 * Built in ONE canonical orientation (hilum facing -X) and mirrored by the
 * component for the other side, rather than taking a side parameter. The
 * base form is an organic blob whose surface harmonics are not symmetric
 * about X, so building each side separately produced two subtly DIFFERENT
 * kidneys rather than a mirrored pair — the same trap the arms and eyes
 * fell into. Mirroring at the group level makes that unrepresentable.
 */
export function buildKidneyGeometry(scale: number): THREE.BufferGeometry {
  const geometry = buildOrganicBlob({
    radius: scale,
    scale: [0.62, 1.25, 0.72],
    lumpiness: 0.05,
    phase: 0.4,
    detail: 3,
  });

  const position = geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    // Concave hilum: pull the -X face back toward the organ's axis,
    // strongest at mid-height, giving the bean its notch.
    if (v.x < 0) {
      const band = Math.exp(-Math.pow(v.y / (scale * 0.42), 2));
      v.x += band * scale * 0.3;
    }
    position.setXYZ(i, v.x, v.y, v.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** Liver: a large right-sided wedge with the falciform notch splitting its lobes. */
export function buildLiverGeometry(scale: number): THREE.BufferGeometry {
  const geometry = buildOrganicBlob({
    radius: scale,
    scale: [1.55, 0.62, 0.78],
    lumpiness: 0.07,
    phase: 2.1,
    detail: 3,
  });

  const position = geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    // Wedge: the left lobe thins out as it crosses the midline.
    const taper = THREE.MathUtils.clamp(1 - (v.x / (scale * 1.55)) * 0.55, 0.42, 1.25);
    v.y *= taper;
    v.z *= THREE.MathUtils.clamp(taper * 1.05, 0.5, 1.15);
    // Falciform ligament notch on the anterior surface.
    if (v.z > 0 && Math.abs(v.x - scale * 0.25) < scale * 0.16) v.z *= 0.84;
    position.setXYZ(i, v.x, v.y, v.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** Stomach: the J-shaped body plus its outflow into the duodenum. */
export function buildStomachGeometry(scale: number): THREE.BufferGeometry {
  const body = buildOrganicBlob({
    radius: scale,
    scale: [0.82, 1.15, 0.72],
    lumpiness: 0.08,
    phase: 1.1,
    detail: 3,
  });

  const position = body.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    // Curve the greater curvature around, giving the organ its J profile.
    v.x += Math.pow(THREE.MathUtils.clamp(-v.y / scale, 0, 1.2), 1.6) * scale * 0.5;
    position.setXYZ(i, v.x, v.y, v.z);
  }
  position.needsUpdate = true;
  body.computeVertexNormals();

  const duodenum = buildTubeThrough(
    [
      [scale * 0.42, -scale * 0.85, 0],
      [scale * 0.6, -scale * 1.15, scale * 0.1],
      [scale * 0.35, -scale * 1.45, scale * 0.15],
    ],
    scale * 0.16,
    { radialSegments: 8 },
  );

  return mergeAll([body, duodenum]);
}

/**
 * A long bone: narrow diaphysis flaring into condyles at both ends. Real
 * limb bones are never constant-radius, and the flare is what makes a limb
 * read as skeletal rather than as a dowel — it also gives the joint spheres
 * something to actually meet.
 */
export function buildLongBoneGeometry(
  topY: number,
  bottomY: number,
  shaftRadius: number,
  opts?: { topFlare?: number; bottomFlare?: number; offsetX?: number; offsetZ?: number },
): THREE.BufferGeometry {
  const topFlare = opts?.topFlare ?? 1.65;
  const bottomFlare = opts?.bottomFlare ?? 1.5;
  return buildProfiledForm({
    topY,
    bottomY,
    profile: [
      { t: 0, rx: shaftRadius * topFlare * 0.86 },
      { t: 0.06, rx: shaftRadius * topFlare },
      { t: 0.2, rx: shaftRadius * 1.02 },
      { t: 0.5, rx: shaftRadius },
      { t: 0.82, rx: shaftRadius * 1.04 },
      { t: 0.95, rx: shaftRadius * bottomFlare },
      { t: 1, rx: shaftRadius * bottomFlare * 0.84 },
    ],
    offsetX: opts?.offsetX,
    offsetZ: opts?.offsetZ,
    radialSegments: 14,
    slices: 16,
  });
}
