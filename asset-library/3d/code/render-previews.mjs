// Renders a 3/4-view preview PNG of every model, plus a contact sheet.
//
//   node --no-warnings scripts/three/render-previews.mjs [modelId ...]

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MODEL_IDS } from "../../src/three/models.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(root, "asset-library/3d/previews");
fs.mkdirSync(OUT, { recursive: true });

const NIGHT = new Set(["workflow-node", "scale-unit", "scale-field", "line-climb", "line-helix"]);
const ELEVATION = { "scale-field": 38, "paper-sheet": 30, "construction-set": 18, "logo-plinth": 16 };
// With spin 360 over 180 frames, frame 102 puts the model about 25 degrees off front.
const FRAME = 102;

const ids = process.argv.slice(2).length ? process.argv.slice(2) : MODEL_IDS;
for (const id of ids) {
  const props = path.join(root, "qa", `tt-${id}.json`);
  fs.writeFileSync(props, JSON.stringify({ model: id, ground: NIGHT.has(id) ? "night" : "paper", spin: 360, elevation: ELEVATION[id] ?? 12 }));
  const out = path.join(OUT, `${id}.jpg`);
  const r = spawnSync(`npx remotion still Turntable "${out}" --frame=${FRAME} --image-format=jpeg --jpeg-quality=90 --props="${props}" --gl=angle --log=error`, {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  fs.rmSync(props);
  console.log(`${r.status === 0 ? "ok    " : "FAILED"} ${id}`);
}

// Contact sheet (square tiles, so the generic tiler's aspect assumption holds).
const tmp = path.join(root, "qa", "three-sheet");
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });
MODEL_IDS.forEach((id, i) => {
  const f = path.join(OUT, `${id}.jpg`);
  if (fs.existsSync(f)) fs.copyFileSync(f, path.join(tmp, `m-${String(i).padStart(4, "0")}.png`));
});
spawnSync(`node scripts/qa/contact-sheet.mjs "${tmp}" "${path.join(OUT, "_all-models.jpg")}" 5 380`, { cwd: root, stdio: "inherit", shell: true });
fs.rmSync(tmp, { recursive: true, force: true });
