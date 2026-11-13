// Traces the official ProtoVinci mark (400x400 avatar, the largest published
// raster) into a vector path. The mark is never redrawn by hand: every curve
// comes from the brand's own pixels.
//
//   node scripts/assets/trace-logo.mjs
//
// Writes:
//   public/assets/brand/logo-mark.svg        the traced mark, tight viewBox
//   src/components/logoPath.ts               path data for the film
//   research/references/logo-trace-check.png source vs trace, side by side

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import potrace from "potrace";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = path.join(root, "research/references/x-avatar-400.jpg");
const SCALE = 4; // trace at 1600px so anti-aliased edges become smooth curves
// The official render has a soft drop shadow under the mark. Ink sits near
// 10-30 and the shadow no darker than about 110, so 84 keeps the shadow out
// while costing well under a quarter of a source pixel of edge erosion.
const THRESHOLD = Number(process.env.LOGO_THRESHOLD ?? 84);

const src = sharp(SOURCE);
const meta = await src.metadata();
const W = meta.width * SCALE;
const H = meta.height * SCALE;

const big = await sharp(SOURCE)
  .resize(W, H, { kernel: "lanczos3" })
  .greyscale()
  .blur(2.4)
  .png()
  .toBuffer();

const svg = await new Promise((resolve, reject) => {
  potrace.trace(
    big,
    { threshold: THRESHOLD, turdSize: 40, optTolerance: 0.8, alphaMax: 1.1 },
    (err, out) => (err ? reject(err) : resolve(out)),
  );
});

const d = svg.match(/ d="([^"]+)"/)?.[1];
if (!d) throw new Error("Potrace returned no path");

// Bounding box of the ink, measured from the thresholded raster.
const { data, info } = await sharp(big)
  .extractChannel(0)
  .raw()
  .toBuffer({ resolveWithObject: true });
if (info.channels !== 1) throw new Error(`expected 1 channel, got ${info.channels}`);
let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (data[y * info.width + x] < THRESHOLD) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const pad = 8;
const box = {
  x: minX - pad,
  y: minY - pad,
  w: maxX - minX + pad * 2,
  h: maxY - minY + pad * 2,
};

const viewBox = `${box.x} ${box.y} ${box.w} ${box.h}`;
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${d}" fill="#09090B" fill-rule="evenodd"/></svg>\n`;
fs.writeFileSync(path.join(root, "public/assets/brand/logo-mark.svg"), markSvg);

// ---------------------------------------------------------------------------
// Split the mark into its two parts. The film treats them separately: the
// quill rides the line, and the cradle stroke is what the line becomes.
// ---------------------------------------------------------------------------
const subpaths = d
  .split(/(?=M)/)
  .map((s) => s.trim())
  .filter(Boolean);

const numbersOf = (s) => (s.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const boundsOf = (s) => {
  const n = numbersOf(s);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < n.length; i += 2) {
    x0 = Math.min(x0, n[i]);
    x1 = Math.max(x1, n[i]);
    y0 = Math.min(y0, n[i + 1]);
    y1 = Math.max(y1, n[i + 1]);
  }
  return { x0, y0, x1, y1 };
};

// The cradle is the sub-path that reaches lowest on the canvas.
let cradleIndex = 0;
subpaths.forEach((s, i) => {
  if (boundsOf(s).y1 > boundsOf(subpaths[cradleIndex]).y1) cradleIndex = i;
});
const cradle = subpaths[cradleIndex];
const quill = subpaths.filter((_, i) => i !== cradleIndex).join(" ");

// Nib tip: the lowest point of the quill.
const qn = numbersOf(quill);
let nib = { x: 0, y: -Infinity };
for (let i = 0; i + 1 < qn.length; i += 2) {
  if (qn[i + 1] > nib.y) nib = { x: qn[i], y: qn[i + 1] };
}

// Flatten the cradle outline to points (potrace emits absolute M/L/C).
const flatten = (s) => {
  const tokens = s.match(/[MLCZz]|-?\d+(?:\.\d+)?/g) ?? [];
  const pts = [];
  let i = 0, cmd = "M", cur = { x: 0, y: 0 };
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[MLCZz]/.test(tokens[i])) {
      cmd = tokens[i++];
      continue;
    }
    if (cmd === "M") {
      cur = { x: num(), y: num() };
      pts.push(cur);
    } else if (cmd === "L") {
      const to = { x: num(), y: num() };
      for (let t = 0.02; t <= 1.0001; t += 0.02) {
        pts.push({ x: cur.x + (to.x - cur.x) * t, y: cur.y + (to.y - cur.y) * t });
      }
      cur = to;
    } else if (cmd === "C") {
      const p1 = { x: num(), y: num() };
      const p2 = { x: num(), y: num() };
      const p3 = { x: num(), y: num() };
      // Dense sampling so every angle bin sees both edges of the stroke.
      for (let t = 0.01; t <= 1.0001; t += 0.01) {
        const u = 1 - t;
        pts.push({
          x: u * u * u * cur.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
          y: u * u * u * cur.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
        });
      }
      cur = p3;
    } else {
      i++;
    }
  }
  return pts;
};

// Centreline: at each angle around the cradle's centre, the midpoint between
// its inner and outer edge.
const cpts = flatten(cradle);
const cb = boundsOf(cradle);
const centre = { x: (cb.x0 + cb.x1) / 2, y: (cb.y0 + cb.y1) / 2 };
const BIN = 4;
const bins = new Map();
for (const p of cpts) {
  const a = (Math.atan2(p.y - centre.y, p.x - centre.x) * 180) / Math.PI;
  const key = Math.floor((a + 360) % 360 / BIN);
  const r = Math.hypot(p.x - centre.x, p.y - centre.y);
  const e = bins.get(key) ?? { min: Infinity, max: -Infinity };
  e.min = Math.min(e.min, r);
  e.max = Math.max(e.max, r);
  bins.set(key, e);
}
const total = 360 / BIN;
const filled = [...bins.keys()].sort((a, b) => a - b);
// Find the opening (largest run of empty bins) and start just after it.
let gapStart = filled[0], gapLen = 0;
for (let k = 0; k < filled.length; k++) {
  const a = filled[k];
  const b = filled[(k + 1) % filled.length];
  const len = (b - a + total) % total;
  if (len > gapLen) {
    gapLen = len;
    gapStart = b;
  }
}
let polar = [];
let thickness = 0;
for (let k = 0; k < total; k++) {
  const key = (gapStart + k) % total;
  const e = bins.get(key);
  if (!e) continue;
  thickness = Math.max(thickness, e.max - e.min);
  polar.push({ a: ((key + 0.5) * BIN * Math.PI) / 180, r: (e.min + e.max) / 2 });
}
// Smooth the radius so the write-on follows a clean arc.
for (let pass = 0; pass < 3; pass++) {
  polar = polar.map((p, i) => {
    const prev = polar[Math.max(0, i - 1)].r;
    const next = polar[Math.min(polar.length - 1, i + 1)].r;
    return { a: p.a, r: (prev + p.r * 2 + next) / 4 };
  });
}
let centreline = polar.map((p) => ({
  x: +(centre.x + Math.cos(p.a) * p.r).toFixed(1),
  y: +(centre.y + Math.sin(p.a) * p.r).toFixed(1),
}));
// Write from the left tip round to the right end.
if (centreline[0].x > centreline[centreline.length - 1].x) centreline.reverse();

fs.mkdirSync(path.join(root, "src/components"), { recursive: true });
fs.writeFileSync(
  path.join(root, "src/components/logoPath.ts"),
  `// Generated by scripts/assets/trace-logo.mjs from the official 400px avatar.
// Do not edit by hand; re-run the script if the source logo changes.

/** Bounding box of the whole mark, in trace units. */
export const LOGO_VIEWBOX = { x: ${box.x}, y: ${box.y}, w: ${box.w}, h: ${box.h} } as const;

/** The complete official mark. */
export const LOGO_PATH =
  ${JSON.stringify(d)};

/** The quill alone (feather and nib). */
export const QUILL_PATH =
  ${JSON.stringify(quill)};

/** The cradle stroke alone. */
export const CRADLE_PATH =
  ${JSON.stringify(cradle)};

/** Tip of the nib, in trace units. */
export const NIB_TIP = { x: ${nib.x}, y: ${nib.y} } as const;

/** Centreline of the cradle from its left tip to its right end, used to write it on. */
export const CRADLE_CENTRELINE: ReadonlyArray<{ x: number; y: number }> = ${JSON.stringify(centreline)};

/** Greatest width of the cradle stroke, in trace units. */
export const CRADLE_THICKNESS = ${thickness.toFixed(1)};
`,
);
console.log(
  `subpaths ${subpaths.length}, cradle #${cradleIndex}, nib tip (${nib.x}, ${nib.y}), centreline ${centreline.length} pts, thickness ${thickness.toFixed(1)}`,
);
console.log(
  `cradle from (${centreline[0].x}, ${centreline[0].y}) to (${centreline.at(-1).x}, ${centreline.at(-1).y})`,
);

// Side-by-side check: source avatar | trace rendered on the same ground.
const traceFull = `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#F8F8F8"/><path d="${d}" fill="#09090B" fill-rule="evenodd"/></svg>`;
const traceRaster = await sharp(Buffer.from(traceFull)).png().toBuffer();
const sourceRaster = await sharp(SOURCE).png().toBuffer();
await sharp({
  create: { width: meta.width * 2, height: meta.height, channels: 3, background: "#ffffff" },
})
  .composite([
    { input: sourceRaster, left: 0, top: 0 },
    { input: traceRaster, left: meta.width, top: 0 },
  ])
  .png()
  .toFile(path.join(root, "research/references/logo-trace-check.png"));

// Numeric check: how many pixels differ in ink/no-ink between source and trace.
const a = await sharp(SOURCE).greyscale().extractChannel(0).raw().toBuffer();
const b = await sharp(traceRaster).greyscale().extractChannel(0).raw().toBuffer();
let diff = 0, ink = 0;
for (let i = 0; i < a.length; i++) {
  const sa = a[i] < THRESHOLD, sb = b[i] < THRESHOLD;
  if (sa) ink++;
  if (sa !== sb) diff++;
}
console.log(`viewBox ${viewBox}`);
console.log(`path length ${d.length} chars`);
console.log(`ink pixels ${ink}, mismatched ${diff} (${((diff / ink) * 100).toFixed(2)}% of ink area)`);
