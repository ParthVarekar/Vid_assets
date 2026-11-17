# Remaining work, split by model

Written 17 November 2026 by the session that built the film, the asset library, the content kit, Nib and the Studio. The design-heavy work is done. What is left is assembly, checking and housekeeping, listed in the order to do it.

**Ground rules for every task**
- Project root: `C:\Users\Parth\Desktop\protovinci_advert_fable`. Shell: Git Bash or PowerShell on Windows. Node 24.
- Run `npx tsc --noEmit` after any code change; it must print nothing.
- Fonts are self-hosted (`src/fonts.ts`). Do not switch back to Google Fonts; it times out here.
- Never put videos or audio into `asset-library/`.
- Look at what you render. Every render task says what to check.
- Commit messages end with the attribution line given in the session's instructions. Push to `origin main` (https://github.com/ParthVarekar/Vid_assets). Never commit a file over 95 MB.

---

## HAIKU tasks (mechanical: run, copy, check, commit)

### H1. Check the content-kit render finished
Run:
```bash
for d in social-templates/portrait social-templates/square social-templates/story social-templates/highlights social-templates/profile backgrounds video-kit/previews; do echo "$d $(find asset-library/$d -type f | wc -l)"; done
```
Expected: 42, 42, 42, 6, 2, 30 (backgrounds: 5 sizes × 2 tones × 3 variants), 8.

If any count is short, run `node --no-warnings scripts/assets/build-kit.mjs` (it skips finished files) and re-check.

### H2. Render Nib's reference sheets and Studio stills into the library
```bash
mkdir -p asset-library/mascot asset-library/scenes
npx remotion still Nib-Expressions asset-library/mascot/expressions.jpg --image-format=jpeg --jpeg-quality=90
npx remotion still Nib-Gestures asset-library/mascot/gestures.jpg --image-format=jpeg --jpeg-quality=90
npx remotion still Nib-Outfits asset-library/mascot/outfits.jpg --image-format=jpeg --jpeg-quality=90
npx remotion still Studio-Day asset-library/scenes/studio-day.jpg --image-format=jpeg --jpeg-quality=90
npx remotion still Studio-Golden asset-library/scenes/studio-golden.jpg --image-format=jpeg --jpeg-quality=90
npx remotion still Studio-Night asset-library/scenes/studio-night.jpg --image-format=jpeg --jpeg-quality=90
```
Open each file and confirm it is not blank and not cropped. `outfits.jpg` has never been viewed: check that every prop is visible near the right hand and the "SHIP IT" flag text reads correctly. If it is wrong, report it to the user for a Sonnet task (S2); do not fix the drawing yourself.

### H3. Render the demo episode as a storyboard (stills only)
```bash
npx remotion render Nib-Demo qa/nib/story --frames=0,30,60,80,110,140,175,212,240,280,310,345 --image-format=jpeg --jpeg-quality=85
node scripts/qa/contact-sheet.mjs qa/nib/story asset-library/mascot/demo-storyboard.jpg 4 480
npx remotion render Nib-Demo-Vertical qa/nib/story-v --frames=30,80,130,212,330 --image-format=jpeg --jpeg-quality=85
```
In the vertical frames, check Nib is inside the frame at every frame. If Nib is cut off, report it for Sonnet task S3.

### H4. Copy the mascot code into the library
```bash
mkdir -p asset-library/mascot/code
cp src/mascot/*.ts src/mascot/*.tsx asset-library/mascot/code/
cp src/fonts.ts asset-library/code/fonts.ts
cp public/assets/fonts/GeistMono-Variable.woff2 asset-library/fonts/
```

### H5. Commit and push
```bash
git add -A
git status --short | wc -l
```
Then make sure nothing large is staged:
```bash
git diff --cached --name-only | while read f; do [ -f "$f" ] && [ $(stat -c%s "$f") -gt 95000000 ] && echo "TOO BIG: $f"; done
```
Commit with the message "Add content kit renders, Nib mascot and Studio set", then push.

---

## SONNET tasks (judgement: small code changes, reviewing, writing)

### S1. Update the library documentation
- **`asset-library/README.md`:** add rows for `mascot/` (Nib: sheets, storyboard, code, `PUPPET-GUIDE.md`) and `scenes/` (Studio stills), and link `mascot/PUPPET-GUIDE.md` in the opening paragraph.
- **`asset-library/CONTENT-KIT.md`:** add a short section 6 "Mascot and set" that points to the puppet guide.
- **`README.md` (project root):** add one line under Structure for `src/mascot/` and `src/kit/`, and the new compositions.
- Keep the existing tone: plain, specific, tables where they help.

### S2. Fix anything H2 reported in the outfits sheet
Props are drawn in `Prop` in `src/mascot/Mascot.tsx`, positioned at the right hand (`x`, `y`) with the forearm angle. Upright props ignore the angle. Adjust offsets only; keep the shapes. Re-render `Nib-Outfits` and look at it.

### S3. Vertical framing for episodes
If H3 found Nib cut off in 9:16: in `NibDemo` (`src/mascot/MascotCompositions.tsx`), pass a `camera` to `<Studio>` that follows Nib's x. Compute Nib's x per frame with `perform(EPISODE_DEMO, frame).x` from `Actor.tsx`, and use it as `camera.x`, smoothed and clamped to [540, 1380]. Only do this when the composition is taller than it is wide. Re-render the H3 vertical frames to confirm.

### S4. Add the mascot to MOTION-RULES.md
Add a section 13 "Character animation" to `asset-library/MOTION-RULES.md` with the rules already used in `Actor.tsx` and the puppet guide:
- Steps land on the 18-frame beat.
- Hold a gesture for at least 20 frames.
- Anticipate a move 4–6 frames before it.
- The eyes lead a turn by 4–6 frames.
- The feather lags behind motion.
- Blinks come every 2.5–5 s.
- Nib must never be drawn with a hand-made logo; use the traced mark.

Keep the section under 25 lines.

### S5. Optional, only if the user asks: more episodes
Write new `Script` objects in a new file, `src/mascot/episodes.ts`, following `EPISODE_DEMO`. Suggested first three, from the brand's own lines:
1. "Some ideas shouldn't stay ideas" (Nib on paper, then at the desk).
2. "What we build" (Nib presents the three pillars, using `Callout`s from the video kit).
3. "Shipped in weeks" (Nib with the SHIP IT flag, at golden hour).

Use only claims that appear in `src/kit/content.ts`.

---

## Already verified (do not redo)
- Film, cutdown, social formats, asset library, 45 3D models, social templates (126 rendered and spot-checked), video kit demo.
- Nib: expressions and gestures sheets checked; demo episode checked at 6 frames in 16:9.
- Studio: night variant checked.

## Known gaps (tell the user; not tasks)
- No person has listened to the film's score.
- `outfits`, the `golden` and `day` Studio stills, and the vertical demo have not been viewed by the building session.
