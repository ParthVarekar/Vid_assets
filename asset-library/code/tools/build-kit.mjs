// Builds the content kit into asset-library/:
//   social-templates/<format>/   every social post template, rendered from real site content
//   social-templates/highlights, profile
//   backgrounds/                 paper and night grounds for every common size
//   video-kit/previews/          stills of the animated video-kit pieces
//   graphics/devices/            device frames with transparent screens (SVG + PNG)
//   graphics/annotations/        hand-drawn chalk marks (SVG + PNG)
//
//   node --no-warnings scripts/assets/build-kit.mjs            everything
//   node --no-warnings scripts/assets/build-kit.mjs --vectors  only the SVG work (no rendering)
//
// Uses the Remotion renderer API, so the project is bundled once for all stills.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LIB = path.join(root, "asset-library");
const vectorsOnly = process.argv.includes("--vectors");
const P = (...p) => path.join(LIB, ...p);
const write = (rel, data) => {
  fs.mkdirSync(path.dirname(P(rel)), { recursive: true });
  fs.writeFileSync(P(rel), data);
};
const C = { paper: "#EEEBE4", ink: "#09090B", white: "#FFFFFF", taupe: "#A69A8A", sanguine: "#C4472F", zinc: "#9898A3", rule: "#E4E4E7" };

// ---------------------------------------------------------------- 1. device frames (transparent screens)
// Each frame is a body with the screen area cut out (even-odd), so a screenshot
// placed behind it shows through. The screen rectangle is recorded in a JSON
// sidecar so code and design tools can position content exactly.
const rr = (x, y, w, h, r) =>
  `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
const devices = {
  browser: (() => {
    const W = 1600, H = 1000, bar = 56, r = 18;
    const screen = { x: 0, y: bar, w: W, h: H - bar };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <path fill-rule="evenodd" fill="${C.white}" d="${rr(0, 0, W, H, r)} M0 ${bar}H${W}V${H - r}Q${W} ${H} ${W - r} ${H}H${r}Q0 ${H} 0 ${H - r}Z"/>
  <path d="M0 ${bar}H${W}" stroke="${C.rule}" stroke-width="2"/>
  <circle cx="28" cy="28" r="7" fill="#D9D9DE"/><circle cx="52" cy="28" r="7" fill="#D9D9DE"/><circle cx="76" cy="28" r="7" fill="#D9D9DE"/>
  <rect x="${W / 2 - 180}" y="14" width="360" height="28" rx="14" fill="#F0F0F2"/>
  <path fill="none" stroke="rgba(9,9,11,0.12)" stroke-width="2" d="${rr(1, 1, W - 2, H - 2, r)}"/>
</svg>\n`;
    return { svg, screen, size: { w: W, h: H } };
  })(),
  phone: (() => {
    const W = 600, H = 1240, r = 92, bez = 22;
    const screen = { x: bez, y: bez, w: W - bez * 2, h: H - bez * 2, radius: r - bez };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <path fill-rule="evenodd" fill="${C.ink}" d="${rr(0, 0, W, H, r)} ${rr(bez, bez, W - bez * 2, H - bez * 2, r - bez)}"/>
  <rect x="${W / 2 - 70}" y="${bez + 18}" width="140" height="38" rx="19" fill="${C.ink}"/>
</svg>\n`;
    return { svg, screen, size: { w: W, h: H } };
  })(),
  laptop: (() => {
    const W = 2000, H = 1260, lidH = 1180, bez = 34, r = 30;
    const screen = { x: bez, y: bez, w: W - bez * 2 - 0, h: lidH - bez * 2 };
    const baseY = lidH;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <path fill-rule="evenodd" fill="#1C1C21" d="${rr(60, 0, W - 120, lidH, r)} M${60 + bez} ${bez}H${W - 60 - bez}V${lidH - bez}H${60 + bez}Z"/>
  <path fill="#C9C9D0" d="M0 ${baseY}H${W}V${baseY + 40}Q${W} ${H} ${W - 60} ${H}H60Q0 ${H} 0 ${baseY + 40}Z"/>
  <rect x="${W / 2 - 160}" y="${baseY}" width="320" height="22" rx="11" fill="#AEAEB6"/>
</svg>\n`;
    return { svg, screen: { x: 60 + bez, y: bez, w: W - 120 - bez * 2, h: lidH - bez * 2 }, size: { w: W, h: H } };
  })(),
  tablet: (() => {
    const W = 1100, H = 1480, r = 70, bez = 40;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <path fill-rule="evenodd" fill="${C.ink}" d="${rr(0, 0, W, H, r)} ${rr(bez, bez, W - bez * 2, H - bez * 2, r - bez)}"/>
</svg>\n`;
    return { svg, screen: { x: bez, y: bez, w: W - bez * 2, h: H - bez * 2, radius: r - bez }, size: { w: W, h: H } };
  })(),
};
const deviceMeta = {};
for (const [name, d] of Object.entries(devices)) {
  write(`graphics/devices/${name}-frame.svg`, d.svg);
  await sharp(Buffer.from(d.svg)).png().toFile(P(`graphics/devices/${name}-frame.png`));
  deviceMeta[name] = { size: d.size, screen: d.screen };
}
write("graphics/devices/screens.json", JSON.stringify({ note: "Screen rectangle inside each frame, in the frame's own pixels. Place content there, behind the frame.", ...deviceMeta }, null, 2));

// ---------------------------------------------------------------- 2. chalk annotations
// Hand-drawn marks in sanguine with the film's chalk filter.
const chalkDefs = `<defs><filter id="c" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="2" seed="5" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="3.4" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;
const mark = (w, h, body, sw = 8) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${chalkDefs}<g fill="none" stroke="${C.sanguine}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" filter="url(#c)">${body}</g></svg>\n`;
const ANNOTATIONS = {
  "circle": mark(600, 360, `<path d="M300 32 C470 26 572 92 568 182 C562 278 440 334 290 330 C140 326 34 270 36 180 C38 98 150 40 330 44 C390 46 430 54 460 64"/>`),
  "arrow-right": mark(600, 240, `<path d="M30 160 C170 110 330 90 520 118"/><path d="M450 70 L528 120 L456 178"/>`),
  "arrow-curved": mark(480, 480, `<path d="M60 420 C80 240 200 110 400 90"/><path d="M330 40 L408 90 L350 158"/>`),
  "underline-double": mark(800, 120, `<path d="M20 44 C220 30 520 36 780 46"/><path d="M60 88 C280 76 520 80 740 90"/>`),
  "highlight": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 140" width="800" height="140">${chalkDefs}<path filter="url(#c)" fill="${C.sanguine}" fill-opacity="0.28" d="M18 40 C200 20 600 26 784 34 L780 112 C600 120 220 116 22 104 Z"/></svg>\n`,
  "check": mark(300, 260, `<path d="M40 140 L118 214 L262 44"/>`, 14),
  "cross": mark(260, 260, `<path d="M50 50 L210 210"/><path d="M212 48 L48 212"/>`, 14),
  "bracket": mark(140, 600, `<path d="M110 30 C60 34 50 60 52 120 C54 220 50 270 20 300 C50 330 54 380 52 480 C50 540 60 566 110 570"/>`),
  "star": mark(300, 300, `<path d="M150 30 L150 270 M30 150 L270 150 M66 66 L234 234 M234 66 L66 234"/>`, 10),
  "box": mark(700, 300, `<path d="M28 34 C240 24 470 26 672 30 C676 120 674 200 670 270 C470 276 240 274 30 268 C24 190 22 110 34 30"/>`),
};
for (const [name, svg] of Object.entries(ANNOTATIONS)) {
  write(`graphics/annotations/${name}.svg`, svg);
  await sharp(Buffer.from(svg), { density: 192 }).png().toFile(P(`graphics/annotations/${name}.png`));
}
console.log(`device frames: ${Object.keys(devices).length}, annotations: ${Object.keys(ANNOTATIONS).length}`);
if (vectorsOnly) process.exit(0);

// ---------------------------------------------------------------- 3. rendered stills (one bundle)
const { bundle } = await import("@remotion/bundler");
const { renderStill, selectComposition, renderFrames, openBrowser } = await import("@remotion/renderer");

console.log("bundling ...");
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
const browser = await openBrowser("chrome");
let count = 0;
const still = async (id, out, { props = {}, width, height, frame = 0, png = false } = {}) => {
  const comp = await selectComposition({ serveUrl, id, inputProps: props, puppeteerInstance: browser });
  if (width) comp.width = width;
  if (height) comp.height = height;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await renderStill({ composition: comp, serveUrl, output: out, inputProps: props, frame, imageFormat: png ? "png" : "jpeg", jpegQuality: 92, puppeteerInstance: browser });
  count++;
};

// Social posts.
const FORMATS = ["Portrait", "Square", "Story"];
const SETS = { Service: 10, Case: 7, Process: 4, Quote: 5, Testimonial: 6, Stat: 3, Carousel: 5, Promise: 1, Announcement: 1 };
for (const fmt of FORMATS) {
  for (const [kind, n] of Object.entries(SETS)) {
    for (let i = 1; i <= n; i++) {
      const no = String(i).padStart(2, "0");
      await still(`Social-${kind}-${no}-${fmt}`, P("social-templates", fmt.toLowerCase(), `${kind.toLowerCase()}-${no}.jpg`));
    }
  }
  console.log(`social ${fmt} done (${count})`);
}
for (const icon of ["code", "ai-agent", "layers", "check", "dashboard", "email"]) {
  await still(`Social-Highlight-${icon}`, P("social-templates/highlights", `highlight-${icon}.png`), { png: true });
}
await still("Social-Profile-Paper", P("social-templates/profile", "profile-paper.png"), { png: true });
await still("Social-Profile-Ink", P("social-templates/profile", "profile-ink.png"), { png: true });

// Backgrounds at common sizes.
const SIZES = { "16x9": [1920, 1080], "9x16": [1080, 1920], "1x1": [1080, 1080], "4x5": [1080, 1350], "4k": [3840, 2160] };
for (const [tag, [w, h]] of Object.entries(SIZES)) {
  for (const tone of ["paper", "night"]) {
    for (const [variant, props] of Object.entries({ plain: { geometry: false, line: false }, geometry: { geometry: true, line: false }, line: { geometry: true, line: true } })) {
      await still("Background", P("backgrounds", tag, `${tone}-${variant}.jpg`), { props: { tone, ...props }, width: w, height: h });
    }
  }
}
console.log(`backgrounds done (${count})`);

// Video-kit previews (one frame per piece, both orientations).
for (const [id, tag] of [["KitDemo", "16x9"], ["KitDemo-Vertical", "9x16"]]) {
  for (const [name, f] of Object.entries({ "title-card": 40, "screen-frame-lower-third": 130, "callouts-captions": 200, "end-card": 400 })) {
    await still(id, P("video-kit/previews", tag, `${name}.jpg`), { frame: f });
  }
}
await browser.close({ silent: true });
console.log(`rendered ${count} stills`);
void renderFrames;
