# ProtoVinci asset library

Reusable images, vectors and code from "Off the Page". No video or audio: those live in `../renders` and `../public/assets/audio`.

Rebuild everything from source with:

```bash
node --no-warnings scripts/assets/build-library.mjs              # from the project root
node --no-warnings scripts/assets/build-library.mjs --no-render  # skip the Remotion stills
```

**Start with [`MOTION-RULES.md`](MOTION-RULES.md)**, the rules sheet for making films like this with any LLM.

## Contents

| Folder | What | Notes |
| --- | --- | --- |
| `brand/logo/svg/` | Mark, quill-only, cradle-only in ink / white / sanguine / paper; two-tone mark; circle badges | Traced from the official avatar. Quill and cradle are separate so they can animate apart |
| `brand/logo/png/` | Mark at 2048 and 512 px; badges at 1024 → 32 px (app icons, favicons) | Transparent |
| `brand/logo/logo-geometry.json` | Nib tip, cradle centreline and thickness | For write-on and docking animations |
| `brand/lockups/` | Stacked and horizontal lockups, ink / white / sanguine, with and without tagline | Transparent PNG |
| `brand/tokens/` | `colors.json`, `tokens.css` (colours, tracking, easing, beat timing, @font-face) | |
| `brand/palette.png` | Palette swatch sheet | |
| `fonts/` | Switzer Medium, Semibold, Bold (woff2) | Switzer is free under the Fontshare licence (Indian Type Foundry). Geist Mono loads from Google Fonts |
| `textures/` | Grain tile (512) and paper mottle (1024) | Seamless |
| `graphics/` | Construction geometry (3 paper, 1 night), chalk and engineered underlines, line paths (step-up, climb), dot grid, figure label | SVG + PNG |
| `icons/` | 18 line icons, `sprite.svg`, `Icons.tsx`, preview | 18-unit grid, 1.6 stroke, `currentColor` |
| `social/` | OG 1200×630, YouTube thumbnail, Instagram portrait and square, story, LinkedIn banner, X header, dark wide card | Rendered from `code/compositions/Stills.tsx`; change copy via props |
| `frames/16x9`, `9x16`, `1x1` | One key frame per scene in each format | Posters, thumbnails, presentation stills |
| `frames/logo-sting/` | Storyboard of the logo sting | Animation is `code/compositions/LogoSting.tsx` |
| `code/` | The whole animation system: line, quill and logo reveal, type, surfaces, header, UI artefacts, layout, easing, timeline, scenes, compositions, tools | Copy into any Remotion 4 project. Needs `@remotion/paths`, `@remotion/media`, `@remotion/fonts`, `@remotion/google-fonts` |
| `reference/` | Official brand sources, logo trace checks, portfolio screens | Portfolio screens belong to ProtoVinci's clients. Check clearance before using them in ads |

## Most reusable pieces

- **Logo animation:** `code/components/Quill.tsx` (`Quill`, `Cradle`, `LogoMark`, `markGeometry`) plus `code/scenes/Reveal.tsx`. In this project, render it with `npx remotion render LogoSting-16x9 sting.mp4` (also `-9x16` and `-1x1`).
- **The drawn line:** `code/components/Thread.tsx` + `code/utilities/path.ts` (hand wobble, chalk filter, a pen riding the tip).
- **Masked type reveals:** `code/components/Type.tsx` (`Rise`, `Headline`, `Mono`, `Fig`).
- **New still in any size:** add a `<Still>` using `Card` in `src/Root.tsx`, then `npx remotion still Card-<id> out.png`.
