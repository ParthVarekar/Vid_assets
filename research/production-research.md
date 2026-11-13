# Production research — tools, capabilities and constraints

Researched 13 November 2026 against the tools actually present in this environment.

## Summary

- **Remotion** is the composition and render engine for the whole film. It works fully.
- **Higgsfield** is installed and authenticated, but the account has **0 credits on the free plan**, and every generation request is refused with `not_enough_credits`. No image, video, music or voice could be generated. This is the one hard blocker in the project.
- The film was therefore produced as programmatic motion design with an original synthesised score. A ready-to-run Higgsfield script and an optional-plate slot in the composition are provided so generated material can be added once the account is funded.

## Remotion

**Installed:** Remotion 4.0.543, React 19.3.1, Node 24.15, Chrome Headless Shell 158 (downloaded by Remotion on first use).

**Sources read:** remotion.dev/docs (project creation), /docs/ai/skills (agent skills list), and the installed `remotion-best-practices`, `remotion-markup` and `remotion-render` skills. `remotion.dev/docs/install` returns 404; the same content lives at `/docs`.

**Rules that shape the code**

- All animation is driven by `useCurrentFrame()` and `interpolate()`. CSS transitions and keyframe animations do not render and are not used.
- Assets live in `public/` and are referenced with `staticFile()`.
- Audio and video use `<Audio>` / `<Video>` from `@remotion/media`.
- Packages are added with `npx remotion add` so versions stay aligned.

**Packages used**

| Package | Use |
| --- | --- |
| `remotion`, `@remotion/cli` | Core and renderer |
| `@remotion/paths` | Path length, draw-on, point-at-length for the line and the quill |
| `@remotion/media` | Audio track |
| `@remotion/fonts` | Loading the brand's Switzer files |
| `@remotion/google-fonts` | Geist Mono |
| `@remotion/noise`, `@remotion/layout-utils` | Hand-drawn wobble, text fitting |

**Rendering**

- `npx remotion render <id> <out>` for video; `--frames=a,b,c --image-format=png` for review stills; `--scale` to render above 1080p from the same vector source.
- Bundled FFmpeg (`npx remotion ffmpeg`) is used for loudness measurement, spectrograms and contact sheets.

**Limits**

- Rendering is CPU-bound headless Chrome; heavy SVG filters and blur cost render time, so grain is a pre-rendered tile rather than a live filter.
- Remotion is free for teams of up to three; larger companies need a licence (remotion.dev/docs/license).

## Higgsfield

### What is exposed here

**Connector (MCP) in this session — read-only.** Seven tools: `balance`, `list_workspaces`, `workspace_select`, `models_list`, `models_get`, `show_generations`, `import-claude-motion-from-url`. The connector's own description states it cannot generate media, upload files or make purchases. The help-centre page (higgsfield.ai/enterprise-help-center/platform/integrations) describes a fuller MCP surface with generation; that is not what this session's connector offers.

**CLI 1.2.2 — the generation path.** Commands: `generate create | cost | get | list | wait | workflow`, `model`, `upload`, `voices`, `preset`, `project`, `workflow`, `marketing-studio`, `product-photoshoot`, `soul-id`, `website`, `account`, `workspace`. Media flags accept an upload id or a local path, which the CLI uploads automatically; that is how a reference file reaches Higgsfield.

**Skills installed:** nine `higgsfield-*` skills. Only `higgsfield-generate` is relevant to this film.

### Model catalogue (from `models_list`, relevant entries)

| Task | Models available | Notes |
| --- | --- | --- |
| Stills | Nano Banana Pro / 2 / 2.1, GPT Image 2, FLUX.2, Seedream 4.5, Cinema Studio Image 2.5, Z Image | Up to 4K; image references supported on most |
| Video | Seedance 2.5 / 2.0, Cinema Studio Video 3.0, FLUX 3 Video, MiniMax H3, Wan 2.6, Grok Video 1.5 | 4–30s, start and end frames, image/video/audio references, up to 4K |
| Video utilities | FLUX 3 Video Edit, Video Background Remover, FLUX.2 Outpaint, Sync Lipsync | Edit, matte, expand |
| Music | ElevenLabs Music v2 / v2.5 | 3–600s, instrumental option |
| Voice | Eleven v4, Text to Speech V2, Seed Audio, Qwen TTS | Preset or cloned voices |

### Measured costs and the blocker

| Check | Result |
| --- | --- |
| `higgsfield account status` | free plan, 0 credits, no transactions |
| `generate cost z_image` | 0.15 credits |
| `generate cost nano_banana_2` | 2 credits |
| `generate cost seedance_2_5` (default 5s, 720p) | 35 credits |
| `generate create z_image …` | `{"error_type":"not_enough_credits","plan_type":"free"}` |
| `generate create nano_banana_2 …` | same error |

One side effect of testing: the private workspace was selected as the active workspace (`higgsfield workspace set`), which the CLI requires before any cost or generation call.

Adding credits or a subscription is a purchase and is the account owner's decision; I did not attempt it.

### Intended division of work, and what was actually possible

| Layer | Intended | Actual |
| --- | --- | --- |
| Typography, line work, UI, layout, timing, transitions | Remotion | Remotion |
| Macro plates: quill nib on paper, paper texture, a dark "engine room" environment | Higgsfield stills → image-to-video | Not generated. Procedural paper, grain and geometry in Remotion |
| Score | ElevenLabs Music via Higgsfield, cut to the bar grid | Original score synthesised in code (`scripts/audio/`) |
| Narration | Evaluated; a typographic film does not need it | None, by design |
| Upscale, matte, reframe | Higgsfield utilities | Not needed: vector source renders at any size and each format is laid out natively |

`scripts/higgsfield/generate-plates.ps1` contains the prompts and commands for the plates and an alternative score. The composition reads `public/assets/generated/manifest.json`; any plate listed there is composited automatically, and with an empty manifest the film renders exactly as delivered.

## Audio

No licensed music or third-party recordings are used. The score and every sound effect are synthesised by a Node script from the same bar grid the picture uses, so sync is exact by construction. Loudness and true peak are measured with FFmpeg's `ebur128` filter. **I cannot listen to audio**, so the mix was checked by measurement and by reading spectrograms, not by ear. It should be auditioned by a person before publication.

## Other environment constraints met during production

- Subagents and the built-in web search were unavailable: both are routed to a model that does not exist in this environment. Research was done directly.
- The web search service rate-limited after four queries; remaining research used a browser.
- The browser pane was hidden, so video playback and screenshots of reference films were not possible.
