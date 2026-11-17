# Nib and the Studio — puppet guide

**Nib** is ProtoVinci's mascot: a fountain-pen nib come to life (the nib from the logo), with a cream quill feather for hair, dipped in red chalk, and arms and legs made of the brand's red line. The breather hole and slit of a real nib sit on its belly.

**Personality:** curious, earnest, a builder who sketches everything first. A little theatrical, da Vinci flair. Gets visibly excited by ideas (the light bulb, the hop). Never mean, never sarcastic. Says "let's sketch it, then ship it".

**The Studio** is ProtoVinci's build-in-public workshop in Mumbai: a window onto the Bandra-Worli Sea Link, a pinboard of sketches joined by the red line, a shelf of builds, a desk with a monitor, the quill in its inkpot, and a neon "Building in public" sign.

Everything is code, so every episode is a short script.

---

## 1. The smallest episode

```tsx
import { Actor, type Script } from "./mascot/Actor";
import { Studio, MARKS, FLOOR_Y } from "./mascot/Studio";

const script: Script = {
  start: { x: MARKS.centre, y: FLOOR_Y, scale: 1, expression: "happy" },
  cues: [{ at: 30, pose: { gesture: "present", expression: "proud" } }],
  wave: [{ from: 0, to: 28 }],
  talk: [{ from: 30, to: 90 }],
};

export const Episode = () => (
  <Studio time="day" monitor="site">
    <Actor script={script} />
  </Studio>
);
```

Register it as a `<Composition>` (30 fps, 1920×1080 or 1080×1920) and render. `src/mascot/MascotCompositions.tsx` has a full working example: `EPISODE_DEMO`.

## 2. How a script works

| Field | Meaning |
| --- | --- |
| `start` | Nib's pose at frame 0 |
| `cues` | `{ at, pose, dur?, ease? }`: from frame `at`, move to `pose` over `dur` frames (default 12). Only what you mention changes; everything else stays |
| `walk` | `{ from, to, toX }`: walk to `toX`. Legs, bounce, arm swing and turning are automatic |
| `talk` | `{ from, to, intensity? }`: mouth flaps with natural rhythm, brows and head move a little |
| `wave` | `{ from, to }`: raises the right hand and waves, then returns |
| `hop` | `{ at, height? }`: crouch, jump, land with squash |
| `nod` | `{ from, to, kind: "yes" \| "no" }` |
| `blink`, `breathe` | Automatic, on by default |
| `seed` | Changes blink timing; give two Nibs different seeds |

Frames are local to the `<Sequence>` the Actor sits in. Use 18-frame beats (100 BPM at 30 fps) so movement lands on the music, as in the brand film.

## 3. Pose vocabulary

**Expressions** (`expression:`): `neutral`, `happy`, `joy`, `thinking`, `surprised`, `determined`, `worried`, `sleepy`, `wink`, `proud`, `sad`, `mischief`. See `expressions.jpg`.

**Gestures** (`gesture:`): `rest`, `wave`, `present`, `point`, `cheer`, `think`, `shrug`, `hips`, `hold`, `type`, `salute`, `reach`. See `gestures.jpg`.

**Outfit and props**: `prop:` `pencil`, `mug`, `laptop`, `phone`, `flag` ("SHIP IT"), `bulb`, `wrench` · `hat:` `beret`, `hardhat`, `headphones` · `glasses: true` · `body:` `ink` (default), `paper`, `sanguine`. See `outfits.jpg`.

**Fine control.** Every part is a number you can set directly:

| Field | Range and meaning |
| --- | --- |
| `x`, `y`, `scale` | Position on the stage (floor is `y: FLOOR_Y`), size (1 = about 470 px tall) |
| `facing` | 1 right, -1 left; tween between them to turn |
| `lean`, `tilt` | Body lean and head tilt, degrees |
| `bounce`, `stretch`, `air` | Crouch (+) / rise (−), squash-stretch (−0.2..0.2), jump height |
| `armL`, `armR` | `{ shoulder, elbow }` degrees. Shoulder 0 = down, 90 = out, 180 = up |
| `legL`, `legR` | `{ step, lift }` |
| `face` | `lookX`, `lookY` (−1..1), `openL`, `openR` (0..1), `browRaise`, `browSlant` (−1 angry .. 1 worried), `mouthOpen`, `smile` (−1..1), `round` (0..1), `blush` |
| `plume` | Feather angle (sway is added automatically) |

Example: look at the monitor while sceptical: `{ face: { lookX: 0.8, browSlant: -0.4, smile: -0.2 }, tilt: 6 }`.

## 4. The Studio

`<Studio time monitor sign lamp camera>`:

| Prop | Options |
| --- | --- |
| `time` | `day`, `golden`, `night` (night switches the lamp on and tints the room) |
| `monitor` | `site`, `code` (types itself), `chart` (bars grow), `logo`, `off` |
| `sign` | neon on or off |
| `lamp` | override the lamp |
| `camera` | `{ x, y, zoom }` in stage pixels. Animate it for pushes and pans; vertical formats crop around `camera.x` |

**Marks** (`MARKS`): `board` 400, `centre` 820 (on the rug), `shelf` 930, `desk` 1180, `window` 1520. Stand Nib at `y: FLOOR_Y`.

**Layers**: back wall, then desk, then **your actors**, then the foreground plant, then lighting. Anything you pass as children is lit by the room's time of day.

**Living details** animate on their own: clouds drift, steam rises, the code types, sea-link lights twinkle at night, the plant sways, the neon flickers.

Camera example, a slow push from wide to Nib at the desk:

```tsx
const f = useCurrentFrame();
const zoom = interpolate(f, [0, 90], [1, 1.6], { extrapolateRight: "clamp", easing: Easing.bezier(0.65, 0, 0.35, 1) });
<Studio camera={{ x: interpolate(f, [0, 90], [960, 1180]), y: 640, zoom }}>…</Studio>
```

## 5. Direction tips

- **One action at a time.** Let a gesture land and hold for at least 20 frames before the next.
- **Anticipate.** Before a big move, add a small opposite move 4–6 frames earlier (a crouch before a hop is already built in).
- **Eyes lead.** Change `lookX`/`lookY` 4–6 frames before Nib turns or walks.
- **Talk with the body.** Pair `talk` ranges with a gesture change at the start of each sentence.
- **Keep Nib on the rug** for dialogue (`MARKS.centre`); it frames well in 16:9 and in a centred 9:16 crop.
- **Captions** come from the video kit: `<Captions words={evenWords("…", 0, 7)} />`.
- Two Nibs? Give each an `id` (`<Actor id="nib2" …/>`) and a different `seed`.

## 6. Files

- **`src/mascot/rig.ts`**: pose model, expressions, gestures, blending.
- **`src/mascot/Mascot.tsx`**: the drawing.
- **`src/mascot/Actor.tsx`**: scripts and automatic behaviours.
- **`src/mascot/Studio.tsx`**: the set.
- **`src/mascot/MascotCompositions.tsx`**: demo episode and reference sheets.
- **Compositions**:
  - `Nib-Demo`, `Nib-Demo-Vertical`
  - `Nib-Expressions`, `Nib-Gestures`, `Nib-Outfits`
  - `Studio-Day`, `Studio-Golden`, `Studio-Night`
