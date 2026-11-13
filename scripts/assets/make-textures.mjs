// Generates the two paper textures used as overlays. Pre-rendering them is far
// cheaper at render time than a live SVG turbulence filter on every frame.
//
//   node scripts/assets/make-textures.mjs
//
// Writes:
//   public/assets/brand/grain.png    512px tile, fine speckle with alpha
//   public/assets/brand/mottle.png   1024px soft tonal variation for paper

import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Small seeded generator so the textures are identical on every run.
const rng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Fine grain: each pixel is black or white with a low random alpha, so the
// same tile reads on both paper and ink grounds.
{
  const S = 512;
  const r = rng(20261113);
  const buf = Buffer.alloc(S * S * 4);
  for (let i = 0; i < S * S; i++) {
    const v = r();
    const dark = r() < 0.62;
    const c = dark ? 0 : 255;
    buf[i * 4] = c;
    buf[i * 4 + 1] = c;
    buf[i * 4 + 2] = c;
    buf[i * 4 + 3] = Math.round(Math.pow(v, 2.2) * 46);
  }
  await sharp(buf, { raw: { width: S, height: S, channels: 4 } })
    .png()
    .toFile(path.join(root, "public/assets/brand/grain.png"));
}

// Mottle: blurred low-frequency noise, wrapped before blurring so the tile
// edges match.
{
  const S = 1024;
  const cell = 64;
  const n = S / cell;
  const r = rng(424242);
  const small = Buffer.alloc(n * n);
  for (let i = 0; i < n * n; i++) small[i] = Math.round(96 + r() * 128);
  // Tile 3x3, upscale, blur, then crop the centre so edges are seamless.
  const tiled = Buffer.alloc(n * 3 * n * 3);
  for (let y = 0; y < n * 3; y++) {
    for (let x = 0; x < n * 3; x++) {
      tiled[y * n * 3 + x] = small[(y % n) * n + (x % n)];
    }
  }
  const up = await sharp(tiled, { raw: { width: n * 3, height: n * 3, channels: 1 } })
    .resize(S * 3, S * 3, { kernel: "cubic" })
    .blur(28)
    .extract({ left: S, top: S, width: S, height: S })
    .normalise()
    .raw()
    .toBuffer();
  const rgba = Buffer.alloc(S * S * 4);
  for (let i = 0; i < S * S; i++) {
    // Dark where the noise is low; alpha carries the variation.
    const v = up[i] / 255;
    rgba[i * 4] = 60;
    rgba[i * 4 + 1] = 48;
    rgba[i * 4 + 2] = 36;
    rgba[i * 4 + 3] = Math.round(Math.max(0, 0.6 - v) * 70);
  }
  await sharp(rgba, { raw: { width: S, height: S, channels: 4 } })
    .png()
    .toFile(path.join(root, "public/assets/brand/mottle.png"));
}

console.log("grain.png and mottle.png written");
