// Eye check sheet: each bird's eyes in macro, on black, in a range of lid poses.
//
//   node scripts/lookdev/render-eyes.mjs [outDir] [--scale=2] [--only=quill,ink]
//
// Rows are birds; columns are open, half blink, look up-left, squint/angry and worried.

import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import sharp from "sharp";

const args = process.argv.slice(2);
const outDir = path.resolve(args.find((a) => !a.startsWith("--")) ?? "out/lookdev/eyes");
// Capped: above about 3000 px wide the WebGL context can be lost (black frames).
const scale = Math.min(1.5, Number((args.find((a) => a.startsWith("--scale=")) ?? "--scale=1").split("=")[1]));
const only = (args.find((a) => a.startsWith("--only=")) ?? "--only=quill,ink,chalk").split("=")[1].split(",");
fs.mkdirSync(outDir, { recursive: true });

const POSES = [
  { label: "open", pose: {} },
  { label: "half blink", pose: { blinkL: 0.55, blinkR: 0.55 } },
  { label: "look up-left", pose: { lookX: -0.8, lookY: 0.7 } },
  { label: "angry squint", pose: { squint: 0.7, lidTiltL: -0.7, lidTiltR: -0.7 } },
  { label: "worried, wide", pose: { lidOpen: 0.6, lidTiltL: 0.8, lidTiltR: 0.8, pupil: 0.8 } },
];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const tiles = [];
for (const b of only) {
  for (const [i, p] of POSES.entries()) {
    const inputProps = { pose: p.pose };
    const composition = await selectComposition({ serveUrl, id: `Eyes-${cap(b)}`, inputProps, chromiumOptions: { gl: "angle" } });
    const file = path.join(outDir, `${b}-${i}.png`);
    const raw = file + ".raw.png";
    await renderStill({ serveUrl, composition, inputProps, output: raw, imageFormat: "png", scale, chromiumOptions: { gl: "angle" }, overwrite: true });
    await sharp(raw).resize(composition.width, composition.height, { kernel: "lanczos3" }).png().toFile(file);
    fs.rmSync(raw);
    tiles.push({ file, label: `${cap(b)} · ${p.label}` });
    console.log(file);
  }
}
const tw = 768, th = 432, pad = 8, lh = 28, cols = POSES.length;
const W = cols * tw + (cols + 1) * pad, H = only.length * (th + lh + pad) + pad;
const comp = [];
for (const [i, t] of tiles.entries()) {
  const x = pad + (i % cols) * (tw + pad), y = pad + Math.floor(i / cols) * (th + lh + pad);
  comp.push({ input: await sharp(t.file).resize(tw, th).toBuffer(), left: x, top: y });
  comp.push({ input: Buffer.from(`<svg width="${tw}" height="${lh}" xmlns="http://www.w3.org/2000/svg"><text x="4" y="20" font-family="Consolas, monospace" font-size="16" fill="#bbb">${t.label}</text></svg>`), left: x, top: y + th });
}
await sharp({ create: { width: W, height: H, channels: 3, background: "#151515" } }).composite(comp).jpeg({ quality: 90 }).toFile(path.join(outDir, "eye-sheet.jpg"));
console.log("done", tiles.length);
