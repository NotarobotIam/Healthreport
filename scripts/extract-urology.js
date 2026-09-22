// Packs the kidneys, ureters, bladder, urethra, prostate, seminal vesicles, testes and epididymis out of
// the full BodyParts3D atlas into a small file the Urology page can load quickly (the whole atlas is
// ~35 MB; this is about 0.3 MB). Same technique as scripts/extract-heart.js — see that file for the
// fuller write-up of why (and how) this works.
//
//   node scripts/extract-urology.js
//
// Reads digital-twin/public/models/atlas.json and body-*.bin.gz, writes urology.json and urology.bin.gz
// next to them. BodyParts3D 4.0 © The Database Center for Life Science, CC BY 4.0 (see
// digital-twin/public/ATTRIBUTION.md). This is the adult-male-only reference model, so there is no
// equivalent female geometry to extract — see the Urology page's own SVG diagram for that side.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIR = path.join(__dirname, '..', 'digital-twin', 'public', 'models');
const atlas = JSON.parse(fs.readFileSync(path.join(DIR, 'atlas.json'), 'utf8'));
const byId = new Map(atlas.parts.map((p) => [p.id, p]));

const STRUCTURES = [
  { id: 'left-kidney', name: 'Left kidney', layer: 'kidneys', side: 'left', parts: ['FJ3145'] },
  { id: 'right-kidney', name: 'Right kidney', layer: 'kidneys', side: 'right', parts: ['FJ3147'] },
  { id: 'left-ureter', name: 'Left ureter', layer: 'ureters', side: 'left', parts: ['FJ3144'] },
  { id: 'right-ureter', name: 'Right ureter', layer: 'ureters', side: 'right', parts: ['FJ3146'] },
  { id: 'bladder', name: 'Bladder', layer: 'bladder', parts: ['FJ3149'] },
  { id: 'urethra', name: 'Urethra', layer: 'bladder', parts: ['FJ3148'] },
  { id: 'prostate', name: 'Prostate', layer: 'prostate', parts: ['FJ3139'] },
  { id: 'left-seminal-vesicle', name: 'Left seminal vesicle', layer: 'prostate', side: 'left', parts: ['FJ3137'] },
  { id: 'right-seminal-vesicle', name: 'Right seminal vesicle', layer: 'prostate', side: 'right', parts: ['FJ3143'] },
  { id: 'left-testis', name: 'Left testis', layer: 'testes', side: 'left', parts: ['FJ3138'] },
  { id: 'right-testis', name: 'Right testis', layer: 'testes', side: 'right', parts: ['FJ3142'] },
  { id: 'left-epididymis', name: 'Left epididymis', layer: 'testes', side: 'left', parts: ['FJ3136'] },
  { id: 'right-epididymis', name: 'Right epididymis', layer: 'testes', side: 'right', parts: ['FJ3141'] },
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

// Safety net: every source part must sit in the lower abdomen/pelvis, around these organs — a stray part
// (picked up by a future careless edit) would otherwise float somewhere else in the viewer unnoticed, the
// same class of bug the heart extraction caught (a splenic artery slipping in via a loose system+chunk filter).
for (const s of STRUCTURES) for (const id of s.parts) {
  const b = byId.get(id).bounds;
  if (b[0][1] < 0.72 || b[1][1] > 1.22 || b[0][0] < -0.11 || b[1][0] > 0.11) throw new Error(`${s.id}: ${id} (${byId.get(id).name}) is outside the expected region`);
}

const lo = [Infinity, Infinity, Infinity];
const hi = [-Infinity, -Infinity, -Infinity];
for (const s of STRUCTURES) for (const id of s.parts) {
  const b = byId.get(id).bounds;
  for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], b[0][a]); hi[a] = Math.max(hi[a], b[1][a]); }
}

const bin = Buffer.concat(pieces);
fs.writeFileSync(path.join(DIR, 'urology.bin.gz'), zlib.gzipSync(bin, { level: 9 }));
fs.writeFileSync(path.join(DIR, 'urology.json'), JSON.stringify({ source: 'BodyParts3D 4.0 (CC BY 4.0)', bytes: bin.length, bounds: [lo, hi], parts: out }));
const tris = out.reduce((n, p) => n + p.indexCount / 3, 0);
console.log(`${out.length} structures, ${tris} triangles, ${(bin.length / 1e6).toFixed(2)} MB raw, ${(fs.statSync(path.join(DIR, 'urology.bin.gz')).size / 1e6).toFixed(2)} MB gzipped`);
console.log('bounds', lo.map((n) => n.toFixed(3)), hi.map((n) => n.toFixed(3)));
