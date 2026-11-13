// Tiles a folder of rendered stills into one labelled contact sheet, so the
// film can be read as a whole for rhythm and consistency.
//
//   node scripts/qa/contact-sheet.mjs <stillsDir> <out.jpg> [columns] [thumbWidth]
//
// Stills are expected to be named as Remotion writes them (element-0123.jpeg).

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [dir, out, colsArg, widthArg] = process.argv.slice(2);
if (!dir || !out) {
  console.error("usage: contact-sheet.mjs <stillsDir> <out.jpg> [columns] [thumbWidth]");
  process.exit(1);
}
const cols = Number(colsArg ?? 4);
const tw = Number(widthArg ?? 480);
const FPS = 30;
const BAR = 72;
const BEAT = 18;

const files = fs
  .readdirSync(dir)
  .filter((f) => /\.(jpe?g|png)$/i.test(f))
  .sort();
if (files.length === 0) {
  console.error(`no stills in ${dir}`);
  process.exit(1);
}

const first = await sharp(path.join(dir, files[0])).metadata();
const th = Math.round((tw * first.height) / first.width);
const label = 26;
const gap = 8;
const rows = Math.ceil(files.length / cols);
const W = cols * tw + (cols + 1) * gap;
const H = rows * (th + label) + (rows + 1) * gap;

const composites = [];
for (let i = 0; i < files.length; i++) {
  const frame = Number(files[i].match(/(\d+)\.[a-z]+$/i)?.[1] ?? i);
  const bar = Math.floor(frame / BAR) + 1;
  const beat = Math.floor((frame % BAR) / BEAT) + 1;
  const x = gap + (i % cols) * (tw + gap);
  const y = gap + Math.floor(i / cols) * (th + label + gap);
  const img = await sharp(path.join(dir, files[i])).resize(tw, th).jpeg({ quality: 86 }).toBuffer();
  composites.push({ input: img, left: x, top: y + label });
  const text = `f${frame}  ·  ${(frame / FPS).toFixed(2)}s  ·  bar ${bar}.${beat}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${label}"><text x="2" y="18" font-family="Consolas, monospace" font-size="15" fill="#EDEDED">${text}</text></svg>`;
  composites.push({ input: Buffer.from(svg), left: x, top: y });
}

fs.mkdirSync(path.dirname(out), { recursive: true });
await sharp({ create: { width: W, height: H, channels: 3, background: "#18181B" } })
  .composite(composites)
  .jpeg({ quality: 88 })
  .toFile(out);
console.log(`${out}  ${files.length} frames, ${W}x${H}`);
