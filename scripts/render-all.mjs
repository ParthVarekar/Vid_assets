// Renders every deliverable, or just the ones named on the command line.
//
//   node scripts/render-all.mjs                 all five
//   node scripts/render-all.mjs Master-16x9     one
//   node scripts/render-all.mjs Cutdown-16x9 Cutdown-9x16
//
// Two files are written for each composition:
//   renders/masters/<name>.mp4   H.264 CRF 16, AAC 320k. Large: the film's
//                                grain is close to incompressible at this quality.
//   renders/<name>.mp4           Web encode (CRF 23, fast-start) for publishing.
//
// The web encode needs FFmpeg on PATH. Without it, only the masters are written.

import { spawnSync } from "node:child_process";
import fs from "node:fs";

const JOBS = {
  "Master-16x9": "protovinci-off-the-page-16x9.mp4",
  "Master-9x16": "protovinci-off-the-page-9x16.mp4",
  "Master-1x1": "protovinci-off-the-page-1x1.mp4",
  "Cutdown-16x9": "protovinci-cutdown-15s-16x9.mp4",
  "Cutdown-9x16": "protovinci-cutdown-15s-9x16.mp4",
};

const wanted = process.argv.slice(2);
const ids = wanted.length ? wanted : Object.keys(JOBS);
fs.mkdirSync("renders/masters", { recursive: true });
const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { shell: true }).status === 0;
if (!hasFfmpeg) console.warn("FFmpeg not found on PATH: web encodes will be skipped.");
const mb = (f) => `${(fs.statSync(f).size / 1048576).toFixed(1)} MB`;

let failed = 0;
for (const id of ids) {
  if (!JOBS[id]) {
    console.error(`unknown composition "${id}". Known: ${Object.keys(JOBS).join(", ")}`);
    failed++;
    continue;
  }
  const master = `renders/masters/${JOBS[id]}`;
  const web = `renders/${JOBS[id]}`;
  const started = Date.now();
  console.log(`\n${id}`);
  const r = spawnSync(
    `npx remotion render ${id} ${master} --codec=h264 --crf=16 --audio-bitrate=320k --log=error`,
    { stdio: "inherit", shell: true },
  );
  if (r.status !== 0 || !fs.existsSync(master)) {
    console.error(`  render FAILED (exit ${r.status})`);
    failed++;
    continue;
  }
  console.log(`  master ${master}  ${mb(master)}  in ${((Date.now() - started) / 1000).toFixed(0)}s`);
  if (!hasFfmpeg) continue;
  const e = spawnSync(
    `ffmpeg -y -v error -i ${master} -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k ${web}`,
    { stdio: "inherit", shell: true },
  );
  if (e.status === 0 && fs.existsSync(web)) console.log(`  web    ${web}  ${mb(web)}`);
  else {
    console.error(`  web encode FAILED (exit ${e.status})`);
    failed++;
  }
}
process.exit(failed ? 1 : 0);
