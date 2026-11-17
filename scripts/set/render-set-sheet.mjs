// Renders the Desk in every time of day from the main camera presets and tiles
// them into one sheet (rows: day / golden / night; columns: presets).
//
//   node scripts/set/render-set-sheet.mjs [outDir] [--presets=wide,hero,closeup,laptop]

import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import sharp from "sharp";

const args = process.argv.slice(2);
const outDir = path.resolve(args.find((a) => !a.startsWith("--")) ?? "out/g3/sheet");
const presets = (args.find((a) => a.startsWith("--presets=")) ?? "--presets=wide,hero,closeup,laptop").split("=")[1].split(",");
const rigs = ["desk-day", "desk-golden", "desk-night"];
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const files = [];
for (const rig of rigs) {
  for (const preset of presets) {
    const inputProps = { rig, preset, quality: "final" };
    const composition = await selectComposition({ serveUrl, id: "DeskPreview", inputProps, chromiumOptions: { gl: "angle" } });
    const out = path.join(outDir, `${rig}-${preset}.png`);
    const t = Date.now();
    await renderStill({ serveUrl, composition, inputProps, output: out, imageFormat: "png", chromiumOptions: { gl: "angle" }, overwrite: true });
    console.log(`${path.basename(out)}  ${((Date.now() - t) / 1000).toFixed(1)}s`);
    files.push({ file: out, label: `${rig.replace("desk-", "")} · ${preset}` });
  }
}

const tw = 640;
const th = 360;
const pad = 10;
const lab = 30;
const cols = presets.length;
const rows = rigs.length;
const comp = [];
for (let i = 0; i < files.length; i++) {
  const x = pad + (i % cols) * (tw + pad);
  const y = pad + Math.floor(i / cols) * (th + lab + pad);
  comp.push({ input: await sharp(files[i].file).resize(tw, th).toBuffer(), left: x, top: y });
  comp.push({ input: Buffer.from(`<svg width="${tw}" height="${lab}" xmlns="http://www.w3.org/2000/svg"><text x="4" y="21" font-family="Consolas, monospace" font-size="17" fill="#3A332B">${files[i].label}</text></svg>`), left: x, top: y + th });
}
await sharp({ create: { width: cols * (tw + pad) + pad, height: rows * (th + lab + pad) + pad, channels: 3, background: "#F4EFE6" } })
  .composite(comp)
  .jpeg({ quality: 90 })
  .toFile(path.join(outDir, "desk-sheet.jpg"));
console.log("sheet:", path.join(outDir, "desk-sheet.jpg"));
