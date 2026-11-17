// Generates docs/RIG-REFERENCE.md from the rig schema, so the reference can
// never drift from the code.
//
//   node --no-warnings scripts/docs/make-rig-reference.mjs           # the markdown
//   node --no-warnings scripts/docs/make-rig-reference.mjs --sheet   # also re-render docs/images/rig-channels.jpg
//
// The sheet needs a browser render (about a minute); the markdown is instant.

import fs from "node:fs";
import path from "node:path";
import { CAMERA_CHANNELS, CHANNELS, GROUPS } from "../../src/world3d/rig/schema.ts";

const ROOT = process.cwd();
const docs = path.join(ROOT, "docs");
fs.mkdirSync(path.join(docs, "images"), { recursive: true });

const esc = (s) => s.replace(/\|/g, "\\|");
const unit = (c) => (c.unit === "deg" ? "°" : c.unit === "u" ? " u" : "");
const range = (c) => `${c.min}${unit(c)} … ${c.max}${unit(c)}`;
const table = (list) =>
  ["| Channel | Name in the editor | Range | Default | What it does |", "| --- | --- | --- | --- | --- |", ...list.map((c) => `| \`${c.id}\` | ${c.label} | ${range(c)} | ${c.default}${unit(c)} | ${esc(c.help)} |`)].join("\n");

const GROUP_INTRO = {
  body: "Where the bird stands and how its whole body bends. `x`, `y`, `z` and `yaw` place it in the world; the rest shape it.",
  eyes: "Where the eyes look and what the lids do. Lids carry most of the acting.",
  beak: "The lower beak.",
  wings: "Each wing has three controls: raise (out and up), swing (forward and back) and twist (along its length).",
  legs: "Feet are planted: the hips follow the body and the feet stay where they are, so squash, lean and twist never slide them. These move a foot on purpose.",
  crest: "The head feather(s). Secondary motion adds sway on top of this.",
  life: "Behaviour layers that run on top of the keys: blinking, breathing, talking, follow-through and wind. Key their amounts to switch them on and off.",
};

const mirrored = CHANNELS.filter((c) => c.mirror);

const md = `# Rig reference

> Generated from \`src/world3d/rig/schema.ts\` by \`scripts/docs/make-rig-reference.mjs\`. Do not edit by hand: change the schema and regenerate.

Every control of the three birds (Quill, Ink and Chalk) is one number, a **channel**. They all share the same channels, so a pose or a move made for one bird works on the others. A clip stores keys per channel (see [ANIMATOR-GUIDE.md](ANIMATOR-GUIDE.md)); Puppet Studio builds its sliders and timeline rows from this list.

Units: positions are in set units, where **1 u is Quill's body height** (about 10 cm in the Desk's miniature world). Angles are in degrees. Left and right (\`L\`, \`R\`) are screen-left (−x) and screen-right (+x) when the bird faces the camera.

![Each channel at its minimum, default and maximum](images/rig-channels.jpg)

${GROUPS.map((g) => `## ${g[0].toUpperCase()}${g.slice(1)}\n\n${GROUP_INTRO[g]}\n\n${table(CHANNELS.filter((c) => c.group === g))}`).join("\n\n")}

## Camera

Keyed on the \`camera\` track (and optionally \`camera-9x16\` for tall formats; see the guide). The Desk's presets in \`src/world3d/set/cameraPresets.ts\` set most of these at once.

${table(CAMERA_CHANNELS)}

## Mirroring

"Mirror pose" (Shift-click a pose) flips a pose left to right: side-signed channels are negated, and left/right pairs swap values.

| Channel | Becomes |
| --- | --- |
${mirrored.map((c) => `| \`${c.id}\` | ${c.mirror === "negate" ? "its negative" : `\`${c.mirror}\``} |`).join("\n")}

## Which channels the behaviours touch

- \`autoBlink\` raises \`blinkL\` and \`blinkR\` on a natural schedule (every 2.5–5 s, sometimes a double blink). Your own blink keys always win while they are higher.
- \`breathe\` adds a tiny pulse to \`stretch\` and \`fluff\`.
- \`talk\` opens the beak in syllable rhythm while above 0, scaled by its value; it never closes a beak you opened with \`beakOpen\`.
- \`jiggle\` is follow-through: the crest, the fur tips and the wings lag behind moves of \`x\`, \`y\`, \`lean\`, \`tilt\` and \`stretch\`, and settle after landings.
- \`wind\` pushes fur tips and the crest sideways, gusting.

All of them are pure functions of the frame, so any frame renders the same wherever it is rendered.
`;

fs.writeFileSync(path.join(docs, "RIG-REFERENCE.md"), md);
console.log(`wrote docs/RIG-REFERENCE.md (${CHANNELS.length} bird channels, ${CAMERA_CHANNELS.length} camera channels)`);

if (process.argv.includes("--sheet")) {
  const { bundle } = await import("@remotion/bundler");
  const { renderStill, selectComposition } = await import("@remotion/renderer");
  const sharp = (await import("sharp")).default;
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/index.ts") });
  const composition = await selectComposition({ serveUrl, id: "RigSheet", inputProps: {}, chromiumOptions: { gl: "angle" } });
  const png = path.join(docs, "images", "rig-channels.png");
  await renderStill({ serveUrl, composition, output: png, imageFormat: "png", chromiumOptions: { gl: "angle" }, overwrite: true });
  await sharp(png).jpeg({ quality: 88 }).toFile(path.join(docs, "images", "rig-channels.jpg"));
  fs.rmSync(png);
  console.log("wrote docs/images/rig-channels.jpg");
}
