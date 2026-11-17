# Character bible: Quill, Ink and Chalk

Three equal characters, one family. They are original designs with the warmth of the "hatchling" kind of character (round, furry, enormous forward-facing eyes, tiny beak and feet), mapped to ProtoVinci's palette: **paper** (Quill), **ink** (Ink) and **the red line** (Chalk). Everything below is data in `src/world3d/characters/config.ts` and can be tuned there.

At thumbnail size you tell them apart by three things: **colour, height and head-feather**.

| | **Quill** | **Ink** | **Chalk** |
| --- | --- | --- | --- |
| Role | The builder | The engineer | The hype |
| One line | Earnest, curious, sketches everything first | Calm, precise, quietly funny | Tiny, excitable, never stops bouncing |
| Shape | Egg, medium (1.00 tall) | Tallest, pear-shaped (1.16) | Smallest, roundest (0.84) |
| Fur | Ivory over vanilla, medium clumps | Short and sleek, charcoal with a cream face and belly | Longest and frizziest, coral fading to peach |
| Colours | `#E8D3AC` · tips `#F7EBD4` · belly `#FBF3E4` | `#2B2A30` · mask `#EFE8DA` · belly `#E9E2D3` | `#E06A4E` · tips `#F59A78` · belly `#FBC9A8` |
| Head | One long quill feather dipped in red (the logo) | Three swept-back sleek feathers | A wild cowlick of four curly plumes |
| Eyes | Amber, wide and open | Cool grey-blue, half-lidded at rest, round black glasses | Huge, dark, with lashes |
| Beak | Small, brass, shaped like a fountain-pen nib with a slit and breather hole | Short and round | Tiny and pointed |
| Voice (sound) | Mid pitch, centre | Low, left | High, right |

## Shared anatomy

- **One mass, no neck.** Head and body are a single squashy form, so every pose is about the whole body.
- **Eyes are the character.** Huge, wide-set and forward, with a thin coloured liner, a glossy cornea and catchlights, and furred lids that move. Most of the acting is in the lids and gaze.
- **Tiny beak and feet.** The beak has one hinge (`beakOpen`); the feet are planted and never slide.
- **Wing-hands.** A furred wing with three feather lobes, controlled by raise, swing and twist.
- **Fur is alive.** `fluff` puffs or flattens it; `jiggle` makes the crest, fur tips and wings follow through; `wind` blows them.
- **One asymmetric detail each**: Quill's red-tipped quill, Ink's glasses, Chalk's off-centre cowlick.

## How each one moves

### Quill: the anchor
Quill is where the audience looks first and the one who discovers things.
- **Studies, then reacts.** Leans in over the page (`lean` +20…+28, `lookY` down); looks up with a snap when something happens.
- **Curious head tilt** (`tilt` 10–14), eyes a little wide (`lidOpen` +0.3).
- **Delight** shows in the face first: big pupils, a squint that rises, then a hop.
- **Hops are moderate and well prepared** (height 0.3–0.5, anticipation squash). A cheer lifts both wings past horizontal (`wingL/R` 1.1).

### Ink: the straight man
Ink is never the first to move and never overdoes it. Comedy comes from Ink's restraint.
- **Arms folded** at rest: wings swung forward a little (`wingSwing` 0.45).
- **Sceptical lids**, asymmetric: one inner corner down, one slightly up, a half-blink (`lidTiltL` −0.5, `lidTiltR` +0.2, `blinkL` 0.3).
- **A short, quick head shake** instead of a big gesture (`shake`, amplitude 6–9°).
- **Impressed** is shown by opening the lids and straightening up, not by smiling. A nod is two small dips.
- **The reward** is one dignified wave and one small hop, and a slow, smug blink.

### Chalk: the engine
Chalk is always about to move, and moves first.
- **Hops in twos**, small and quick, sometimes without a reason.
- **Big pupils** (`pupil` 1.25+) and wide lids; tilts the whole body when listening.
- **Chatters:** `talk` on, fast wing-flaps, wing swung out to point at things.
- **Waddles** with an exaggerated side-to-side tilt when walking.
- **Lands every beat** at higher energy than the others; give Chalk the cheer's second hop.

## Family rules

**Do**
- Let the eyes lead: gaze first, then head, then body.
- Stagger the cast by 4–8 frames so the three never move in unison.
- Use asymmetry for sceptical, smug and curious; symmetry for surprised, delighted and sad.
- Keep `fluff` between 0.8 and 1.4. Puffed is startled or proud; flat is sad or sheepish.
- Light them from behind (the Desk's window, `desk-golden`): the rim light through the fur is what makes them look plush.
- Keep Ink's expressions small, Chalk's large, Quill's in between.

**Don't**
- Don't give Ink a big smile or Chalk a deadpan. Out of character is funny only once.
- Don't turn a bird fully away from the camera for long: without the eyes there is no character.
- Don't leave a bird dead still. Auto-blink and breathing run on their own; keep them on unless you want a held stare.
- Don't squash below about −0.35 or stretch above +0.3 except for one frame at a time.
- Don't change a bird's colours or proportions per scene: edit `config.ts`, so every scene updates.
- Don't copy another studio's characters. These are original; keep it that way.

## Poses that suit each bird

Expressions and gestures are in `content/poses/` (reference: the `PoseSheet-Expressions` and `PoseSheet-Gestures` stills).

| Bird | Reach for | Rarely |
| --- | --- | --- |
| Quill | curious, thinking, delighted, bow, presenting | angry, facepalm-style gestures |
| Ink | sceptical, smug, thinking, shrug, presenting | laughing, cheer, scared |
| Chalk | delighted, surprised, laughing, cheer, point forward | sceptical, smug |

## Where to change things

| To change | Edit |
| --- | --- |
| A bird's looks (colours, proportions, eyes, beak, crest) | `src/world3d/characters/config.ts` |
| What the controls can do | `src/world3d/rig/schema.ts`, then `node --no-warnings scripts/docs/make-rig-reference.mjs` |
| How the model is built (geometry, fur, skeleton) | `src/world3d/characters/buildBird.ts`, `src/world3d/fur/furMaterials.ts` |
| Automatic behaviour (blink, breathe, talk, follow-through) | `src/world3d/anim/evaluate.ts` |
