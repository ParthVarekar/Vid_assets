# 3D birds: remaining work, split by model

Written 17 November 2026. Covers Gates 2–4 of the approved plan (three furry 3D birds, a 3D desk set, the Puppet Studio editor, a first episode). Gate 1 (the look) is done and approved: commit `a63a68d`. Gate 2 part 1 (rig schema, clip format, evaluator, extended rig) is commit `5af5e07`.

Pick tasks from your own section, in order. A task marked **after Ox** waits for that Opus task to be committed; check `git log` first.

**Ground rules for every task**
- Project root: `C:\Users\Parth\Desktop\protovinci_advert_fable`. Shell: Git Bash or PowerShell on Windows. Node 24.
- Run `npx tsc --noEmit` after any code change; it must print nothing.
- Render 3D with `--gl=angle`. Read `src/world3d/` before touching it; the rig is described in `src/world3d/rig/schema.ts` (every control is one channel) and clips in `src/world3d/anim/clip.ts`.
- Everything must be a pure function of the frame (no `Math.random`, no `useFrame` animation, no state carried between frames). Remotion renders frames out of order.
- Look at what you render. Every render task says what to check.
- Never put videos or audio into `asset-library/`. Never commit a file over 95 MB.
- Commit messages end with the attribution line from the session's instructions. Push to `origin main`; if GitHub times out, retry with `git -c http.postBuffer=524288000 push`.
- Renders currently run on the Intel iGPU (about 3 s per frame). If `npx remotion still GpuProbe out/gpu.png --gl=angle` prints NVIDIA, the user has switched it and renders are faster.

---

## OPUS tasks (architecture, rig craft, animation and design taste)

### O1. Shared scene and Remotion `Episode` composition
`src/world3d/BirdScene.tsx` renders a clip at a frame (cast, light rig, camera from the clip's camera track, contact shadows). Both the editor and Remotion use it, so they show the same frame. `Episode` registers every clip in `content/episodes/*.anim.json`.

### O2. Puppet Studio core (`editor/`, Vite)
State store with undo/redo; 3D viewport (orbit or shot camera, click a bird to select, drag handles for move/turn and an eye-target handle); inspector sliders built from the schema; dope sheet (scrub, set key, auto-key, select/drag/delete keys); playback; save/load JSON into `content/episodes` through a local endpoint.

### O3. Graph editor
Curves for the selected channels, with draggable bezier easing handles and interpolation presets.

### O4. Gate 2 rig demo (6 s) and parity check
Hand-author `content/episodes/rig-demo.anim.json`: expressions, a gesture, squash and stretch, a hop, a few steps. Render it, check the editor frame matches the Remotion frame, and review the motion from frame strips.

### O5. Gate 3 set: "The Desk" (done, 17 Nov)
Layout of the miniature desk diorama, brand props built in code (fountain pen, inkpot, sketchbook with red-chalk wireframes, laptop showing the site), the window with the Mumbai skyline, day/golden/night light rigs, camera presets, depth of field. **Needs S3 (Poly Haven props) first.**

### O6. Gate 4 first episode
A 12–15 s scene with all three birds: story beat, staging, hand animation, 16:9 and 9:16 framing, captions and end card from `src/kit/VideoKit.tsx`.

### O7 (optional). Fur pass 2
A softer, velvety close-up look, closer to the reference: a shorter undercoat, softer strand tips, less "hairy" detail up close.

---

## SONNET tasks (well-specified building from the specs above)

### S1. Pose library — data and reference sheet
Write `content/poses/expressions.json` (12) and `content/poses/gestures.json` (12). Each entry: `{ "name": "...", "values": { "<channel>": number } }`, using only channel ids from `src/world3d/rig/schema.ts`.
- **Expressions:** neutral, happy, delighted, laughing, curious, thinking, sceptical, smug, surprised, scared, sad, angry. Use the lid angles (`lidTiltL/R`), `lidOpen`, `squint`, `pupil`, look and `tilt`. Make sceptical and smug asymmetric.
- **Gestures:** wave L, wave R, point forward, shrug, arms up (cheer), hug-self, facepalm-ish (wing to face), thumbs-up-ish, presenting (wing out, palm up), tiptoe, crouch (anticipation), proud chest-out.

Then add a Remotion still `PoseSheet-Expressions` and `PoseSheet-Gestures` that draws every pose on all three birds in a grid with labels. Render both and look at them: every expression must read at thumbnail size. Fix values until they do.

### S2. Pose panel in Puppet Studio — **after O2** (basic panel exists)
`editor/src/PosePanel.tsx` already lists `content/poses/{expressions,gestures,custom}.json`. Click applies a pose at the playhead; Shift+click applies it mirrored. Add:
- **"Save current pose":** prompt for a name, choose which channel groups to include (body/eyes/beak/wings/legs/crest), and append `{ name, values }` to `content/poses/custom.json` with `savePoses` from `editor/src/api.ts`.
- **Delete a custom pose.**
- **Hover preview:** show the pose's values in a tooltip.

Done when a saved pose survives a page reload and applies correctly to another bird.

### S3. Poly Haven props pipeline (done by Opus, 17 Nov)
- Install `@gltf-transform/cli@4.5`.
- Write `scripts/set/fetch-polyhaven.mjs`. It downloads the 1k glTF of each approved model into `assets-raw/polyhaven/<id>/` (gitignored), using the API `https://api.polyhaven.com/files/<id>`.
- Then it optimises each model into `public/3d/props/<id>.glb`: `gltf-transform optimize` with texture resize 1024, webp textures and meshopt.
- **Approved models:** desk_lamp_arm_01, classic_laptop, office_notepads, binder_notebook, book_encyclopedia_set_01, decorative_book_set_01, potted_plant_02, calathea_orbifolia_01, ceramic_vase_01, wooden_table_02, magnifying_glass_01. Also one interior HDRI (1k .hdr into `public/3d/hdri/`).
- Write `public/3d/props/CREDITS.md` (all CC0, Poly Haven).
- Add a `Prop` component (`src/world3d/set/Prop.tsx`) that loads a GLB with drei `useGLTF` and `staticFile`. Wrap the loading in Remotion's `delayRender`/`continueRender` so renders wait for it.
- **Done when** a test still shows every prop on a plain floor and total `public/3d/props` is under 120 MB.

### S4. Editor extras — **after O3**
Already done: copy/paste keys, Bezier/Linear/Step and ease presets for selected keys (Curves panel), undo/redo. Add:
- Box-select in the dope sheet (drag on empty lane area).
- A right-click menu on dope-sheet keys: interpolation and ease presets (reuse `setInterp`).
- A "normalise" toggle in the Curves panel, so channels with different ranges (degrees vs 0..1) share the height.
- Channel search box, plus a keyboard shortcut overlay (`?`).
- An audio track: load the clip's `audio` file, draw its waveform under the ruler, and a button "Talk from audio" that keys the `talk` channel from the waveform's loudness for the selected bird.

### S5. 9:16 follow camera for episodes
Port the idea of `useFollowCamera` (in `src/mascot/Actor.tsx`, before H1 deletes it — copy what you need first) to 3D. When the composition is taller than wide, the camera target follows the average of the cast's `x`, smoothed over ±10 frames by sampling the clip. Verify with frame strips that nobody leaves the frame.

### S6. Docs — **after O4, S1**
- `docs/ANIMATOR-GUIDE.md`: how to run Puppet Studio, make a clip, use handles, keys, curves and poses, and render with Remotion.
- `docs/RIG-REFERENCE.md`: generated by a script from `schema.ts`, with every channel, its range and its help text, plus a rendered sheet showing min/max of the main channels.
- `docs/CHARACTER-BIBLE.md`: the three birds' looks, personalities, how each one moves, and do/don't.
- Add a "3D characters" section to `asset-library/MOTION-RULES.md`.

---

## HAIKU tasks (mechanical: run, copy, check, commit)

### H1. Remove the old 2D Nib and Studio — **after O4**
Delete `src/mascot/`, `asset-library/mascot/` and `asset-library/scenes/`, and remove `MascotCompositions` from `src/Root.tsx`. Then:
```bash
grep -rn "mascot\|Nib\b\|Studio-Day\|asset-library/scenes" --include=*.ts --include=*.tsx --include=*.md . | grep -v node_modules
```
Remove or reword every remaining reference (READMEs, CONTENT-KIT, MOTION-RULES) so nothing points at deleted files. `npx tsc --noEmit` must be clean and `npx remotion compositions` must list no `Nib-` ids.

### H2. Re-exported GLBs
28 files in `asset-library/3d/glb/` show as modified since the three.js upgrade. Run `node scripts/three/export-glb.mjs`, then `git diff --stat asset-library/3d/glb`. Render `Turntable` once (`npx remotion still Turntable out/tt.png --frame=40 --gl=angle`) and check the logo looks right. If it does, commit the GLBs with the message "Re-export GLBs with three 0.187".

### H3. Determinism check — **after O4**
Render the same frame twice and compare:
```bash
npx remotion still Episode-rig-demo out/det-a.png --frame=75 --gl=angle
npx remotion still Episode-rig-demo out/det-b.png --frame=75 --gl=angle
node -e "const c=require('crypto'),f=require('fs');for(const p of ['out/det-a.png','out/det-b.png'])console.log(c.createHash('sha1').update(f.readFileSync(p)).digest('hex'))"
```
The two hashes must match. If they don't, report it to the user; don't try to fix it.

### H4. Library stills of the birds — **after S1**
Copy the Gate 1 sheets and the pose sheets into `asset-library/characters/` (images only): `turnaround-sheet.jpg`, `lineup.png`, the three close-ups, `poses-expressions.jpg` and `poses-gestures.jpg`. Add a short `asset-library/characters/README.md` that lists them. Commit and push.

---

## Status
- **17 Nov, Opus:** this sheet written. Working on O1–O4 now.
- **17 Nov, Opus:** O1–O4 done.
  - **O1:** `BirdScene` plus the `Episode-*` compositions (any `content/episodes/*.anim.json` is registered automatically).
  - **O2/O3:** Puppet Studio in `editor/`; run `npm run editor` and open http://localhost:5174.
  - **O4:** `content/episodes/rig-demo.anim.json` (6.5 s), written with the motion helpers in `scripts/anim/authoring.mjs` (`hop`, `walk`, `pose`, `shake`, `say`, `camera`). Editor/Remotion parity checked at frame 150.
  - **Measured on the Intel iGPU, 1249×702 viewport:** 46 ms/frame at preview fur, 115 ms at final.
  - **Next for Sonnet:** S1, then S2/S4/S3/S5. **Next for Haiku:** H1 (removal), H2, H3. **Next Opus task:** O5 (the set) once S3 lands.
- **17 Nov, Opus (asked to take S3 too):** S3 and O5 done.
  - **S3:** `scripts/set/fetch-polyhaven.mjs`; 9 props + HDRI + wall texture = 5.3 MB in `public/3d/`. Credits are in `public/3d/props/CREDITS.md`. Loaders in `src/world3d/set/assets.ts` use React Suspense, so Remotion waits for assets.
  - **O5:** `src/world3d/set/DeskSet.tsx`.
    - **Scene:** sketchbook floor, fountain pen, inkpot, modern laptop, window with the Mumbai/Sea Link view (`paintings.ts`), and the room.
    - **Light rigs:** `desk-day`, `desk-golden`, `desk-night` in `lighting.ts`, with shadows.
    - **Lens:** depth of field and bloom (`Lens.tsx`), with new camera channels `blur` and `focus`.
    - **Camera presets:** `set/cameraPresets.ts` (wide, establishing, hero, closeup, screen, reverse, overhead, vertical).
    - **Review:** `DeskPreview` still plus `scripts/set/render-set-sheet.mjs`.
    - **Clips** pick the world with `"set": "desk"` and `"rig": "desk-golden"`. The editor has Set/Light pickers and a camera-preset menu.
  - **Speed (Intel iGPU):** about 6 s per final frame of the Desk with lens; the editor at preview quality takes about 200 ms per frame.
  - **Next:** S1 (poses) and S5 (vertical follow camera) for Sonnet; H1–H3 for Haiku; O6 (first episode on the Desk) for Opus.
