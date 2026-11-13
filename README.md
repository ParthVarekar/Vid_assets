# ProtoVinci — "Off the Page"

A 60-second brand film for [ProtoVinci](https://protovinci.vercel.app/), built entirely as code: Remotion (React/SVG) for picture, a Node synthesiser for the original score. One red-chalk line, drawn by the brand's quill, leaves the notebook page and becomes working software: **Build. Automate. Scale.**

## Deliverables (`renders/`)

| File | Format |
| --- | --- |
| `protovinci-off-the-page-16x9.mp4` | Master, 1920×1080, 60 s |
| `protovinci-off-the-page-9x16.mp4` | Vertical, 1080×1920, 60 s |
| `protovinci-off-the-page-1x1.mp4` | Square, 1080×1080, 60 s |
| `protovinci-cutdown-15s-16x9.mp4` / `-9x16.mp4` | 15 s cutdowns |

These are web encodes (H.264, AAC, fast-start). The higher-quality CRF 16 masters (130–230 MB each) are not in git; `npm run render` regenerates them into `renders/masters/`.

Audio: original, synthesised, no third-party material. Measured −14.0 LUFS, true peak ≈ −1 dBTP.

## Run it

```bash
npm install
npm run dev          # Remotion Studio
npm run render       # all five deliverables
npm run audio        # re-render the score from src/timeline.ts
npm run audio:check  # loudness / spectrogram report
npm run assets       # re-trace the logo, rebuild textures
```

Needs Node 24+ and FFmpeg on PATH (for the web encodes only).

## Structure

- `src/timeline.ts` is the single clock (100 BPM, 18 frames a beat). Picture and score both read it, so they stay in sync.
- `src/scenes/` six scenes; `src/compositions/` master and cutdown; `src/components/` line, quill, type, artefacts; `src/utilities/layout.ts` per-format layouts (9:16 and 1:1 are laid out natively, not cropped).
- `scripts/audio/` score synthesis; `scripts/qa/` contact sheets and audio analysis; `scripts/higgsfield/` optional generation script.
- `research/`, `planning/` brand, creative and production research, strategy, storyboard, plan, and `planning/handoff.md` (status and known gaps).
- `public/assets/` brand assets, Switzer fonts (from the brand's site), score WAVs.

## Known limits

- **Higgsfield was not used for media.** The account had 0 credits, so no generated plates, music or voice exist. `scripts/higgsfield/generate-plates.ps1` is validated against cost estimates but never run.
- **The score was verified by measurement only.** Its author cannot listen. A person should audition it before publishing.
- **The Proof scene shows real client project screens** from ProtoVinci's own public portfolio. Confirm clearance for advertising use, or set `showWork` to `false`.
- The logo is traced from the 400 px avatar, the largest published file. A vector original from the agency would be sharper.
- Planning docs describe the original design; `planning/handoff.md` lists where the build diverged.
