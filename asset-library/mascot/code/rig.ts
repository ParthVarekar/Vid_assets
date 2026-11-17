// Nib — the ProtoVinci mascot. Rig definition: every movable part is a number
// in a Pose. Poses are plain data, so they can be stored, blended, scripted
// and edited by hand or by any LLM.
//
// Coordinates: the character's own space has its origin on the ground between
// the feet, x to the right, y DOWN (SVG). Nib is about 470 units tall with the
// feather. Angles are degrees.

export type Arm = {
  /** Shoulder: 0 = hanging down, 90 = straight out sideways, 180 = straight up. */
  shoulder: number;
  /** Elbow bend relative to the upper arm. Positive bends the forearm upward/forward. */
  elbow: number;
};

export type Leg = {
  /** Foot horizontal offset from its rest position. */
  step: number;
  /** Foot lift off the ground. */
  lift: number;
};

export type Face = {
  /** Where the eyes look, -1..1 each. */
  lookX: number;
  lookY: number;
  /** 1 = open, 0 = closed. Left and right separate for winks. */
  openL: number;
  openR: number;
  /** Brow height (-1 low .. 1 raised) and slant (-1 angry .. 1 worried). */
  browRaise: number;
  browSlant: number;
  /** Mouth: open 0..1, smile -1 (frown) .. 1, round 0 (wide) .. 1 ("o"). */
  mouthOpen: number;
  smile: number;
  round: number;
  /** Cheek blush 0..1. */
  blush: number;
};

export type PropName = "none" | "pencil" | "mug" | "laptop" | "phone" | "flag" | "bulb" | "wrench";
export type Hat = "none" | "beret" | "hardhat" | "headphones";
export type BodyColor = "ink" | "paper" | "sanguine";

export type Pose = {
  /** Position in the scene (scene units) and size. */
  x: number;
  y: number;
  scale: number;
  /** 1 faces right, -1 faces left. Values between flip through (turning). */
  facing: number;
  /** Whole-body lean from the hips. */
  lean: number;
  /** Vertical body offset (bounce, crouch). Negative is up. */
  bounce: number;
  /** Squash and stretch: 0 normal, >0 tall and thin, <0 short and wide. */
  stretch: number;
  /** Jump height above the ground (feet leave the floor). */
  air: number;
  /** Head (face, hat and feather) tilt. */
  tilt: number;
  /** Feather angle; the Actor adds sway automatically. */
  plume: number;
  armL: Arm;
  armR: Arm;
  legL: Leg;
  legR: Leg;
  face: Face;
  /** Prop held in the right hand. */
  prop: PropName;
  hat: Hat;
  glasses: boolean;
  body: BodyColor;
};

export const REST: Pose = {
  x: 0,
  y: 0,
  scale: 1,
  facing: 1,
  lean: 0,
  bounce: 0,
  stretch: 0,
  air: 0,
  tilt: 0,
  plume: 0,
  armL: { shoulder: 14, elbow: 10 },
  armR: { shoulder: 14, elbow: 10 },
  legL: { step: 0, lift: 0 },
  legR: { step: 0, lift: 0 },
  face: { lookX: 0, lookY: 0, openL: 1, openR: 1, browRaise: 0, browSlant: 0, mouthOpen: 0, smile: 0.35, round: 0, blush: 0.25 },
  prop: "none",
  hat: "none",
  glasses: false,
  body: "ink",
};

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export type Expression =
  | "neutral"
  | "happy"
  | "joy"
  | "thinking"
  | "surprised"
  | "determined"
  | "worried"
  | "sleepy"
  | "wink"
  | "proud"
  | "sad"
  | "mischief";

export const EXPRESSIONS: Record<Expression, Partial<Face>> = {
  neutral: { smile: 0.15, mouthOpen: 0, browRaise: 0, browSlant: 0, openL: 1, openR: 1, blush: 0.2 },
  happy: { smile: 0.8, mouthOpen: 0.15, browRaise: 0.25, browSlant: 0, openL: 1, openR: 1, blush: 0.45 },
  joy: { smile: 1, mouthOpen: 0.75, round: 0, browRaise: 0.7, browSlant: 0, openL: 0.35, openR: 0.35, blush: 0.7 },
  thinking: { smile: -0.1, mouthOpen: 0, round: 0.5, browRaise: 0.35, browSlant: -0.5, lookX: 0.6, lookY: -0.7, openL: 0.9, openR: 0.75, blush: 0.15 },
  surprised: { smile: 0, mouthOpen: 0.7, round: 1, browRaise: 1, browSlant: 0.2, openL: 1.15, openR: 1.15, blush: 0.2 },
  determined: { smile: 0.25, mouthOpen: 0, browRaise: -0.4, browSlant: -0.8, openL: 0.8, openR: 0.8, blush: 0.15 },
  worried: { smile: -0.5, mouthOpen: 0.15, round: 0.3, browRaise: 0.4, browSlant: 1, openL: 1, openR: 1, blush: 0.1 },
  sleepy: { smile: 0.05, mouthOpen: 0.1, round: 0.6, browRaise: -0.3, browSlant: 0.3, openL: 0.22, openR: 0.18, blush: 0.3 },
  wink: { smile: 0.85, mouthOpen: 0.1, browRaise: 0.3, browSlant: 0, openL: 1, openR: 0.05, blush: 0.55 },
  proud: { smile: 0.7, mouthOpen: 0, browRaise: 0.1, browSlant: -0.2, openL: 0.6, openR: 0.6, lookY: -0.3, blush: 0.45 },
  sad: { smile: -0.8, mouthOpen: 0.05, browRaise: 0.2, browSlant: 1, openL: 0.85, openR: 0.85, lookY: 0.5, blush: 0.1 },
  mischief: { smile: 0.6, mouthOpen: 0, browRaise: 0.1, browSlant: -0.6, openL: 0.7, openR: 0.95, lookX: 0.6, blush: 0.4 },
};

export type Gesture =
  | "rest"
  | "wave"
  | "present"
  | "point"
  | "cheer"
  | "think"
  | "shrug"
  | "hips"
  | "hold"
  | "type"
  | "salute"
  | "reach";

/** Arm and body poses. "wave" is the start of a wave; the Actor animates it. */
export const GESTURES: Record<Gesture, Partial<Pose>> = {
  rest: { armL: { shoulder: 14, elbow: 10 }, armR: { shoulder: 14, elbow: 10 }, lean: 0 },
  wave: { armL: { shoulder: 14, elbow: 10 }, armR: { shoulder: 150, elbow: 30 }, lean: -3 },
  present: { armL: { shoulder: 18, elbow: 12 }, armR: { shoulder: 75, elbow: -10 }, lean: 4 },
  point: { armL: { shoulder: 16, elbow: 14 }, armR: { shoulder: 95, elbow: 0 }, lean: 6 },
  cheer: { armL: { shoulder: 160, elbow: 15 }, armR: { shoulder: 160, elbow: 15 }, lean: 0 },
  think: { armL: { shoulder: 18, elbow: -95 }, armR: { shoulder: -20, elbow: -108 }, lean: -4 },
  shrug: { armL: { shoulder: 35, elbow: 80 }, armR: { shoulder: 35, elbow: 80 }, lean: 0 },
  hips: { armL: { shoulder: 45, elbow: -110 }, armR: { shoulder: 45, elbow: -110 }, lean: 0 },
  hold: { armL: { shoulder: 16, elbow: 12 }, armR: { shoulder: 30, elbow: 70 }, lean: 0 },
  type: { armL: { shoulder: 28, elbow: -62 }, armR: { shoulder: 28, elbow: -62 }, lean: 6 },
  salute: { armL: { shoulder: 14, elbow: 10 }, armR: { shoulder: 120, elbow: 125 }, lean: 0 },
  reach: { armL: { shoulder: 30, elbow: 10 }, armR: { shoulder: 120, elbow: 5 }, lean: 10 },
};

// ---------------------------------------------------------------------------
// Blending
// ---------------------------------------------------------------------------

/** Deep partial: anything you want to override. */
export type PoseInput = Partial<Omit<Pose, "armL" | "armR" | "legL" | "legR" | "face">> & {
  armL?: Partial<Arm>;
  armR?: Partial<Arm>;
  legL?: Partial<Leg>;
  legR?: Partial<Leg>;
  face?: Partial<Face>;
  /** Shorthands applied before the explicit fields above. */
  expression?: Expression;
  gesture?: Gesture;
};

/** Applies a PoseInput on top of a base pose. */
export const applyPose = (base: Pose, input: PoseInput): Pose => {
  let p: Pose = base;
  if (input.gesture) p = applyPose(p, GESTURES[input.gesture] as PoseInput);
  if (input.expression) p = { ...p, face: { ...p.face, ...EXPRESSIONS[input.expression] } };
  const { expression: _e, gesture: _g, armL, armR, legL, legR, face, ...rest } = input;
  void _e;
  void _g;
  return {
    ...p,
    ...rest,
    armL: { ...p.armL, ...armL },
    armR: { ...p.armR, ...armR },
    legL: { ...p.legL, ...legL },
    legR: { ...p.legR, ...legR },
    face: { ...p.face, ...face },
  };
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Blends two poses. Numbers interpolate; switches (prop, hat...) change halfway. */
export const blendPose = (a: Pose, b: Pose, t: number): Pose => {
  const num = <T extends Record<string, unknown>>(x: T, y: T): T => {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(x)) {
      const xv = x[k];
      const yv = y[k];
      if (typeof xv === "number" && typeof yv === "number") out[k] = lerp(xv, yv, t);
      else if (xv && typeof xv === "object" && yv && typeof yv === "object") out[k] = num(xv as Record<string, unknown>, yv as Record<string, unknown>);
      else out[k] = t < 0.5 ? xv : yv;
    }
    return out as T;
  };
  return num(a as unknown as Record<string, unknown>, b as unknown as Record<string, unknown>) as unknown as Pose;
};
