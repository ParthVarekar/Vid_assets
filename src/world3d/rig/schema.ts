// The rig, as a list of animatable channels. Every control an animator touches
// is one number here. The editor builds its sliders and dope-sheet rows from
// this list, the clip format stores keys per channel id, and the bird builder
// turns a full set of values into bone transforms.
//
// All three birds share one schema, so poses, gestures and animation skills
// transfer between them.

export type ChannelGroup = "body" | "eyes" | "beak" | "wings" | "legs" | "crest" | "life";

export type Channel = {
  id: string;
  label: string;
  group: ChannelGroup;
  min: number;
  max: number;
  default: number;
  /** Units shown in the editor. */
  unit?: "deg" | "u" | "";
  /** For mirroring: the opposite-side channel, or "negate" for left/right signed values. */
  mirror?: string | "negate";
  /** Values change instantly (no interpolation needed), e.g. on/off behaviours. */
  stepped?: boolean;
  help: string;
};

export const CHANNELS: Channel[] = [
  // Body ------------------------------------------------------------------
  { id: "x", label: "Move X", group: "body", min: -6, max: 6, default: 0, unit: "u", mirror: "negate", help: "Position left/right on the ground (1 u = Quill's height)." },
  { id: "z", label: "Move Z", group: "body", min: -6, max: 6, default: 0, unit: "u", help: "Position toward (+) or away from (-) the camera." },
  { id: "y", label: "Lift", group: "body", min: 0, max: 3, default: 0, unit: "u", help: "Height off the ground: hops, jumps, being picked up. Feet leave the ground." },
  { id: "yaw", label: "Turn", group: "body", min: -180, max: 180, default: 0, unit: "deg", mirror: "negate", help: "Facing. 0 looks at the camera." },
  { id: "lean", label: "Lean", group: "body", min: -40, max: 40, default: 0, unit: "deg", help: "Bend forward (+) or back (-) from the hips." },
  { id: "tilt", label: "Tilt", group: "body", min: -35, max: 35, default: 0, unit: "deg", mirror: "negate", help: "Bend sideways: a curious head tilt." },
  { id: "twist", label: "Twist", group: "body", min: -45, max: 45, default: 0, unit: "deg", mirror: "negate", help: "Turn the upper body (face) without moving the feet." },
  { id: "stretch", label: "Squash/stretch", group: "body", min: -0.45, max: 0.45, default: 0, help: "Volume-preserving squash (-) and stretch (+). Use for anticipation and landings." },
  { id: "fluff", label: "Fluff", group: "body", min: 0.5, max: 1.8, default: 1, help: "Fur puffed out (>1: startled, cold, proud) or flattened (<1: wet, scared, sheepish)." },

  // Eyes ------------------------------------------------------------------
  { id: "lookX", label: "Look X", group: "eyes", min: -1, max: 1, default: 0, mirror: "negate", help: "Eyes look left (-) or right (+)." },
  { id: "lookY", label: "Look Y", group: "eyes", min: -1, max: 1, default: 0, help: "Eyes look down (-) or up (+). Lids follow." },
  { id: "blinkL", label: "Lid L", group: "eyes", min: 0, max: 1, default: 0, mirror: "blinkR", help: "Left upper lid: 0 at rest, 1 closed." },
  { id: "blinkR", label: "Lid R", group: "eyes", min: 0, max: 1, default: 0, mirror: "blinkL", help: "Right upper lid: 0 at rest, 1 closed." },
  { id: "lidTiltL", label: "Lid angle L", group: "eyes", min: -1, max: 1, default: 0, mirror: "lidTiltR", help: "-1 angry (inner corner down) .. +1 sad/worried (inner corner up)." },
  { id: "lidTiltR", label: "Lid angle R", group: "eyes", min: -1, max: 1, default: 0, mirror: "lidTiltL", help: "-1 angry .. +1 sad/worried." },
  { id: "lidOpen", label: "Lids wide", group: "eyes", min: -0.5, max: 1, default: 0, help: "Raise both upper lids past rest (surprise) or lower them (bored)." },
  { id: "squint", label: "Squint", group: "eyes", min: 0, max: 1, default: 0, help: "Lower lids rise: smiling eyes, suspicion, effort." },
  { id: "pupil", label: "Pupils", group: "eyes", min: 0.55, max: 1.5, default: 1, help: "Pupil size: big = cute, delighted, dark; small = shock." },

  // Beak ------------------------------------------------------------------
  { id: "beakOpen", label: "Beak open", group: "beak", min: 0, max: 1, default: 0, help: "Open the lower beak. Keyframe for words, or use Talk." },

  // Wings -----------------------------------------------------------------
  { id: "wingL", label: "Wing L raise", group: "wings", min: -0.2, max: 1.2, default: 0, mirror: "wingR", help: "Lift the left wing out and up (1 = straight out, >1 = above)." },
  { id: "wingR", label: "Wing R raise", group: "wings", min: -0.2, max: 1.2, default: 0, mirror: "wingL", help: "Lift the right wing." },
  { id: "wingSwingL", label: "Wing L swing", group: "wings", min: -1, max: 1, default: 0, mirror: "wingSwingR", help: "Swing the left wing forward (+) or back (-): pointing, hugging, shrugging." },
  { id: "wingSwingR", label: "Wing R swing", group: "wings", min: -1, max: 1, default: 0, mirror: "wingSwingL", help: "Swing the right wing forward (+) or back (-)." },
  { id: "wingTwistL", label: "Wing L twist", group: "wings", min: -1, max: 1, default: 0, mirror: "wingTwistR", help: "Rotate the left wing along its length: palm up (+) / down (-)." },
  { id: "wingTwistR", label: "Wing R twist", group: "wings", min: -1, max: 1, default: 0, mirror: "wingTwistL", help: "Rotate the right wing along its length." },

  // Legs ------------------------------------------------------------------
  { id: "stepL", label: "Foot L step", group: "legs", min: -1, max: 1, default: 0, mirror: "stepR", help: "Move the left foot forward (+) or back (-) under the body." },
  { id: "stepR", label: "Foot R step", group: "legs", min: -1, max: 1, default: 0, mirror: "stepL", help: "Move the right foot forward (+) or back (-)." },
  { id: "liftL", label: "Foot L lift", group: "legs", min: 0, max: 1, default: 0, mirror: "liftR", help: "Lift the left foot off the ground." },
  { id: "liftR", label: "Foot R lift", group: "legs", min: 0, max: 1, default: 0, mirror: "liftL", help: "Lift the right foot." },

  // Crest -----------------------------------------------------------------
  { id: "crest", label: "Crest", group: "crest", min: -1, max: 1, default: 0, help: "Crest bent back (-) or flicked forward (+). Secondary motion adds sway on top." },

  // Life (behaviour layers) ------------------------------------------------
  { id: "autoBlink", label: "Auto blink", group: "life", min: 0, max: 1, default: 1, stepped: true, help: "Natural blinks every 2.5-5 s. Turn off for held, staring or closed-eye moments." },
  { id: "breathe", label: "Breathing", group: "life", min: 0, max: 2, default: 1, help: "Idle breathing amount (fur rises and falls)." },
  { id: "talk", label: "Talk", group: "life", min: 0, max: 1.5, default: 0, help: "Automatic beak flapping while > 0. Key it on for the length of each line." },
  { id: "jiggle", label: "Secondary", group: "life", min: 0, max: 2, default: 1, help: "Follow-through on crest, fur and wings after moves and landings." },
  { id: "wind", label: "Wind", group: "life", min: 0, max: 2, default: 0, help: "Fur and crest blown by a breeze." },
];

export const CHANNEL_BY_ID: Record<string, Channel> = Object.fromEntries(CHANNELS.map((c) => [c.id, c]));
export const GROUPS: ChannelGroup[] = ["body", "eyes", "beak", "wings", "legs", "crest", "life"];

/** Full set of rig values. */
export type RigValues = Record<string, number>;

export const restValues = (): RigValues => Object.fromEntries(CHANNELS.map((c) => [c.id, c.default]));

export const clampChannel = (id: string, v: number) => {
  const c = CHANNEL_BY_ID[id];
  return c ? Math.max(c.min, Math.min(c.max, v)) : v;
};

/** Mirror a set of values left/right (for mirror-pose). */
export const mirrorValues = (v: RigValues): RigValues => {
  const out: RigValues = { ...v };
  for (const c of CHANNELS) {
    if (!(c.id in v)) continue;
    if (c.mirror === "negate") out[c.id] = -v[c.id];
    else if (c.mirror) {
      out[c.mirror] = v[c.id];
    }
  }
  return out;
};

// Camera channels, keyed on the "camera" track.
export const CAMERA_CHANNELS: Channel[] = [
  { id: "px", label: "Cam X", group: "body", min: -20, max: 20, default: 0, unit: "u", help: "Camera position X." },
  { id: "py", label: "Cam Y", group: "body", min: -2, max: 20, default: 1.1, unit: "u", help: "Camera position Y (height)." },
  { id: "pz", label: "Cam Z", group: "body", min: -20, max: 30, default: 9, unit: "u", help: "Camera position Z (distance)." },
  { id: "tx", label: "Target X", group: "body", min: -20, max: 20, default: 0, unit: "u", help: "Point the camera looks at, X." },
  { id: "ty", label: "Target Y", group: "body", min: -2, max: 10, default: 0.6, unit: "u", help: "Point the camera looks at, Y." },
  { id: "tz", label: "Target Z", group: "body", min: -20, max: 20, default: 0, unit: "u", help: "Point the camera looks at, Z." },
  { id: "fov", label: "Lens (fov)", group: "body", min: 8, max: 70, default: 22, unit: "deg", help: "Vertical field of view. Small = telephoto, flatter and more cinematic." },
  { id: "roll", label: "Roll", group: "body", min: -30, max: 30, default: 0, unit: "deg", help: "Dutch angle." },
  { id: "shake", label: "Shake", group: "body", min: 0, max: 1, default: 0, help: "Handheld wobble amount." },
];
export const CAMERA_BY_ID: Record<string, Channel> = Object.fromEntries(CAMERA_CHANNELS.map((c) => [c.id, c]));
