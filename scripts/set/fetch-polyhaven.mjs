// Downloads the approved Poly Haven assets (all CC0) and optimises them for
// real-time use.
//
//   node scripts/set/fetch-polyhaven.mjs           # fetch missing, optimise missing
//   node scripts/set/fetch-polyhaven.mjs --force   # redo everything
//
// Raw downloads go to assets-raw/polyhaven/<id>/ (gitignored, one folder per
// asset). Optimised outputs are committed:
//   public/3d/props/<id>.glb        meshopt geometry, webp textures <= 1024 px
//   public/3d/hdri/<id>_1k.hdr      environment for reflections
//   public/3d/textures/<id>/*.jpg   tiling PBR maps
// Nothing downloaded is ever executed; files are only read by gltf-transform.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RAW = path.join(ROOT, "assets-raw", "polyhaven");
const PROPS = path.join(ROOT, "public", "3d", "props");
const HDRI = path.join(ROOT, "public", "3d", "hdri");
const TEX = path.join(ROOT, "public", "3d", "textures");
const force = process.argv.includes("--force");

export const MODELS = [
  "desk_lamp_arm_01",
  "office_notepads",
  "binder_notebook",
  "book_encyclopedia_set_01",
  "decorative_book_set_01",
  "potted_plant_02",
  "calathea_orbifolia_01",
  "ceramic_vase_01",
  "wooden_table_02",
  "magnifying_glass_01",
];
const HDRIS = ["artist_workshop"];
const TEXTURES = ["beige_wall_001"];

const api = async (id) => {
  const r = await fetch(`https://api.polyhaven.com/files/${id}`);
  if (!r.ok) throw new Error(`${id}: API ${r.status}`);
  return r.json();
};

const download = async (url, file) => {
  if (!force && fs.existsSync(file) && fs.statSync(file).size > 0) return false;
  // Only Poly Haven's own download host.
  if (!/^https:\/\/dl\.polyhaven\.org\//.test(url)) throw new Error(`unexpected host: ${url}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  return true;
};

/** Resolve a relative include path and refuse anything escaping the folder. */
const inside = (dir, rel) => {
  const p = path.resolve(dir, rel);
  if (!p.startsWith(path.resolve(dir) + path.sep)) throw new Error(`unsafe path in download: ${rel}`);
  return p;
};

const mb = (f) => (fs.statSync(f).size / 1048576).toFixed(2) + " MB";

for (const id of MODELS) {
  const out = path.join(PROPS, `${id}.glb`);
  if (!force && fs.existsSync(out)) {
    console.log(`= ${id} (${mb(out)})`);
    continue;
  }
  const files = await api(id);
  // Smallest resolution available (textures are resized to 1024 px anyway).
  const res = ["1k", "2k", "4k", "8k"].find((r) => files.gltf?.[r]?.gltf);
  const g = res && files.gltf[res].gltf;
  if (!g) {
    console.warn(`! ${id}: published without glTF (FBX/USD only), skipped`);
    continue;
  }
  const dir = path.join(RAW, id);
  const main = inside(dir, path.basename(new URL(g.url).pathname));
  await download(g.url, main);
  for (const [rel, info] of Object.entries(g.include ?? {})) await download(info.url, inside(dir, rel));
  fs.mkdirSync(PROPS, { recursive: true });
  execFileSync(
    process.execPath,
    [path.join(ROOT, "node_modules", "@gltf-transform", "cli", "bin", "cli.js"), "optimize", main, out, "--texture-compress", "webp", "--texture-size", "1024", "--compress", "meshopt", "--simplify", "false"],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  console.log(`+ ${id} -> ${path.relative(ROOT, out)} (${mb(out)})`);
}

for (const id of HDRIS) {
  const files = await api(id);
  const h = files.hdri?.["1k"]?.hdr;
  const out = path.join(HDRI, `${id}_1k.hdr`);
  if (await download(h.url, out)) console.log(`+ ${id} hdri (${mb(out)})`);
  else console.log(`= ${id} hdri`);
}

for (const id of TEXTURES) {
  const files = await api(id);
  for (const [map, key] of [
    ["Diffuse", "diff"],
    ["nor_gl", "nor"],
    ["Rough", "rough"],
  ]) {
    const f = files[map]?.["1k"]?.jpg;
    if (!f) continue;
    const out = path.join(TEX, id, `${key}_1k.jpg`);
    if (await download(f.url, out)) console.log(`+ ${id}/${key} (${mb(out)})`);
  }
}

// Size report.
let total = 0;
const walk = (d) => fs.existsSync(d) && fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : (total += fs.statSync(path.join(d, e.name)).size)));
walk(path.join(ROOT, "public", "3d"));
console.log(`public/3d total: ${(total / 1048576).toFixed(1)} MB`);
