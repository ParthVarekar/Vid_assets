// Renders the bird lookdev set and tiles it into review sheets.
//
//   node scripts/lookdev/render-lookdev.mjs [outDir] [--scale=2] [--only=quill,ink]
//
// Per bird: front, 3/4, side and back (from the Lookdev-<Bird> turntable),
// plus a face close-up. Also the trio lineup. Supersampled renders
// (--scale=2) are downsampled with a Lanczos filter for clean fur edges.
// Prints the render time of every frame, which is the Gate 1 speed figure.

import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import sharp from "sharp";

const args = process.argv.slice(2);
const outDir = path.resolve(args.find((a) => !a.startsWith("--")) ?? "out/lookdev/sheet");
const scale = Number((args.find((a) => a.startsWith("--scale=")) ?? "--scale=1").split("=")[1]);
const only = (args.find((a) => a.startsWith("--only=")) ?? "--only=quill,ink,chalk").split("=")[1].split(",");
fs.mkdirSync(outDir, { recursive: true });

const cap = (s) => s[0].toUpperCase() + s.slice(1);
// Lookdev-<Bird> spins 360 degrees over 240 frames: 30 frames = 45 degrees.
const ANGLES = [
  { label: "front", frame: 0 },
  { label: "three-quarter", frame: 30 },
  { label: "side", frame: 60 },
  { label: "back", frame: 120 },
];

const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
console.log(`bundled in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const times = [];
const still = async (id, frame, file) => {
  const composition = await selectComposition({ serveUrl, id, inputProps: {}, chromiumOptions: { gl: "angle" } });
  const raw = path.join(outDir, `_raw-${file}`);
  const s = Date.now();
  await renderStill({ serveUrl, composition, frame, output: raw, imageFormat: "png", scale, chromiumOptions: { gl: "angle" }, overwrite: true });
  const ms = Date.now() - s;
  times.push({ id, frame, ms });
  const dst = path.join(outDir, file);
  await sharp(raw)
    .resize(composition.width, composition.height, { kernel: "lanczos3" })
    .png()
    .toFile(dst);
  fs.rmSync(raw);
  console.log(`${file}  ${(ms / 1000).toFixed(1)}s`);
  return dst;
};

const tiles = [];
for (const b of only) {
  for (const a of ANGLES) tiles.push({ file: await still(`Lookdev-${cap(b)}`, a.frame, `${b}-${a.label}.png`), label: `${cap(b)} · ${a.label}` });
  await still(`Closeup-${cap(b)}`, 0, `${b}-closeup.png`);
}
await still("Lookdev-Lineup", 0, "lineup.png");

// Turnaround sheet: one row per bird.
const tw = 432;
const th = 540;
const pad = 12;
const labelH = 34;
const rows = only.length;
const cols = ANGLES.length;
const W = cols * tw + (cols + 1) * pad;
const H = rows * (th + labelH) + (rows + 1) * pad;
const composites = [];
for (let i = 0; i < tiles.length; i++) {
  const c = i % cols;
  const r = Math.floor(i / cols);
  const x = pad + c * (tw + pad);
  const y = pad + r * (th + labelH + pad);
  composites.push({ input: await sharp(tiles[i].file).resize(tw, th).toBuffer(), left: x, top: y });
  const svg = `<svg width="${tw}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><text x="4" y="24" font-family="Consolas, monospace" font-size="18" fill="#3A332B">${tiles[i].label}</text></svg>`;
  composites.push({ input: Buffer.from(svg), left: x, top: y + th });
}
await sharp({ create: { width: W, height: H, channels: 3, background: "#F4EFE6" } })
  .composite(composites)
  .jpeg({ quality: 90 })
  .toFile(path.join(outDir, "turnaround-sheet.jpg"));

const avg = times.reduce((a, t) => a + t.ms, 0) / times.length;
fs.writeFileSync(path.join(outDir, "render-times.json"), JSON.stringify({ scale, averageMs: Math.round(avg), frames: times }, null, 2));
console.log(`done: ${times.length} stills, average ${(avg / 1000).toFixed(1)}s per frame at scale ${scale}`);
