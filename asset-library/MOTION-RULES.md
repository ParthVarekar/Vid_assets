# Motion graphics rules — programmatic brand films

The rules used to make ProtoVinci "Off the Page", written so any person or any LLM can make another film like it. Nothing here depends on a particular model. Every rule is either a number, a check you can run, or a decision you can verify in a rendered still.

Stack: Remotion (React + SVG) for picture, a Node script for sound, FFmpeg for encodes. The rules transfer to After Effects or any other code-driven tool.

---

## 0. The workflow (do it in this order)

1. **Research the brand from its own sources.** Collect logo, fonts, colours, copy and real work. Write down every claim and its source. Invent nothing: no clients, metrics or testimonials.
2. **Find one device the brand already owns** (here: a quill and the line it draws). The device carries the film between scenes, so there are no hard cuts.
3. **Lock the copy before animating.** Count the words; target 40 or fewer headline words per 60 seconds.
4. **Write the clock first** (`timeline.ts`): tempo, beat, bar, scene ranges, and an event table per scene. Picture and sound both read it.
5. **Build one scene, render 5–6 stills, look at them, fix, then move on.** Never write all the scenes blind.
6. **Render a contact sheet of the whole film** (one frame per beat or per two beats) and review it like a stranger would.
7. **Render, probe, encode, deliver.**

An LLM that cannot watch video can still do all of this: it reads stills and contact sheets, and it measures audio instead of listening to it.

---

## 1. Time

| Rule | Value |
| --- | --- |
| Frame rate | 30 fps |
| Tempo | 100 BPM, so 1 beat = **18 frames** and 1 bar = **72 frames** (integers, which is why 100 BPM was chosen) |
| Event placement | Every event is written as `at(bar, beat, +frames)`, never as raw seconds |
| Film length | 25 bars = 1,800 frames = 60.0 s; cutdown 6¼ bars = 450 frames = 15 s |
| Scene length | 2–7 bars. The opening scene holds longest; the proof beat is the shortest |
| Motion and sound | Motion **starts 1 frame before** its sound hit, so it peaks on the hit |
| Silence | One beat of near-silence before each major reveal (the snap, the logo landing) |

Pick a BPM where `60 × fps / BPM` is a whole number: 100, 120, 90 (at 30 fps) or 100, 120, 150 (at 25/50 fps).

---

## 2. Easing

| Name | Bézier | Use |
| --- | --- | --- |
| out | `0.16, 1, 0.3, 1` | Every arrival. Fast in, long settle |
| soft | `0.33, 1, 0.68, 1` | Large objects arriving |
| inOut | `0.65, 0, 0.35, 1` | Camera moves, travel along the line |
| pen | `0.45, 0, 0.2, 1` | Drawing strokes |
| in | `0.6, 0, 0.9, 0.3` | Departures |

- **No bounce or overshoot on type, ever.** Overshoot is allowed only on small UI presses (≤5% scale).
- Durations: type rises in 12–18 frames, UI parts lock in 9–12, camera moves take 24, a stroke takes as long as its beat.
- **Nothing is ever fully still.** Every hold carries a slow drift (10–15 px over the scene). Drift is lateral only, so the line's height at the frame edge never changes.

---

## 3. Typography

| Rule | Value |
| --- | --- |
| Families | One sans (Switzer) in two weights (500, 600) + one mono for labels. Never a third |
| Tracking | Display −0.045em, titles −0.035em, body −0.015em, mono +0.04em (+0.14em when uppercase) |
| Sizes (1080p short side) | Statement 150 px, section word 124 px, lead 40 px, mono 21 px. Scale everything by `min(w,h)/1080` |
| Entrance | Each line **rises through a mask** (translateY 118% → 0, ease-out, 17 frames), lines staggered 5–18 frames |
| Exit | The same mask, upward. **Only something that has arrived can leave**: guard exits so an element whose exit time passes before its entrance never shows at rest |
| Words per card | 7 or fewer. One idea per beat |
| Reading time | A headline is complete and still for **≥ 2.3 s (70 frames)**; single words for ≥ 1 s |
| Effects | No outlines, glows, gradients on type, typewriter effects or per-letter bounce |
| Labels | Notebook figures: `fig. 02 — web app`, with a short leader line drawn before the text |

---

## 4. Colour

- Take every colour from the brand's own assets. Add **at most one** new colour, and only with a reason (here: sanguine red chalk, the medium of da Vinci's notebooks).
- The accent colour belongs to **one thing only** (the line and its two underlines). If it appears on a button or a fill, it stops meaning anything.
- Two worlds: warm paper (start, proof, end) and ink night (Automate, Scale). Going dark mid-film gives the middle its own identity; returning to paper feels like arrival.
- The persistent brand header uses `mix-blend-mode: difference` in white, so one element reads on both paper and night, even while a scene change sweeps past.

| Token | Hex | Role |
| --- | --- | --- |
| paper | #EEEBE4 | ground |
| paperBright | #F7F5F0 | lit ground after the snap |
| taupe / taupeLight | #A69A8A / #DFD8CE | construction lines |
| ink | #09090B | type, mark |
| graphite | #6B7280 | labels |
| night / nightCard | #09090B / #141417 | dark ground, dark surfaces |
| sanguine / sanguineBright | #C4472F / #E8583C | the line (on paper / on dark) |

---

## 5. Layout and formats

- **Design every format natively; never crop.** One layout function returns, per format: margins, text box, stage box, line height (`threadY`) and type sizes.
- Scene artwork is drawn once in a **virtual stage (1000 × 640)** and scaled into each format's stage box.
- 16:9: text left, stage right. 9:16 and 1:1: text stacked above the stage, lines broken more often.
- 9:16 safe areas: keep text and logo out of the **top 14% and bottom 20%**.
- The line enters each scene at mid-left and leaves at mid-right at `threadY`. That shared height is what makes scene changes seamless. If a scene must leave another way (the Scale climb exits through the top-right corner), the next scene must enter at the **same slope** from the opposite corner. Compute that slope once, in shared code.

---

## 6. Transitions

- **No hard cuts.** Scene changes are camera pushes of 24 frames centred on the bar line, eased inOut, in the direction of the line's travel.
- During a push, apply a directional blur proportional to speed (`speed × width × 0.13`, horizontal only for lateral moves).
- Give each scene a **ground colour that bleeds 64 px past the frame**, so blurred edges never reveal what is behind them.
- Round push translations to **whole pixels**, or a hairline seam appears between scenes.
- Mount each scene 12 frames early so it is already moving when the camera arrives.

---

## 7. The throughline device (the line)

- It must be **something the brand owns** (a mark, a symbol, a stroke from the logo) and it must **become the subject of every scene**: an underline, a window outline, a workflow path, a growth curve, the logo itself. If it is only decoration in a scene, cut it from that scene.
- Two states: hand-drawn (seeded noise wobble 3–4 px, chalk texture filter) while it is an idea; exact (no wobble, rounded corners) once engineered. Switch on **one downbeat**, changing line, background brightness, type and sound together. That moment is the film's single dramatic beat.
- The pen (quill) rides the tip: positioned with `getPointAtLength`, leaning a few degrees into the direction of travel, lifting and bobbing slightly when idle.
- End by turning the line into the logo (the line writes the logo's cradle stroke; the quill docks into it). The reveal then explains the whole film.

---

## 8. Brand presence

- Brand cue from **frame 0** (header with mark and name) and present throughout. Research: three or more brand moments almost doubles correct brand recall, and there is no penalty for "over-branding".
- The proposition is readable **muted within 3 seconds**. The film must work silent.
- Full logo by about 85% of the runtime, then the call to action (specific, visible for at least 3 seconds), URL in a pill, tagline in mono.
- Real proof beats abstract claims: show real shipped work with the brand's own stated timelines. No invented numbers.

---

## 9. Sound

- Write the score **from the same timeline file** as the picture, so sync is exact by construction.
- A small sound vocabulary, reused: draw (chalk scratch), lock (tuned tick), arrive (ping), move (whoosh), hit (impact), land (impact + shimmer + the fullest chord). Tune every tonal effect to the score's key.
- Dynamic arc: near-silent opening → pulse at the snap → drier and busier for automation → stacking layers for scale → drop for proof → gap → biggest hit at the logo → long tail.
- Low end only on 2–3 hero beats. Duck music under kicks.
- Master: **−14 LUFS integrated, true peak ≤ −1 dBTP**, 48 kHz.
- If you cannot listen, measure: per-bar loudness (does it follow the arc?), spectral balance (is anything above 1 kHz?), true peak. Then ask a person to listen anyway.

---

## 10. Remotion engineering rules (each one was a real bug)

1. Drive everything from `useCurrentFrame()` and `interpolate()`. CSS transitions and keyframes do not render.
2. **No `Math.random()`.** Frames render in parallel and out of order; use a seeded generator.
3. Textures as tiled `<Img>` elements, not CSS `background-image`: Remotion waits for `<Img>` to load before capturing a frame.
4. Pre-render noise and paper textures to PNG. Live `feTurbulence` on every frame is slow.
5. SVG filters: set `color-interpolation-filters="sRGB"`. The default linearRGB bands dark gradients while blurring.
6. Path libraries can return `null` exactly at the end of a path; sample at `length − 0.02`.
7. Memoise path construction on its inputs. Building paths every frame is the main render-time cost.
8. Dash-based stroke reveals use `pathLength={1}` and `strokeDasharray="p 2"`. Do not combine a dash reveal with `vectorEffect="non-scaling-stroke"`; reveal those with a clip instead.
9. Pass render props as a JSON **file** (`--props=props.json`); inline JSON breaks under Windows shell quoting.
10. Never redraw a logo by hand. Trace the official file (Potrace at 4× with a threshold that excludes drop shadows), overlay the trace on the source, and accept ≤ 6% pixel mismatch.

---

## 11. Quality checks (run all before delivery)

| Check | How | Pass |
| --- | --- | --- |
| Rhythm and consistency | Contact sheet, one frame per beat | Every frame has one clear focal point; no two adjacent frames look alike for more than a bar |
| Joins | Stills at each push midpoint | Line continuous, no seams, no blank edges |
| Reading time | Count frames from headline settle to exit | ≥ 70 frames |
| Collisions | Stills at every scene's busiest beat | Pen, labels and UI never overlap text |
| Formats | Contact sheet per format | Nothing off-frame; 9:16 safe areas respected |
| Logo | Overlay on source | ≤ 6% mismatch |
| Audio | Loudness script | −14 ± 0.5 LUFS, TP ≤ −1 dBTP, per-bar arc as designed |
| Files | `ffprobe` | Correct resolution, 30 fps, exact duration, H.264 + AAC |
| Delivery size | File list | Web encodes < 100 MB (GitHub limit); grain makes CRF 16 masters 130–230 MB |

Review as a creative director who did not make it: is the hook readable muted in 3 s? Is the brand there in every frame? Does any scene look like a template? Would a buyer understand what the agency does?

---

## 12. Prompt for any LLM starting a new film from this kit

> You are making a 60 s programmatic brand film in Remotion. Read `MOTION-RULES.md` and follow it exactly. First write `timeline.ts` (100 BPM, 30 fps, 18-frame beats) with one event table per scene. Reuse the components in `asset-library/code/`. Build one scene at a time; after each, render stills at its key beats with `npx remotion render <id> out --frames=a,b,c` and inspect them before continuing. Finish with a contact sheet of the whole film, fix every issue in section 11, then render all formats.
