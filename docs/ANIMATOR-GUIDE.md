# Animator guide

How to animate Quill, Ink and Chalk, by hand in Puppet Studio or as code, and render the result. For what each control does, see [RIG-REFERENCE.md](RIG-REFERENCE.md). For who the birds are and how each one moves, see [CHARACTER-BIBLE.md](CHARACTER-BIBLE.md).

## The pieces

| Piece | Where | What it is |
| --- | --- | --- |
| Birds | `src/world3d/characters/` | Three furry, rigged 3D characters built in code from a config each |
| Rig | `src/world3d/rig/schema.ts` | Every control as a numbered channel, shared by all birds |
| Clips | `content/episodes/*.anim.json` | Your animation: plain JSON, one file per scene |
| Poses | `content/poses/*.json` | Saved expressions and gestures you can apply as keys |
| The Desk | `src/world3d/set/` | The miniature desk diorama they live in, with three times of day |
| Puppet Studio | `editor/` | The browser editor for clips |
| Remotion | `src/world3d/Episode.tsx` | Renders any clip to video; the editor shows the same scene |

A frame is a pure function of the clip and the frame number: the same clip renders the same picture anywhere, in any order.

## Quick start

```bash
npm run editor        # then open http://localhost:5174
```

1. **Open** a clip from the top bar (try `rig-demo` or `ep01-off-the-page`), or press **New**.
2. Pick a bird: click it in the view, or press **1** (Quill), **2** (Ink), **3** (Chalk), **0** (camera).
3. Drag a slider in the left panel. With **auto-key** on (the default) that sets a key at the playhead. The diamond next to each slider is yellow when a key is on this frame.
4. Move the playhead (click or drag the ruler, or **←/→**) and change something else. The editor interpolates between keys.
5. **Space** plays. **Ctrl+S** saves into `content/episodes/<name>.anim.json`.

Press **?** at any time for the shortcut list.

## The editor

**View.** Drag the handles on the selected bird: **W** move, **E** turn, **R** an eye target the eyes follow, **Q** hides them. Click *Free cam* (or **C**) to orbit and compose; *Key camera from view* then keys that view on the camera track. *Shot cam* shows what the clip's camera sees. The **16:9 / 9:16** toggle shows the vertical camera. *Preview fur* is fast for posing; *Final fur* is what renders.

**Sliders.** One per channel, grouped by body part. Hover for what a control does; double-click to reset it; the search box filters by name or description. With auto-key off, edits stay pending until you press **K** (key what you changed) or **Shift+K** (key the bird's whole pose).

**Dope sheet.** One summary lane per bird and camera, then a lane per animated channel (tick *all channels* to see the rest). Click a key to select, **Shift**-click to add, drag across empty space to box-select, drag a key to move it in time, **Delete** removes it, **Ctrl+C / Ctrl+V** copies keys and pastes them at the playhead (onto the selected bird). **Right-click** a key for interpolation and ease presets. **Ctrl+wheel** zooms the timeline.

**Curves** (**Tab**). Drag a point to change its value; drag the round handles to shape the ease between two keys. The buttons switch the selected keys between *Bezier*, *Linear* and *Step* (hold), and the menu applies an ease preset. *Normalise* scales every channel to the full height so a lean in degrees and a blink from 0 to 1 can be compared.

**Poses.** The left panel lists 12 expressions, 12 gestures and your own. Click a pose to key it at the playhead (only the channels it contains). **Shift**-click applies it mirrored. *Save current pose* stores the selected bird's pose, with the groups you tick, in `content/poses/custom.json`. Reference sheets: `PoseSheet-Expressions` and `PoseSheet-Gestures` in Remotion.

**Set, light, camera.** The top bar's *Set* and *Light* menus choose the studio sweep or the Desk, and day, golden hour or night. On the camera track, the *Camera preset* menu keys a named setup (wide, hero, close-up…). *Depth of field* and *Focus distance* are camera channels.

**Audio.** Type a file under `public/` (for example `assets/audio/line1.wav`) into the audio box and its loudness appears under the ruler. *Talk from audio* keys the selected bird's **Talk** channel on for every stretch where the audio is loud, which flaps the beak in time with a voice line. Use it with dialogue, not music.

**Undo** (**Ctrl+Z / Ctrl+Y**) covers everything except typing in the audio box. Nothing reaches disk until you save.

## Animating well

The rules in [asset-library/MOTION-RULES.md](../asset-library/MOTION-RULES.md) section 13 apply. The short version:

- **Eyes first.** Move `lookX` 4–6 frames before the head turns or the body moves.
- **Anticipate.** Squash (`stretch` −0.25) for 6 frames before a hop, stretch (+0.2) on launch, squash again on landing.
- **Lids carry the acting.** `lidTiltL/R` (angry ↔ worried), `lidOpen`, `squint` and a half-closed `blinkL/R` do more than the beak. Make sceptical and smug asymmetric.
- **Stagger the cast.** Never let all three start a move on the same frame; offset them by 4–8 frames.
- **Leave `jiggle` at 1.** The crest, fur and wings follow through on their own.
- **Keep `fluff` between 0.8 and 1.4.** It is the personality dial: puffed for startled or proud, flat for sad.

## The clip format

A clip is plain JSON, so you or an LLM can write one by hand. Keys are diff-friendly (one per line) when saved from the editor.

```json
{
  "version": 1,
  "name": "my-scene",
  "fps": 30,
  "duration": 180,
  "set": "desk",
  "rig": "desk-golden",
  "audio": "assets/audio/score-my-scene.wav",
  "cast": [{ "id": "quill", "seed": 1 }, { "id": "chalk", "seed": 3 }],
  "overlays": {
    "captions": [{ "from": 14, "text": "Every idea starts on paper." }],
    "endCard": { "from": 150, "cta": "Got a vision? Let's ship it.", "url": "protovinci.vercel.app" }
  },
  "tracks": {
    "camera": { "pz": [{ "f": 0, "v": 10.5 }, { "f": 90, "v": 9.2 }] },
    "quill": {
      "y": [{ "f": 20, "v": 0, "e": [0.1, 0.6, 0.3, 1] }, { "f": 28, "v": 0.5 }, { "f": 36, "v": 0 }],
      "autoBlink": [{ "f": 0, "v": 1, "i": "step" }]
    }
  }
}
```

- **Keys** are `{ "f": frame, "v": value }`. The segment from a key to the next is shaped by that key: `"e": [x1, y1, x2, y2]` is a CSS-style cubic-bezier ease (the default is ease in-out), `"i": "linear"` is a straight line, `"i": "step"` holds the value until the next key. Channels with no keys sit at their default. Frames must increase.
- **Channels** are listed in [RIG-REFERENCE.md](RIG-REFERENCE.md). Camera channels live on the `camera` track.
- **`set`** is `"studio"` (plain sweep) or `"desk"`. **`rig`** is the light: `studio`, `desk-day`, `desk-golden` or `desk-night`.
- **Cuts.** Put two camera keys on consecutive frames (89 and 90): Remotion renders whole frames, so that is a perfect cut.
- **Overlays** draw the brand kit over the 3D scene: `captions` (word by word), `wipe` (`{ "at": frame }`), `endCard` and `logoBug`.
- **`audio`** is a file under `public/`; `Episode` plays it, and the editor draws its waveform.

Each clip becomes two compositions automatically: `Episode-<name>` (16:9) and `Episode-<name>-9x16`.

## Writing a scene as code

`scripts/anim/authoring.mjs` is a small motion vocabulary that writes the same JSON. Two complete examples to copy: `scripts/anim/rig-demo.mjs` (6.5 s, every part of the rig) and `scripts/anim/ep01-off-the-page.mjs` (14 s with four shots, captions and an end card).

```js
import { ClipBuilder, EASE } from "./authoring.mjs";
const c = new ClipBuilder({ name: "my-scene", duration: 180, cast: ["quill", "chalk"], set: "desk", rig: "desk-golden" });
c.home();                                             // everyone to their usual spot
c.shot(0, 89, { px: 0.3, py: 1.6, pz: 10.5, tx: 0.2, ty: 1.6, tz: -2, fov: 26, blur: 2.2, focus: 10.2 }, { pz: 9.2 });  // a shot with a slow push in
c.hop("chalk", 20, { height: 0.5 });                  // anticipate, launch, land, settle
c.pose("quill", 40, { lookX: 0.8, tilt: 10 }, EASE.snap);
c.say("chalk", 50, 90);                               // beak chatter for a line
c.write();                                            // content/episodes/my-scene.anim.json
```

| Method | What it does |
| --- | --- |
| `key(track, channel, f, v, ease)` / `keys(track, channel, [[f, v, ease]…])` | Set one key or a run of keys. `ease` is an `EASE.*` array, `"linear"` or `"step"`. |
| `pose(track, f, { channel: value… }, ease)` | Key several channels on one frame. |
| `hop(bird, f, { height, air, wings, squash })` | A whole hop: anticipation squash, launch stretch, airtime, landing squash, settle. Clears its own window first. |
| `walk(bird, { f0, f1, x0, x1, yaw… })` | Alternating steps with planted feet, a bob and a waddle. |
| `shake(bird, channel, f, { amp, n, every })` | A quick oscillation: a head shake or a shiver. |
| `say(bird, f0, f1, amount)` | Beak chatter on for the length of a line. |
| `camera(f, values, ease, track)` / `shot(f0, f1, from, to, { track })` | Camera keys, or a whole shot. Pass `track: "camera-9x16"` for the vertical camera. |
| `clear(track, channel, fa, fb)` | Remove keys in a range. |
| `home()` | Put each bird at its usual spot on the sketchbook. |

Eases: `EASE.inOut`, `out` (decelerate), `in` (accelerate), `snap` (fast out, slow settle), `overshoot`, `anticipate`, plus `"linear"` and `"step"`.

A generator overwrites its output each time. To polish by hand, save the result under a new name in Puppet Studio and keep editing that.

## The Desk

The birds stand on an open sketchbook (y = 0, about 6 u wide and 4 u deep, centred at the origin) facing +z toward the camera. The window and its view of Mumbai and the Bandra–Worli Sea Link are behind them (z ≈ −7); the laptop is back-right, the lamp back-left. Keep birds within x ±2.7 and z ±2 and they stay on the pages.

Camera presets (`src/world3d/set/cameraPresets.ts`; menu on the camera track): `wide`, `establishing`, `hero`, `closeup`, `screen`, `reverse`, `overhead`, `vertical`. In code: `c.camera(0, CAMERA_PRESETS.wide.values)`.

A telephoto lens (`fov` 22–30) with `blur` 2–4 reads as a miniature. Set `focus` to the distance from the camera to the bird you want sharp.

Light rigs: `desk-day` (cool window light), `desk-golden` (low sun behind the birds: the fur rim-lights, which is the best look), `desk-night` (warm lamp, cool moon, laptop glow).

## Vertical (9:16)

A tall frame sees only a third of the width, so the camera that fits three birds in 16:9 cuts two off. Two ways to handle it:

1. **Best:** key a `camera-9x16` track yourself (the editor's 9:16 view shows it). `ep01-off-the-page` does this, with its own moves per shot.
2. **Automatic:** with no `camera-9x16` track, wide shots are reframed for you (the lens widens, then the camera pulls back until the whole cast fits, and it follows the cast sideways). Close-ups are left alone. See `src/world3d/anim/vertical.ts`.

Captions in tall formats sit in the upper part of the frame, above the birds.

## Sound

`node --no-warnings scripts/audio/render-score.mjs ep01` renders `public/assets/audio/score-ep01.wav` (14 s, −14 LUFS) for episode 1. The arrangement reads the clip's JSON: hops get a boop on takeoff and a soft thump on landing, Chalk's chatter gets chirps, camera cuts get whooshes, captions get a soft melody. Re-time the animation and re-run the script, and the sound follows. To score a new episode, copy `arrangeEp01` in that script and point it at your clip, then set the clip's `audio`.

## Rendering

```bash
npx remotion render Episode-my-scene out/my-scene.mp4 --gl=angle --concurrency=2 --crf=16
npx remotion render Episode-my-scene-9x16 out/my-scene-9x16.mp4 --gl=angle --concurrency=2 --crf=16
npx remotion still Episode-my-scene out/frame.png --frame=75 --gl=angle     # one frame
```

- **Always `--gl=angle`.**
- **Desk scenes need `--concurrency=2`.** Each browser tab holds the whole set, three furry birds and the lens buffers; the default number of tabs runs Chrome out of memory.
- **Speed.** On a laptop's integrated GPU a Desk video renders at about 2–3 frames per second with two tabs (a 14 s episode takes roughly 3–4 minutes); a single still takes 5–7 s because it starts the browser and loads the set first. If your machine has a second GPU, set Remotion's headless Chrome (`node_modules\.remotion\chrome-headless-shell\win64\chrome-headless-shell-win64\chrome-headless-shell.exe`) and your Chrome to *High performance* in Windows Settings → System → Display → Graphics. `npx remotion still GpuProbe out/gpu.png --gl=angle` prints which GPU Chrome uses.
- To check a scene cheaply, render every Nth frame as stills: `--frames=0-419 --every-nth-frame=15 --sequence --image-format=jpeg`.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| The canvas stays black or empty in the editor | The page needs a real size. If it still fails, reload; browsers allow only about 16 WebGL contexts, so close other 3D tabs. |
| A Remotion frame is empty or missing props | Assets load through React Suspense, which makes Remotion wait. Do not add your own `<Suspense>` inside `BirdScene`. |
| "Chrome ran out of memory" while rendering | Lower `--concurrency` to 2 (or 1). |
| Blurred shots have a black or white blob | A shader produced NaN or infinity and the blur spread it. The fur shaders guard against this; guard any new shader the same way. |
| Birds or props vanish at the edge of a wide shot | The camera's far plane is 500 units; keep set pieces inside it. |
| The editor cannot save | It saves through the dev server's local API: run it with `npm run editor`, not by opening the HTML file. |
| Chalk's feet slide | They should not: the hips follow the body and the feet are planted. If you key `x`, move the feet with `stepL/R` and `liftL/R`, or use `walk()`. |
