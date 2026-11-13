// Builds asset-library/: every reusable image, vector and code element of the
// film in one place. Videos and audio are deliberately excluded.
//
//   node --no-warnings scripts/assets/build-library.mjs            everything
//   node --no-warnings scripts/assets/build-library.mjs --no-render  skip Remotion stills

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import * as LOGO from "../../src/components/logoPath.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LIB = path.join(root, "asset-library");
const noRender = process.argv.includes("--no-render");
const P = (...p) => path.join(LIB, ...p);
const mk = (...p) => fs.mkdirSync(P(...p), { recursive: true });
const write = (rel, data) => {
  fs.mkdirSync(path.dirname(P(rel)), { recursive: true });
  fs.writeFileSync(P(rel), data);
};
const copy = (from, to) => {
  fs.mkdirSync(path.dirname(P(to)), { recursive: true });
  fs.copyFileSync(path.join(root, from), P(to));
};

// Same values as src/theme.ts (kept literal so this file runs without a bundler).
const COLORS = {
  paper: "#EEEBE4", paperBright: "#F7F5F0", taupe: "#A69A8A", taupeLight: "#DFD8CE",
  ink: "#09090B", inkSoft: "#27272A", graphite: "#6B7280", zinc: "#9898A3", rule: "#E4E4E7",
  white: "#FFFFFF", night: "#09090B", nightCard: "#141417", nightRaise: "#1C1C21",
  nightText: "#F4F4F5", nightMuted: "#8B8B95", sanguine: "#C4472F", sanguineBright: "#E8583C",
};

// ---------------------------------------------------------------- 1. copies
const COPIES = [
  // brand sources
  ["public/assets/brand/logo-source-400.jpg", "brand/logo/source/logo-source-400.jpg"],
  ["public/assets/brand/apple-touch-icon.png", "brand/logo/source/apple-touch-icon.png"],
  ["public/assets/brand/favicon-64.png", "brand/logo/source/favicon-64.png"],
  ["public/assets/brand/og-image.jpg", "reference/brand/website-og-image.jpg"],
  ["research/references/linkedin-cover.jpg", "reference/brand/linkedin-cover.jpg"],
  ["research/references/logo-trace-check.png", "reference/logo/logo-trace-check.png"],
  ["research/references/logo-split-check.png", "reference/logo/logo-split-check.png"],
  // textures and fonts
  ["public/assets/brand/grain.png", "textures/grain-512.png"],
  ["public/assets/brand/mottle.png", "textures/paper-mottle-1024.png"],
  ["public/assets/fonts/Switzer-Medium.woff2", "fonts/Switzer-Medium.woff2"],
  ["public/assets/fonts/Switzer-Semibold.woff2", "fonts/Switzer-Semibold.woff2"],
  ["public/assets/fonts/Switzer-Bold.woff2", "fonts/Switzer-Bold.woff2"],
  // code: the animation system
  ["src/components/logoPath.ts", "code/components/logoPath.ts"],
  ["src/components/Quill.tsx", "code/components/Quill.tsx"],
  ["src/components/Thread.tsx", "code/components/Thread.tsx"],
  ["src/components/Type.tsx", "code/components/Type.tsx"],
  ["src/components/Surface.tsx", "code/components/Surface.tsx"],
  ["src/components/NotebookHeader.tsx", "code/components/NotebookHeader.tsx"],
  ["src/components/TitleBlock.tsx", "code/components/TitleBlock.tsx"],
  ["src/components/Artefacts.tsx", "code/components/Artefacts.tsx"],
  ["src/components/Plate.tsx", "code/components/Plate.tsx"],
  ["src/animations/ease.ts", "code/animations/ease.ts"],
  ["src/utilities/path.ts", "code/utilities/path.ts"],
  ["src/utilities/rng.ts", "code/utilities/rng.ts"],
  ["src/utilities/layout.ts", "code/utilities/layout.ts"],
  ["src/theme.ts", "code/theme.ts"],
  ["src/fonts.ts", "code/fonts.ts"],
  ["src/timeline.ts", "code/timeline.ts"],
  ["src/plates.ts", "code/plates.ts"],
  ["src/scenes/common.ts", "code/scenes/common.ts"],
  ["src/scenes/Hook.tsx", "code/scenes/Hook.tsx"],
  ["src/scenes/SketchBuild.tsx", "code/scenes/SketchBuild.tsx"],
  ["src/scenes/Automate.tsx", "code/scenes/Automate.tsx"],
  ["src/scenes/Scale.tsx", "code/scenes/Scale.tsx"],
  ["src/scenes/Proof.tsx", "code/scenes/Proof.tsx"],
  ["src/scenes/Reveal.tsx", "code/scenes/Reveal.tsx"],
  ["src/compositions/Film.tsx", "code/compositions/Film.tsx"],
  ["src/compositions/LogoSting.tsx", "code/compositions/LogoSting.tsx"],
  ["src/compositions/Stills.tsx", "code/compositions/Stills.tsx"],
  // tools
  ["scripts/assets/trace-logo.mjs", "code/tools/trace-logo.mjs"],
  ["scripts/assets/make-textures.mjs", "code/tools/make-textures.mjs"],
  ["scripts/qa/contact-sheet.mjs", "code/tools/contact-sheet.mjs"],
  ["scripts/qa/audio-check.mjs", "code/tools/audio-check.mjs"],
  ["scripts/audio/render-score.mjs", "code/tools/render-score.mjs"],
];
for (const [from, to] of COPIES) copy(from, to);
for (const f of fs.readdirSync(path.join(root, "public/assets/brand/work"))) {
  copy(`public/assets/brand/work/${f}`, `reference/portfolio/${f}`);
}
console.log(`copied ${COPIES.length} files + portfolio screens`);

// ---------------------------------------------------------------- 2. logo vectors
const V = LOGO.LOGO_VIEWBOX;
const vb = `${V.x} ${V.y} ${V.w} ${V.h}`;
const svgOf = (d, fill, box = vb) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}"><path d="${d}" fill="${fill}" fill-rule="evenodd"/></svg>\n`;

const variants = { ink: COLORS.ink, white: "#FFFFFF", sanguine: COLORS.sanguine, paper: COLORS.paper };
for (const [name, fill] of Object.entries(variants)) {
  write(`brand/logo/svg/mark-${name}.svg`, svgOf(LOGO.LOGO_PATH, fill));
  write(`brand/logo/svg/quill-${name}.svg`, svgOf(LOGO.QUILL_PATH, fill));
  write(`brand/logo/svg/cradle-${name}.svg`, svgOf(LOGO.CRADLE_PATH, fill));
}
// Two-tone: the film's idea in one picture (red cradle = the line, ink quill).
write(
  "brand/logo/svg/mark-two-tone.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><path d="${LOGO.QUILL_PATH}" fill="${COLORS.ink}" fill-rule="evenodd"/><path d="${LOGO.CRADLE_PATH}" fill="${COLORS.sanguine}" fill-rule="evenodd"/></svg>\n`,
);
// App icons: mark centred in a circle badge, like the website header.
const badge = (bg, fg, ring) => {
  const s = 1024, pad = 0.2;
  const scale = (s * (1 - pad * 2)) / V.h;
  const tx = (s - V.w * scale) / 2 - V.x * scale;
  const ty = s * pad - V.y * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}"><circle cx="512" cy="512" r="508" fill="${bg}"${ring ? ` stroke="${ring}" stroke-width="8"` : ""}/><g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(5)})"><path d="${LOGO.LOGO_PATH}" fill="${fg}" fill-rule="evenodd"/></g></svg>\n`;
};
write("brand/logo/svg/badge-paper.svg", badge(COLORS.paperBright, COLORS.ink, COLORS.taupeLight));
write("brand/logo/svg/badge-ink.svg", badge(COLORS.ink, "#FFFFFF"));
write("brand/logo/svg/badge-sanguine.svg", badge(COLORS.sanguine, "#FFFFFF"));
write(
  "brand/logo/logo-geometry.json",
  JSON.stringify(
    {
      note: "Trace units. Generated from src/components/logoPath.ts.",
      viewBox: V,
      nibTip: LOGO.NIB_TIP,
      cradleThickness: LOGO.CRADLE_THICKNESS,
      cradleCentreline: LOGO.CRADLE_CENTRELINE,
    },
    null,
    2,
  ),
);

// PNGs at useful sizes.
const png = async (svgRel, outRel, size, square = false) => {
  let img = sharp(Buffer.from(fs.readFileSync(P(svgRel))), { density: 400 }).resize(
    square ? size : null,
    size,
    { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } },
  );
  fs.mkdirSync(path.dirname(P(outRel)), { recursive: true });
  await img.png().toFile(P(outRel));
};
for (const name of Object.keys(variants)) {
  await png(`brand/logo/svg/mark-${name}.svg`, `brand/logo/png/mark-${name}-2048.png`, 2048);
  await png(`brand/logo/svg/mark-${name}.svg`, `brand/logo/png/mark-${name}-512.png`, 512);
}
await png("brand/logo/svg/mark-two-tone.svg", "brand/logo/png/mark-two-tone-2048.png", 2048);
for (const b of ["paper", "ink", "sanguine"]) {
  for (const s of [1024, 512, 180, 64, 32]) {
    await png(`brand/logo/svg/badge-${b}.svg`, `brand/logo/png/badge-${b}-${s}.png`, s, true);
  }
}
console.log("logo vectors and PNGs written");

// ---------------------------------------------------------------- 3. icons
// 18x18 line icons from the Automate scene, plus a few the brand will need.
const ICONS = {
  form: '<rect x="2.5" y="2.5" width="13" height="13" rx="2.5"/><path d="M5.5 7 H12.5 M5.5 10.5 H10"/>',
  "ai-agent": '<path d="M9 2 L10.6 7.4 L16 9 L10.6 10.6 L9 16 L7.4 10.6 L2 9 L7.4 7.4 Z"/>',
  document: '<path d="M4.5 2.5 H10.5 L13.5 5.5 V15.5 H4.5 Z"/><path d="M7 9 H11 M7 12 H11"/>',
  email: '<rect x="2.5" y="4" width="13" height="10" rx="2"/><path d="M3 5 L9 9.8 L15 5"/>',
  sheet: '<rect x="2.5" y="3" width="13" height="12" rx="2"/><path d="M2.5 7.5 H15.5 M7 3 V15"/>',
  crm: '<circle cx="9" cy="6.5" r="3"/><path d="M3.5 15.5 C4 12 6 10.8 9 10.8 C12 10.8 14 12 14.5 15.5"/>',
  payments: '<rect x="2.5" y="4.5" width="13" height="9" rx="2"/><path d="M2.5 8 H15.5"/>',
  check: '<circle cx="9" cy="9" r="7"/><path d="M5.6 9.2 L8 11.6 L12.6 6.6"/>',
  arrow: '<path d="M3 9 H15 M10.5 4.5 L15 9 L10.5 13.5"/>',
  globe: '<circle cx="9" cy="9" r="6.5"/><path d="M2.5 9 H15.5 M9 2.5 C6.8 5 6.8 13 9 15.5 C11.2 13 11.2 5 9 2.5"/>',
  mobile: '<rect x="5" y="2" width="8" height="14" rx="2"/><path d="M8 13.5 H10"/>',
  code: '<path d="M6.5 5 L2.5 9 L6.5 13 M11.5 5 L15.5 9 L11.5 13"/>',
  cloud: '<path d="M5.5 14 H13 C14.9 14 16 12.8 16 11.2 C16 9.6 14.8 8.5 13.3 8.5 C13 6 11.2 4.5 9 4.5 C6.8 4.5 5.2 6 4.9 8.1 C3.3 8.3 2 9.5 2 11.1 C2 12.8 3.4 14 5.5 14 Z"/>',
  dashboard: '<rect x="2.5" y="2.5" width="13" height="13" rx="2.5"/><path d="M5.5 12 V9.5 M9 12 V6.5 M12.5 12 V8"/>',
  integration: '<circle cx="4.5" cy="9" r="2"/><circle cx="13.5" cy="4.5" r="2"/><circle cx="13.5" cy="13.5" r="2"/><path d="M6.4 8.1 L11.6 5.4 M6.4 9.9 L11.6 12.6"/>',
  layers: '<path d="M9 2.5 L16 6 L9 9.5 L2 6 Z"/><path d="M2 9.5 L9 13 L16 9.5 M2 12.5 L9 16 L16 12.5"/>',
  lightning: '<path d="M10 2 L4 10 H8.5 L8 16 L14 8 H9.5 Z"/>',
  quill: '<path d="M15 2.5 C9.5 3 6 7 5 12.5 L4 16"/><path d="M15 2.5 C14 7 11 10 6.5 11"/>',
};
for (const [name, body] of Object.entries(ICONS)) {
  write(
    `icons/${name}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>\n`,
  );
}
// Sprite + React export so the set is usable directly in code.
write(
  "icons/sprite.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${Object.entries(ICONS)
    .map(([n, b]) => `  <symbol id="pv-${n}" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${b}</symbol>`)
    .join("\n")}\n</svg>\n`,
);
write(
  "icons/Icons.tsx",
  `// ProtoVinci line icons (18-unit grid, 1.6 stroke). Generated by scripts/assets/build-library.mjs.
import React from "react";

export const ICON_PATHS = ${JSON.stringify(ICONS, null, 2)} as const;
export type IconName = keyof typeof ICON_PATHS;

export const Icon: React.FC<{ name: IconName; size?: number; color?: string; strokeWidth?: number }> = ({
  name,
  size = 18,
  color = "currentColor",
  strokeWidth = 1.6,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 18 18"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
  />
);
`,
);
// Preview sheet.
{
  const names = Object.keys(ICONS);
  const cols = 6, cell = 200;
  const rows = Math.ceil(names.length / cols);
  const cells = names
    .map((n, i) => {
      const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
      return `<g transform="translate(${x + 64} ${y + 40}) scale(4)" fill="none" stroke="${COLORS.ink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</g><text x="${x + cell / 2}" y="${y + 160}" font-family="Consolas, monospace" font-size="15" fill="${COLORS.graphite}" text-anchor="middle">${n}</text>`;
    })
    .join("");
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${rows * cell}"><rect width="100%" height="100%" fill="${COLORS.paperBright}"/>${cells}</svg>`;
  write("icons/_preview.svg", sheet);
  await sharp(Buffer.from(sheet)).png().toFile(P("icons/_preview.png"));
}
console.log(`${Object.keys(ICONS).length} icons written`);

// ---------------------------------------------------------------- 4. tokens
write("brand/tokens/colors.json", JSON.stringify(COLORS, null, 2));
write(
  "brand/tokens/tokens.css",
  `/* ProtoVinci film tokens. Sanguine is reserved for the line: never fill large areas with it. */
@font-face { font-family: "Switzer"; src: url("../../fonts/Switzer-Medium.woff2") format("woff2"); font-weight: 100 500; }
@font-face { font-family: "Switzer"; src: url("../../fonts/Switzer-Semibold.woff2") format("woff2"); font-weight: 501 650; }
@font-face { font-family: "Switzer"; src: url("../../fonts/Switzer-Bold.woff2") format("woff2"); font-weight: 651 900; }

:root {
${Object.entries(COLORS).map(([k, v]) => `  --pv-${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}: ${v};`).join("\n")}

  --pv-font-sans: "Switzer", system-ui, sans-serif;
  --pv-font-mono: "Geist Mono", ui-monospace, monospace;
  --pv-track-display: -0.045em;
  --pv-track-title: -0.035em;
  --pv-track-body: -0.015em;
  --pv-track-mono: 0.04em;
  --pv-track-mono-wide: 0.14em;

  --pv-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --pv-ease-soft: cubic-bezier(0.33, 1, 0.68, 1);
  --pv-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --pv-ease-pen: cubic-bezier(0.45, 0, 0.2, 1);
  --pv-ease-in: cubic-bezier(0.6, 0, 0.9, 0.3);

  /* 100 BPM grid at 30 fps */
  --pv-beat: 600ms;
  --pv-bar: 2400ms;
}
`,
);

// ---------------------------------------------------------------- 5. graphics
const G = (w, h, body, bg = "none") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg !== "none" ? `<rect width="100%" height="100%" fill="${bg}"/>` : ""}${body}</svg>\n`;
const geo = (w, h, cx, cy, r, vx, hy, sq, color) =>
  `<g fill="none" stroke="${color}" stroke-width="1.25"><circle cx="${cx}" cy="${cy}" r="${r}"/><line x1="${vx}" y1="0" x2="${vx}" y2="${h}"/><line x1="0" y1="${hy}" x2="${w}" y2="${hy}"/><rect x="${sq[0] + 34}" y="${sq[1] + 34}" width="13" height="13"/></g><rect x="${sq[0]}" y="${sq[1]}" width="18" height="18" fill="${color}"/>`;
write("graphics/construction-geometry-a.svg", G(1920, 1080, geo(1920, 1080, 269, 1102, 929, 1354, 171, [1728, 778], COLORS.taupe)));
write("graphics/construction-geometry-b.svg", G(1920, 1080, geo(1920, 1080, 1786, 22, 756, 691, 931, [134, 324], COLORS.taupe)));
write("graphics/construction-geometry-c.svg", G(1920, 1080, geo(1920, 1080, 960, 1404, 1058, 346, 216, [1651, 281], COLORS.taupe)));
write("graphics/construction-geometry-night.svg", G(1920, 1080, geo(1920, 1080, 269, 1102, 929, 1354, 171, [1728, 778], "#3A3A44"), COLORS.night));
// Hand-drawn chalk underline and the engineered version of the same stroke.
write(
  "graphics/underline-chalk.svg",
  G(1000, 60, `<defs><filter id="c" x="-5%" y="-50%" width="110%" height="200%"><feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="2" seed="5"/><feDisplacementMap in="SourceGraphic" scale="3.4" xChannelSelector="R" yChannelSelector="G"/></filter></defs><path d="M10 33 C140 22, 270 42, 410 31 S680 22, 820 34 S950 28, 990 26" fill="none" stroke="${COLORS.sanguine}" stroke-width="7" stroke-linecap="round" filter="url(#c)"/>`),
);
write("graphics/underline-engineered.svg", G(1000, 60, `<path d="M10 30 H990" fill="none" stroke="${COLORS.sanguine}" stroke-width="6" stroke-linecap="round"/>`));
// The line's signature moves, as standalone paths (frame-edge to frame-edge).
write("graphics/line-step-up.svg", G(1920, 1080, `<path d="M-10 912 H560 Q590 912 590 882 V320 Q590 290 620 290 H1300 Q1330 290 1330 320 V882 Q1330 912 1360 912 H1930" fill="none" stroke="${COLORS.sanguine}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`));
write("graphics/line-climb.svg", G(1920, 1080, `<path d="M-10 912 H660 C1100 912 1500 760 1920 0" fill="none" stroke="${COLORS.sanguineBright}" stroke-width="5" stroke-linecap="round"/>`, COLORS.night));
write("graphics/dot-grid-night.svg", G(1920, 1080, `<defs><pattern id="d" width="38" height="38" patternUnits="userSpaceOnUse"><circle cx="19" cy="19" r="1.2" fill="#FFFFFF" fill-opacity="0.11"/></pattern></defs><rect width="100%" height="100%" fill="url(#d)"/>`, COLORS.night));
write("graphics/fig-label.svg", G(520, 40, `<line x1="0" y1="20" x2="34" y2="20" stroke="${COLORS.graphite}" stroke-width="1.5"/><text x="46" y="26" font-family="Geist Mono, Consolas, monospace" font-size="20" fill="${COLORS.graphite}"><tspan fill="${COLORS.ink}" font-weight="500">fig. 02</tspan> — web app</text>`));
for (const f of fs.readdirSync(P("graphics")).filter((f) => f.endsWith(".svg"))) {
  await sharp(fs.readFileSync(P("graphics", f)), { density: 144 }).png().toFile(P("graphics", f.replace(".svg", ".png")));
}
console.log("graphics written");

// ---------------------------------------------------------------- 6. Remotion stills
if (!noRender) {
  const run = (args) => {
    const r = spawnSync(`npx remotion ${args} --log=error`, { cwd: root, stdio: "inherit", shell: true });
    if (r.status !== 0) console.error(`  FAILED: remotion ${args}`);
  };
  const propsFile = (obj) => {
    const f = path.join(root, "qa", `props-${Math.random().toString(36).slice(2)}.json`);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(obj));
    return f;
  };
  // Lockups with transparency.
  for (const color of ["ink", "white", "sanguine"]) {
    for (const [id, layout] of [["Lockup", "stacked"], ["Lockup-Horizontal", "horizontal"]]) {
      for (const tagline of [true, false]) {
        const pf = propsFile({ color, layout, tagline });
        const name = `lockup-${layout}-${color}${tagline ? "-tagline" : ""}.png`;
        run(`still ${id} "${P("brand/lockups", name)}" --image-format=png --props="${pf}"`);
        fs.rmSync(pf);
      }
    }
  }
  run(`still Palette "${P("brand/palette.png")}" --image-format=png`);
  // Social and web cards.
  for (const id of ["OG", "YouTube-Thumb", "Instagram-Portrait", "Instagram-Square", "Story", "LinkedIn-Banner", "X-Header", "Night-Wide"]) {
    run(`still Card-${id} "${P("social", `card-${id.toLowerCase()}.png`)}" --image-format=png`);
  }
  // Key frames from the film, one per scene, in every format (silent props).
  const silent = path.join(root, "scripts/qa/silent-props.json");
  const KEY = { "01-hook": 160, "02-sketch": 345, "03-build": 700, "04-automate": 1050, "05-scale": 1335, "06-proof": 1470, "07-logo": 1640, "08-end-card": 1795 };
  for (const fmt of ["16x9", "9x16", "1x1"]) {
    for (const [name, frame] of Object.entries(KEY)) {
      run(`still Master-${fmt} "${P("frames", fmt, `${name}.jpg`)}" --frame=${frame} --image-format=jpeg --jpeg-quality=92 --props="${silent}"`);
    }
  }
  // Logo-sting keyframes (the animation as a storyboard).
  for (const [i, f] of [24, 48, 60, 72, 84, 96, 120, 170].entries()) {
    run(`still LogoSting-16x9 "${P("frames/logo-sting", `sting-${String(i + 1).padStart(2, "0")}-f${f}.jpg`)}" --frame=${f} --image-format=jpeg --jpeg-quality=92`);
  }
  console.log("stills rendered");
}
console.log("done:", LIB);
