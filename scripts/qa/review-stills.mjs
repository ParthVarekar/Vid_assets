// Renders review stills for a composition and tiles them into contact sheets.
//
//   node scripts/qa/review-stills.mjs [compositionId] [everyNFrames]
//
// Defaults to Master-16x9 with one frame per beat (18 frames), which gives
// 100 frames across the film. Sheets are written to qa/sheets/.

import { spawnSync } from "node:child_process";
import fs from "node:fs";

const id = process.argv[2] ?? "Master-16x9";
const every = Number(process.argv[3] ?? 18);
const total = id.startsWith("Cutdown") ? 450 : 1800;
const tall = id.endsWith("9x16");

const frames = [];
for (let f = 9; f < total; f += every) frames.push(f);
const dir = `qa/stills/${id}`;
fs.rmSync(dir, { recursive: true, force: true });

const r = spawnSync(
  "npx",
  // Props come from a file: inline JSON does not survive shell quoting on Windows.
  ["remotion", "render", id, dir, `--frames=${frames.join(",")}`, "--image-format=jpeg", "--jpeg-quality=86", "--log=error",
   "--props=scripts/qa/silent-props.json"],
  { stdio: "inherit", shell: true },
);
if (r.status !== 0) process.exit(r.status ?? 1);

// Split into sheets of 25 so each stays readable.
const files = fs.readdirSync(dir).sort();
const per = tall ? 24 : 25;
for (let i = 0; i * per < files.length; i++) {
  const part = `${dir}-part${i + 1}`;
  fs.rmSync(part, { recursive: true, force: true });
  fs.mkdirSync(part, { recursive: true });
  for (const f of files.slice(i * per, (i + 1) * per)) fs.copyFileSync(`${dir}/${f}`, `${part}/${f}`);
  spawnSync(
    "node",
    ["scripts/qa/contact-sheet.mjs", part, `qa/sheets/${id}-${i + 1}.jpg`, tall ? "8" : "5", tall ? "300" : "640"],
    { stdio: "inherit" },
  );
  fs.rmSync(part, { recursive: true, force: true });
}
