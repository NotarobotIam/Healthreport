// Packs just the heart, and the vessels around it, out of the full BodyParts3D atlas into a small file that the
// Physiology page can load quickly (the whole atlas is ~35 MB; the heart is about 1 MB).
//
//   node scripts/extract-heart.js
//
// Reads digital-twin/public/models/atlas.json and body-*.bin.gz, writes heart.json and heart.bin.gz next to them.
// BodyParts3D 4.0 © The Database Center for Life Science, CC BY 4.0 (see digital-twin/public/ATTRIBUTION.md).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIR = path.join(__dirname, '..', 'digital-twin', 'public', 'models');
const atlas = JSON.parse(fs.readFileSync(path.join(DIR, 'atlas.json'), 'utf8'));
const byId = new Map(atlas.parts.map((p) => [p.id, p]));

// Each output structure: a stable id, a friendly name, the layer it belongs to, and the source parts to merge.
const RIGHT_CORONARY = /right coronary artery|right posterior interventricular|Marginal branch of right/i;
// Chunk 9 also holds arteries and veins from elsewhere in the body (a splenic artery, for one), so anything
// picked by system must also lie in the chest, at the height of the heart.
const nearHeart = (p) => p.bounds[0][1] > 1.2 && p.bounds[1][1] < 1.4;
const fromNames = (test) => atlas.parts.filter((p) => nearHeart(p) && test(p)).map((p) => p.id);
const STRUCTURES = [
  { id: 'ventricles', name: 'Ventricle walls', layer: 'muscle', parts: ['FJ2428'] },
  { id: 'left-atrium-wall', name: 'Left atrium wall', layer: 'muscle', parts: ['FJ2438'] },
  { id: 'right-atrium-wall', name: 'Right atrium wall', layer: 'muscle', parts: ['FJ2439'] },
  { id: 'left-ventricle', name: 'Left ventricle', layer: 'chambers', side: 'left', parts: ['FJ2422'] },
  { id: 'right-ventricle', name: 'Right ventricle', layer: 'chambers', side: 'right', parts: ['FJ2423'] },
  { id: 'left-atrium', name: 'Left atrium', layer: 'chambers', side: 'left', parts: ['FJ2425'] },
  { id: 'right-atrium', name: 'Right atrium', layer: 'chambers', side: 'right', parts: ['FJ2424'] },
  { id: 'aortic-valve', name: 'Aortic valve', layer: 'valves', parts: ['FJ2426', 'FJ2431', 'FJ2435'] },
  { id: 'pulmonary-valve', name: 'Pulmonary valve', layer: 'valves', parts: ['FJ2417', 'FJ2427', 'FJ2434'] },
  { id: 'mitral-valve', name: 'Mitral valve', layer: 'valves', parts: ['FJ2420', 'FJ2432'] },
  { id: 'tricuspid-valve', name: 'Tricuspid valve', layer: 'valves', parts: ['FJ2421', 'FJ2433', 'FJ2436'] },
  { id: 'papillary-muscles', name: 'Papillary muscles', layer: 'valves', parts: ['FJ2418', 'FJ2419', 'FJ2429', 'FJ2430', 'FJ2437'] },
  { id: 'left-coronary', name: 'Left coronary artery', layer: 'coronary', side: 'left', parts: fromNames((p) => p.system === 'arterial' && p.chunk === 9 && !RIGHT_CORONARY.test(p.name)) },
  { id: 'right-coronary', name: 'Right coronary artery', layer: 'coronary', side: 'left', parts: fromNames((p) => p.system === 'arterial' && p.chunk === 9 && RIGHT_CORONARY.test(p.name)) },
  { id: 'cardiac-veins', name: 'Cardiac veins', layer: 'veins', side: 'right', parts: fromNames((p) => p.system === 'venous' && p.chunk === 9) },
  { id: 'ascending-aorta', name: 'Ascending aorta', layer: 'vessels', side: 'left', parts: ['FJ3413'] },
  { id: 'aortic-arch', name: 'Aortic arch', layer: 'vessels', side: 'left', parts: ['FJ3411'] },
  { id: 'brachiocephalic', name: 'Brachiocephalic artery', layer: 'vessels', side: 'left', parts: ['FJ3417'] },
  { id: 'pulmonary-trunk', name: 'Pulmonary trunk', layer: 'vessels', side: 'right', parts: ['FJ2966'] },
  { id: 'left-pulmonary-artery', name: 'Left pulmonary artery', layer: 'vessels', side: 'right', parts: ['FJ2924'] },
  { id: 'right-pulmonary-artery', name: 'Right pulmonary artery', layer: 'vessels', side: 'right', parts: ['FJ3019'] },
  { id: 'pulmonary-veins', name: 'Pulmonary veins', layer: 'vessels', side: 'left', parts: ['FJ2925', 'FJ2933', 'FJ2944', 'FJ2950', 'FJ2955', 'FJ3020', 'FJ3040'] },
  { id: 'superior-vena-cava', name: 'Superior vena cava', layer: 'vessels', side: 'right', parts: ['FJ3645'] },
  { id: 'inferior-vena-cava', name: 'Inferior vena cava', layer: 'vessels', side: 'right', parts: ['FJ3441'] },
];

const chunkCache = new Map();
const chunk = (i) => {
  if (!chunkCache.has(i)) {
    const raw = zlib.gunzipSync(fs.readFileSync(path.join(DIR, `body-${i}.bin.gz`)));
    if (raw.length !== atlas.chunks[i].bytes) throw new Error(`body-${i}.bin.gz has an unexpected size`);
    chunkCache.set(i, raw);
  }
  return chunkCache.get(i);
};

const pieces = [];
let offset = 0;
const out = STRUCTURES.map((s) => {
  if (s.parts.length === 0) throw new Error(`no source parts for ${s.id}`);
  let vertexTotal = 0;
  let indexTotal = 0;
  const srcs = s.parts.map((id) => {
    const p = byId.get(id);
    if (!p) throw new Error(`unknown part ${id}`);
    vertexTotal += p.vertexCount;
    indexTotal += p.indexCount;
    return p;
  });
  const positions = new Float32Array(vertexTotal * 3);
  const normals = new Int16Array(vertexTotal * 3);
  const indices = new Uint32Array(indexTotal);
  let v = 0;
  let ix = 0;
  for (const p of srcs) {
    const buf = chunk(p.chunk);
    // Copy out with slice(): typed-array views need aligned offsets and we must not keep the whole chunk alive.
    positions.set(new Float32Array(buf.buffer.slice(buf.byteOffset + p.positions, buf.byteOffset + p.positions + p.vertexCount * 12)), v * 3);
    normals.set(new Int16Array(buf.buffer.slice(buf.byteOffset + p.normals, buf.byteOffset + p.normals + p.vertexCount * 6)), v * 3);
    const src = new Uint32Array(buf.buffer.slice(buf.byteOffset + p.indices, buf.byteOffset + p.indices + p.indexCount * 4));
    for (let k = 0; k < src.length; k++) indices[ix + k] = src[k] + v;
    v += p.vertexCount;
    ix += p.indexCount;
  }
  // Layout: positions (float32, 4-aligned), normals (int16, padded to 4), indices (uint32).
  const pos = offset;
  pieces.push(Buffer.from(positions.buffer));
  offset += positions.byteLength;
  const nor = offset;
  pieces.push(Buffer.from(normals.buffer));
  offset += normals.byteLength;
  const pad = (4 - (offset % 4)) % 4;
  if (pad) { pieces.push(Buffer.alloc(pad)); offset += pad; }
  const idx = offset;
  pieces.push(Buffer.from(indices.buffer));
  offset += indices.byteLength;
  return { id: s.id, name: s.name, layer: s.layer, ...(s.side && { side: s.side }), vertexCount: vertexTotal, indexCount: indexTotal, positions: pos, normals: nor, indices: idx };
});

// Safety net: every structure must sit in the chest, around the heart. A stray part would float in the viewer.
for (const s of STRUCTURES) for (const id of s.parts) {
  const b = byId.get(id).bounds;
  if (b[0][1] < 1.1 || b[1][1] > 1.45 || b[0][0] < -0.12 || b[1][0] > 0.14) throw new Error(`${s.id}: ${id} (${byId.get(id).name}) is outside the chest`);
}

// Overall bounds, so the viewer can centre and frame the heart without measuring it.
const lo = [Infinity, Infinity, Infinity];
const hi = [-Infinity, -Infinity, -Infinity];
for (const s of STRUCTURES) for (const id of s.parts) {
  const b = byId.get(id).bounds;
  for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], b[0][a]); hi[a] = Math.max(hi[a], b[1][a]); }
}

const bin = Buffer.concat(pieces);
fs.writeFileSync(path.join(DIR, 'heart.bin.gz'), zlib.gzipSync(bin, { level: 9 }));
fs.writeFileSync(path.join(DIR, 'heart.json'), JSON.stringify({ source: 'BodyParts3D 4.0 (CC BY 4.0)', bytes: bin.length, bounds: [lo, hi], parts: out }));
const tris = out.reduce((n, p) => n + p.indexCount / 3, 0);
console.log(`${out.length} structures, ${tris} triangles, ${(bin.length / 1e6).toFixed(2)} MB raw, ${(fs.statSync(path.join(DIR, 'heart.bin.gz')).size / 1e6).toFixed(2)} MB gzipped`);
console.log('bounds', lo.map((n) => n.toFixed(3)), hi.map((n) => n.toFixed(3)));
