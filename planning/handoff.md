# Handoff — what is done, what is left

> **Final status (13 Nov 2026):** all five deliverables are rendered, probed (resolution, duration, codecs correct) and pushed. Items 1–5 below were completed in a reduced form: master and square were reviewed at about 15–50 frames each, 9:16 at 18, the cutdown at 25 plus a final 12 from the delivered file. The vertical version was not re-reviewed after its last small fixes (label position, proof-card travel). Still open: item 6 (a person must listen to the score), item 7 (documents below still describe the original design), and the Higgsfield and client-clearance blockers. A fuller frame-by-frame review of 9:16 and 1:1 would be the next quality step.

Written 13 November 2026, partway through production, so the remaining steps can be finished by anyone (or any model) without the earlier conversation. Tick items off as they are done and keep this file truthful.

## State of the project

**Done and verified by rendering stills**

- Research, creative strategy, storyboard and production plan (`research/`, `planning/`).
- Brand assets collected; logo traced to vector and split into quill and cradle (`scripts/assets/`).
- All six scenes and both compositions (`src/`). The film renders end to end in 16:9; 9:16 was spot-checked at seven frames.
- Original score and sound design (`scripts/audio/render-score.mjs`), measured at −14.0 LUFS, estimated true peak −1.0 dBTP.
- QA tools: contact sheets, audio analysis, batch render (`scripts/qa/`, `scripts/render-all.mjs`).

**Not done yet**

1. **Full review of the master.** Render `npm run qa:stills` (one frame per beat), read every sheet in `qa/sheets/`, and fix what is weak. Known items to look at:
   - Build scene: the artefacts sit small in the 16:9 frame; consider enlarging the stage.
   - Scale scene: check the tile field reads as "multiplying" and the word stays legible over it.
   - Proof scene: in 16:9 only about three cards are in frame; check the quill does not sit on a caption.
   - Reveal: check the line's flourish into the cradle looks intentional at frames 1540–1580.
   - Every push between scenes: check the line joins without a kink, especially the diagonal one at frame 1368.
2. **Review 9:16 and 1:1** the same way (`node scripts/qa/review-stills.mjs Master-9x16`, `Master-1x1`). 1:1 has not been looked at at all.
3. **Review the cutdown** (`node scripts/qa/review-stills.mjs Cutdown-16x9 9`). It has never been rendered. Its event tables are the `CUT_*` constants in `src/timeline.ts`.
4. **Render all five deliverables:** `npm run render`.
5. **Verify the files:** duration, resolution, frame rate, audio stream. A system `ffprobe` is available.
6. **Have a person listen to the score.** The author could not. See the audio section below.
7. **Reconcile the documents with what was built** (list at the end of this file).
8. **Write `README.md`** (project structure, how to render, how to change copy, the Higgsfield path, known limits).
9. Optional: remove the unused packages `@remotion/noise` and `@remotion/layout-utils`.

## Commands

| Task | Command |
| --- | --- |
| Preview in Studio | `npm run dev` |
| Type check | `npm run typecheck` |
| Rebuild logo vector and textures | `npm run assets` |
| Re-render the score | `npm run audio` |
| Analyse the score | `npm run audio:check` |
| Review stills | `node scripts/qa/review-stills.mjs <CompositionId> [everyNFrames]` |
| Render everything | `npm run render` |
| Render one | `node scripts/render-all.mjs Master-9x16` |

Composition ids: `Master-16x9`, `Master-9x16`, `Master-1x1`, `Cutdown-16x9`, `Cutdown-9x16`.

## How the film is put together

- `src/timeline.ts` is the only clock. 100 BPM at 30 fps: 18 frames a beat, 72 a bar. Each scene has an event table (`HOOK`, `BUILD`, …) in frames local to the scene. The score reads the same tables, so retiming a scene and running `npm run audio` keeps sound in sync.
- Scenes read their frame from `useSceneFrame()`; 0 is the scene's bar line and it can be negative, because scenes mount 12 frames early for the camera move.
- `src/utilities/layout.ts` decides where things go in each format. Scene artwork is drawn in a 1000×640 stage and scaled to fit.
- The line enters every scene at mid-left and leaves at mid-right at `layout.threadY`. The one exception is Scale, which leaves through the top-right corner; the next scene picks it up at the bottom-left corner with the same slope (`climbSlope` in `src/scenes/common.ts`).
- Sanguine red is used for the line and the two underlines only. Nothing else may be red.

## Audio: what was checked and what was not

Checked by measurement (`qa/audio/*-report.json`, spectrogram PNGs): integrated loudness, true-peak estimate, loudness per bar, spectral balance. The per-bar profile follows the intended arc: quiet opening, groove from bar 6, a drop for the proof scene, the loudest bar where the logo lands.

Not checked: how it actually sounds. Things a listener should judge first:

- Whether the limiter pumps on kick hits (it is reducing gain on about a quarter of samples).
- Whether the chalk "scratch" reads as chalk or as hiss.
- Whether the pings in the Automate scene are pleasant or busy.
- Overall tone: it was brightened twice by measurement and may still be dark, or now be harsh.

Levels are plain numbers in `kit()` and in the two `arrange…` functions. Stems are written next to the mix. To ship silent, render with `--props={"audio":null,"showWork":true,"url":"protovinci.vercel.app"}`.

## Blockers that need the account owner

- **Higgsfield has 0 credits.** No generated plates, music or voice exist. `scripts/higgsfield/generate-plates.ps1` is still to be written if that path is wanted; the prompts are described in `planning/production-plan.md`.
- **Client screens in the proof scene** need the agency's confirmation for advertising use. `showWork: false` switches them off.

## Documents that no longer match the build

- `planning/storyboard.md`: hook timings moved earlier (lines at beats 2 and 3, underline from beat 4); the logo lands on bar 23 beat 1, not bar 22; the dashboard's chart is drawn in ink, not by the line; the quill withdraws while the phone and dashboard arrive; the hook and proof scenes carry "status — on paper" and "status — shipped, in weeks" notes; proof scene headline is one line in 16:9.
- `planning/production-plan.md`: component file names differ (`Surface.tsx`, `Type.tsx`, `Artefacts.tsx`, `TitleBlock.tsx`; no `Plate.tsx`, `Stage.tsx` or `animations/reveal.ts`). The optional-plate manifest was not built. `review-log.md` does not exist yet.
- `research/production-research.md`: lists `@remotion/noise` and `@remotion/layout-utils` as used; they are not. Says FFmpeg `ebur128` verified loudness; the bundled FFmpeg lacks that filter, so loudness is computed in `scripts/qa/audio-check.mjs`.
