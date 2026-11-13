# Production plan — "Off the Page"

## Pipeline at a glance

```
brand assets ──► scripts/assets  ──► public/assets/brand (vector logo, grain tile)
timeline     ──► src/timeline.ts ──► picture (Remotion scenes)
                       │
                       └────────► scripts/audio (synth) ──► public/assets/audio/*.wav
picture + audio ──► npx remotion render ──► renders/*.mp4
renders ──► scripts/qa ──► stills, contact sheets, loudness report
```

One timeline drives both picture and sound. The score is generated from the same bar grid the scenes use, so nothing has to be synced by hand and a timing change in one place moves both.

## Decisions forced by the Higgsfield blocker

The account has no credits, so no plates, music or voice could be generated (details in `research/production-research.md`). The plan adapts as follows.

| Planned with Higgsfield | Done instead | Path back |
| --- | --- | --- |
| Macro plate of a nib on paper for the hook | Procedural paper, grain, geometry, and the vector quill | `scripts/higgsfield/generate-plates.ps1`, then list the file in `public/assets/generated/manifest.json` |
| Dark environment plate for Automate | Flat ink ground with a dot grid | Same |
| Score from ElevenLabs Music | Synthesised score from the bar grid | Same script has the music prompt; drop the file in and point `music` in the manifest at it |
| Narration | None by design | TTS command included in the script if a voiced version is ever wanted |

## Asset preparation (`scripts/assets/`)

1. **Logo.** No vector logo is published. `trace-logo.mjs` thresholds the official 400×400 avatar and traces it to an SVG path with Potrace, then writes `public/assets/brand/logo-mark.svg` and a TypeScript module with the path data. The trace is compared against the source at 400px before use. The mark is never redrawn by hand.
2. **Grain.** `make-grain.mjs` writes a tileable monochrome noise PNG used as an overlay, which is far cheaper to render than a live SVG turbulence filter.
3. **Fonts.** Switzer Medium, Semibold and Bold are the files the brand's own site serves. Geist Mono comes from Google Fonts.
4. **Project screens.** The seven portfolio images from the brand's site, unmodified.

## Remotion implementation (`src/`)

```
src/
  index.ts                 registerRoot
  Root.tsx                 composition registry (5 compositions)
  timeline.ts              BPM, bar/beat helpers, scene ranges
  theme.ts                 colours, type, easing
  fonts.ts                 font loading
  compositions/
    Film.tsx               master timeline: scenes, pushes, header, grain, audio
    Cutdown.tsx            15-second edit built from the same scenes
  scenes/
    Hook.tsx  SketchBuild.tsx  Automate.tsx  Scale.tsx  Proof.tsx  Reveal.tsx
  components/
    Thread.tsx  Quill.tsx  Headline.tsx  FigLabel.tsx  NotebookHeader.tsx
    Paper.tsx  Grain.tsx  Stage.tsx  BrowserWindow.tsx  Phone.tsx  Dashboard.tsx
    FlowNode.tsx  LogoMark.tsx  Plate.tsx
  animations/
    ease.ts                clamp-interpolate helpers, standard curves
    reveal.ts              masked rise, stagger
  utilities/
    layout.ts              format-aware layout (wide, tall, square)
    path.ts                polyline to path, corner rounding, hand wobble
    rng.ts                 seeded random
```

**Format handling.** `useLayout()` reads the composition size and returns a text block rectangle, a stage rectangle and a unit scale. Each scene draws its stage in a fixed virtual coordinate space that is scaled to fit, and positions text from the layout. The vertical and square versions are therefore real layouts, not crops.

**The line.** `Thread` takes a list of points in frame coordinates plus a wobble amount and a progress value. It builds the path, rounds corners, applies seeded noise displacement when wobble is above zero, and reveals it by stroke-dash offset. The quill is placed at the path's current end with `getPointAtLength`. Setting wobble to zero is the snap.

**Camera.** Scene changes are lateral pushes of 20 frames centred on the bar line, eased, with a horizontal-only blur during the move. Because the line leaves each scene at mid-right and enters the next at mid-left, it reads as unbroken.

**Holds.** Every scene wraps its content in a slow drift so no hold is a frozen frame.

**Optional plates.** `Plate` reads `public/assets/generated/manifest.json`. With no entries it renders nothing.

## Audio production (`scripts/audio/`)

A small offline synthesis engine in Node, 48 kHz stereo, written for this film.

- **Sources:** band-limited oscillators, noise, a plucked-string model, FM bell tones.
- **Shaping:** ADSR envelopes, time-varying filters, stereo placement.
- **Space:** one short room for cohesion, one longer reverb for hero moments, tempo-synced delay.
- **Score:** written as data against the bar grid — chords, bass, plucked figure, pad, drums per section.
- **Effects:** chalk scratch following the line's drawing windows, ticks on component locks, pings on node arrivals, whooshes on pushes, the snap impact, the landing hit.
- **Master:** high-pass, gentle bus compression, look-ahead limiter. Target −14 LUFS integrated, true peak at or below −1 dBTP, verified with FFmpeg `ebur128`.

Outputs: `score-master.wav` (60s), `score-cutdown.wav` (15s), and stems for music and effects.

## Rendering

| Composition | Size | Frames | Output |
| --- | --- | --- | --- |
| `Master-16x9` | 1920×1080 | 1,800 | `renders/protovinci-off-the-page-16x9.mp4` |
| `Master-9x16` | 1080×1920 | 1,800 | `renders/protovinci-off-the-page-9x16.mp4` |
| `Master-1x1` | 1080×1080 | 1,800 | `renders/protovinci-off-the-page-1x1.mp4` |
| `Cutdown-16x9` | 1920×1080 | 450 | `renders/protovinci-cutdown-15s-16x9.mp4` |
| `Cutdown-9x16` | 1080×1920 | 450 | `renders/protovinci-cutdown-15s-9x16.mp4` |

H.264, CRF 16, yuv420p, AAC 320 kbps. `npm run render:all` renders everything.

## Quality assurance

1. **Stills while building.** Each scene is checked at its key beats with `remotion render --frames` before moving on.
2. **Contact sheets.** After a full render, one frame per beat is tiled into contact sheets and read as a whole for rhythm and consistency.
3. **Checks by measurement.**
   - Reading time: every headline is fully visible and settled for at least 2.3 seconds.
   - Sync: picture events sit on the beat grid by construction; spot-checked in stills.
   - Safe areas: text stays inside the margins in all three formats.
   - Logo: traced mark overlaid on the source avatar.
   - Audio: integrated loudness, true peak, spectrogram and waveform review.
4. **Creative review.** The full contact sheet is reviewed as if by a director who did not make it; weaknesses are listed, fixed and re-rendered. The review log is kept in `planning/review-log.md`.
5. **File checks.** Duration, resolution, frame rate, codec and audio stream confirmed with FFprobe for every deliverable.

## Risks

| Risk | Mitigation |
| --- | --- |
| The score cannot be auditioned by its author | Conservative harmony and levels; measurement and spectrogram review; clearly flagged for a human listen; stems and a one-flag mute provided |
| Client screens in the proof scene need clearance | Single prop switches to abstract cards |
| Vertical layout crowding | Dedicated layout rules and stills checked per format |
| Render time | Pre-rendered grain; no live turbulence filters; blur only during pushes |
