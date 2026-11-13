// Exports every model in src/three/models.ts as a binary glTF (.glb).
//
//   node --no-warnings scripts/three/export-glb.mjs
//
// A small glTF 2.0 writer is included here so nothing depends on browser APIs
// (three's GLTFExporter needs FileReader/Blob). Output opens in Blender,
// three.js, Babylon, Spline, Unity/Unreal (glTF importers), <model-viewer>.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import * as LOGO from "../../src/components/logoPath.ts";
import { buildAll, MATERIALS } from "../../src/three/models.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(root, "asset-library/3d/glb");
fs.mkdirSync(OUT, { recursive: true });

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const hexToLinear = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => +srgbToLinear(v / 255).toFixed(5));
};

const pad4 = (n) => (n + 3) & ~3;

const writeGlb = (model, file) => {
  const json = {
    asset: { version: "2.0", generator: "ProtoVinci code-built models (three.js geometry)" },
    scene: 0,
    scenes: [{ name: model.title, nodes: [] }],
    nodes: [],
    meshes: [],
    materials: [],
    accessors: [],
    bufferViews: [],
    buffers: [{ byteLength: 0 }],
  };
  const chunks = [];
  let offset = 0;
  const pushView = (typed, target) => {
    const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    const padded = Buffer.alloc(pad4(bytes.length));
    bytes.copy(padded);
    chunks.push(padded);
    json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target });
    offset += padded.length;
    return json.bufferViews.length - 1;
  };
  const matIndex = new Map();
  const material = (name) => {
    if (matIndex.has(name)) return matIndex.get(name);
    const m = MATERIALS[name];
    const entry = {
      name,
      pbrMetallicRoughness: { baseColorFactor: [...hexToLinear(m.color), 1], metallicFactor: m.metalness, roughnessFactor: m.roughness },
      doubleSided: true,
    };
    if (m.emissive) entry.emissiveFactor = hexToLinear(m.emissive).map((v) => +(v * (m.emissiveIntensity ?? 1)).toFixed(5));
    json.materials.push(entry);
    matIndex.set(name, json.materials.length - 1);
    return json.materials.length - 1;
  };

  let verts = 0;
  for (const part of model.parts) {
    let g = part.geometry;
    if (!g.attributes.normal) g.computeVertexNormals();
    if (part.rotation) {
      g = g.clone();
      g.rotateX(part.rotation[0]).rotateY(part.rotation[1]).rotateZ(part.rotation[2]);
    }
    const pos = g.attributes.position;
    const nrm = g.attributes.normal;
    const p = new Float32Array(pos.count * 3);
    const n = new Float32Array(pos.count * 3);
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.count; i++) {
      const v = [pos.getX(i), pos.getY(i), pos.getZ(i)];
      for (let k = 0; k < 3; k++) {
        p[i * 3 + k] = v[k];
        if (v[k] < min[k]) min[k] = v[k];
        if (v[k] > max[k]) max[k] = v[k];
      }
      const nv = new THREE.Vector3(nrm.getX(i), nrm.getY(i), nrm.getZ(i)).normalize();
      n[i * 3] = nv.x || 0;
      n[i * 3 + 1] = nv.y || 0;
      n[i * 3 + 2] = nv.z || 1;
    }
    verts += pos.count;
    json.accessors.push({ bufferView: pushView(p, 34962), componentType: 5126, count: pos.count, type: "VEC3", min, max });
    const posAcc = json.accessors.length - 1;
    json.accessors.push({ bufferView: pushView(n, 34962), componentType: 5126, count: pos.count, type: "VEC3" });
    const nrmAcc = json.accessors.length - 1;
    const prim = { attributes: { POSITION: posAcc, NORMAL: nrmAcc }, material: material(part.material), mode: 4 };
    if (g.index) {
      const idx = new Uint32Array(g.index.array);
      json.accessors.push({ bufferView: pushView(idx, 34963), componentType: 5125, count: idx.length, type: "SCALAR" });
      prim.indices = json.accessors.length - 1;
    }
    json.meshes.push({ name: part.name, primitives: [prim] });
    const node = { name: part.name, mesh: json.meshes.length - 1 };
    if (part.position) node.translation = part.position;
    json.nodes.push(node);
    json.scenes[0].nodes.push(json.nodes.length - 1);
  }
  json.buffers[0].byteLength = offset;

  const bin = Buffer.concat(chunks);
  let jsonBuf = Buffer.from(JSON.stringify(json), "utf8");
  jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(pad4(jsonBuf.length) - jsonBuf.length, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // "glTF"
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + bin.length, 8);
  const jh = Buffer.alloc(8);
  jh.writeUInt32LE(jsonBuf.length, 0);
  jh.writeUInt32LE(0x4e4f534a, 4); // JSON
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(bin.length, 0);
  bh.writeUInt32LE(0x004e4942, 4); // BIN
  fs.writeFileSync(file, Buffer.concat([header, jh, jsonBuf, bh, bin]));
  return verts;
};

const models = buildAll(LOGO);
for (const m of models) {
  const file = path.join(OUT, `${m.id}.glb`);
  const verts = writeGlb(m, file);
  console.log(`${m.id.padEnd(20)} ${String(m.parts.length).padStart(4)} parts ${String(verts).padStart(8)} verts ${(fs.statSync(file).size / 1024).toFixed(0).padStart(6)} KB`);
}
