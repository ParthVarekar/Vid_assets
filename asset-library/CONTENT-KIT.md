# Content kit — videos, ads and social

Everything an agency reuses week to week, in ProtoVinci's own visual system. All copy comes from the brand's website and profiles (`src/kit/content.ts`): edit that file and re-render, and every template updates.

Rebuild:

```bash
node --no-warnings scripts/assets/build-kit.mjs            # all stills (one Remotion bundle, ~10 min)
node --no-warnings scripts/assets/build-kit.mjs --vectors  # device frames + annotations only
node --no-warnings scripts/three/export-glb.mjs            # 3D models
node --no-warnings scripts/three/render-previews.mjs       # 3D previews
```

## 1. Video kit — `src/kit/VideoKit.tsx`

Drop-in animated pieces. Each plays from its own frame 0; put it in a `<Sequence from={…}>`. All work in 16:9, 9:16 and 1:1, on paper or night.

| Component | What it does | Typical length |
| --- | --- | --- |
| `TitleCard` | Section opener: index, big word, mono subtitle, the line and quill drawing in | 60–90 frames |
| `LowerThird` | Name and role rising through a mask, red line drawing underneath | 120–180 |
| `Captions` + `evenWords()` | Word-timed subtitles on a plate, current word underlined in red. Pass real word timings when you have them | whole video |
| `LineWipe` | Transition: a red line sweeps across and pulls in the next ground (paper ↔ night) | 24 |
| `Callout` | Icon chip with leader line, pops in beside a point of interest | 60–120 |
| `ScreenFrame` | Puts a screenshot or screen recording into a browser frame, optional 3D tilt | any |
| `EndCard` | Lockup + call to action + URL pill | 90–120 |
| `LogoBug` | Small corner mark for the whole video | whole video |
| `Icon` | Any of the 18 line icons | — |

Demo of all of them together: compositions `KitDemo` (16:9) and `KitDemo-Vertical`. Stills in `video-kit/previews/`. The captions sit in a low band and the lower third above it, so both can be on screen together.

Also available from earlier: `LogoSting-16x9 / 9x16 / 1x1` (6 s logo animation) and the `Turntable` compositions for 3D models.

## 2. Social templates — `social-templates/`

Rendered from real content, in three formats: `portrait/` (1080×1350 feed), `square/` (1080×1080) and `story/` (1080×1920, with platform safe areas).

| Template | Count | Content |
| --- | --- | --- |
| `service-01…10` | 10 | Each service from the site: icon, title, description, what's included. Automate services on night |
| `case-01…07` | 7 | Each shipped project: real screen, type, delivery time, description |
| `process-01…04` | 4 | Understand → Shape → Create → Elevate, with a progress bar |
| `quote-01…05` | 5 | The brand's own lines, last word underlined in red |
| `testimonial-01…06` | 6 | Client quotes as published on the site, with name and role |
| `stat-01…03` | 3 | Figures from the projects page: 07 shipped, 3 wks average, 7/7 live |
| `carousel-01…05` | 5 | "What we do" carousel: cover, Build, Automate, Create, CTA |
| `promise-01` | 1 | Working terms: 2–6 weeks, revisions, direct access, support |
| `announcement-01` | 1 | "Now booking" template; change the props for any announcement |
| `highlights/` | 6 | Story highlight covers (code, AI, design, done, dashboard, contact) |
| `profile/` | 2 | Profile pictures, paper and ink |

To make a new post: add a `<Still>` in `src/kit/KitCompositions.tsx` with your props, then render it with `npx remotion still <id> out.jpg`.

**Before paid use:** the testimonials and case-study screens belong to clients. They are public on ProtoVinci's site, but confirm consent for advertising.

## 3. Backgrounds — `backgrounds/`

Paper and night, each as `plain`, `geometry` (construction lines) and `line` (geometry + the red line), at 16:9, 9:16, 1:1, 4:5 and 4K. Use them behind talking-head footage, slides or text posts.

## 4. Graphics

| Folder | Contents |
| --- | --- |
| `graphics/devices/` | Browser, phone, laptop and tablet frames with **transparent screens** (SVG + PNG). Place a screenshot behind the frame; `screens.json` gives the exact screen rectangle for each |
| `graphics/annotations/` | Chalk-red hand-drawn marks: circle, box, two arrows, double underline, highlight swipe, check, cross, bracket, star (SVG + PNG) |
| `graphics/` (root) | Construction geometry, underlines, the line's signature paths, dot grid, figure label |
| `icons/` | 18 line icons, sprite, React component |

## 5. 3D — `3d/`

45 code-built models. See `3d/README.md`.

- **Brand:** logo, two-tone logo, quill, cradle tube, logo on plinth.
- **The line:** climb, step, helix.
- **Devices:** browser, phone, laptop, monitor, tablet.
- **Objects:** chat bubble, cursor, database, cloud, terminal, check badge, notification, toggle, bar chart, workflow node, scale unit and field, paper sheet, construction set.
- **3D icons:** all 18 line icons as tubes on paper tiles.

## 6. Mascot and set

**Nib**, ProtoVinci's mascot (a fountain-pen nib come to life, with a quill-feather plume and red-line limbs), and **the Studio**, a build-in-public workshop in Mumbai, make a ready-to-puppeteer show: write a short keyframe script and Nib acts it out, with blinking, breathing, walking, talking, waving and hopping added automatically.

- Guide: `mascot/PUPPET-GUIDE.md`. Sheets: `mascot/expressions.jpg`, `gestures.jpg`, `outfits.jpg`. Set: `scenes/studio-*.jpg`.
- Compositions: retired with the 2D mascot (Nib and the flat Studio set). The 3D birds replace them: see `docs/ANIMATOR-GUIDE.md` and the `Episode-*` and `DeskPreview` compositions.
- Code: `mascot/code/` (`rig.ts` pose model, `Mascot.tsx` drawing, `Actor.tsx` scripts and camera, `Studio.tsx` set).
- The set and Nib share the brand palette; captions, callouts and the end card from the video kit work on top of them.
