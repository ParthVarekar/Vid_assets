// Renders a debug image of the logo split so it can be checked by eye:
// quill in ink, cradle in red, centreline in blue, nib tip in green.
//
//   node scripts/assets/check-logo-split.mjs

import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  CRADLE_CENTRELINE,
  CRADLE_PATH,
  LOGO_VIEWBOX as V,
  NIB_TIP,
  QUILL_PATH,
} from "../../src/components/logoPath.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const line = CRADLE_CENTRELINE.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
const first = CRADLE_CENTRELINE[0];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(V.w * 0.8)}" height="${Math.round(V.h * 0.8)}" viewBox="${V.x} ${V.y} ${V.w} ${V.h}">
<rect x="${V.x}" y="${V.y}" width="${V.w}" height="${V.h}" fill="#EEEBE4"/>
<path d="${QUILL_PATH}" fill="#09090B" fill-rule="evenodd"/>
<path d="${CRADLE_PATH}" fill="#C4472F" fill-rule="evenodd"/>
<path d="${line}" fill="none" stroke="#2563EB" stroke-width="5"/>
<circle cx="${first.x}" cy="${first.y}" r="12" fill="#2563EB"/>
<circle cx="${NIB_TIP.x}" cy="${NIB_TIP.y}" r="10" fill="#16A34A"/>
</svg>`;
const out = path.join(root, "research/references/logo-split-check.png");
await sharp(Buffer.from(svg)).png().toFile(out);
console.log(out);
