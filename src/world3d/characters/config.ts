// The three ProtoVinci birds, as data. Everything that makes them look different
// lives here: proportions, groom, palette, eyes, beak, crest. The builder turns
// a config into a rigged, furred 3D character.
//
// Units: Quill's body is 1.0 tall. Y is up, the bird faces +Z.
//
// Designs are original: round "flour-sack" birds with the hatchling vibe
// (huge forward-facing eyes, tiny beak and feet, clumped plush fur), mapped to
// the brand palette: paper (Quill), ink (Ink) and the red line (Chalk).

export type BirdId = "quill" | "ink" | "chalk";
export type BeakKind = "nib" | "round" | "point";
export type CrestKind = "quill" | "sleek" | "tuft";

export type BirdConfig = {
  id: BirdId;
  name: string;
  role: string;
  body: {
    /** Height of the furless body, from its bottom to its top. */
    height: number;
    /** Widest diameter. */
    width: number;
    /** Front-to-back depth as a fraction of the width. */
    depth: number;
    /** 0 round .. 1 strongly wider at the bottom (egg / pear). */
    bottomHeavy: number;
    /** Narrowing of the top third (pear shape). */
    pear: number;
    /** Flattening of the face side. */
    faceFlat: number;
    /** Flattening of the underside, so it sits. */
    flatBottom: number;
    /** Top of the body leans forward a touch (never perfectly upright). */
    lean: number;
    /** Leg length visible below the body. */
    legLength: number;
  };
  fur: {
    /** Shell fur length (fraction of body height). */
    length: number;
    /** Strands per unit (shell cells). Higher is finer. */
    density: number;
    /** Clump (feather tuft) cells per unit. */
    clumpFreq: number;
    /** How strongly strands converge into clumps at the tips, 0..1. */
    clump: number;
    /** Strand radius in cell units (0..0.5). */
    radius: number;
    /** Comb: how much fur lies along the flow instead of standing up. */
    comb: number;
    /** Droop under gravity. */
    gravity: number;
    /** Long outer strands for the fluffy halo. */
    strands: number;
    /** Outer strand length relative to the shell length. */
    strandLength: number;
    /** Frizz of outer strands, 0..1. */
    frizz: number;
    /** Colours, sRGB hex. */
    base: string;
    tip: string;
    belly: string;
    bellyAmount: number;
    /** Optional face mask (Ink's cream face). */
    face: string | null;
    faceAmount: number;
    blush: string;
    blushAmount: number;
    /** Underlying skin under the fur. */
    skin: string;
    /** Specular strength of the fur sheen. */
    sheen: number;
  };
  eyes: {
    /** Eyeball radius as a fraction of the body width. */
    size: number;
    /** Horizontal angle of each eye from the centre line, degrees. */
    spread: number;
    /** Eye height as a fraction of body height (from the bottom). */
    height: number;
    /** How much of the eyeball sticks out of the fur, 0..1. */
    protrude: number;
    iris: string;
    irisDark: string;
    /** Iris radius as a fraction of the eyeball radius. */
    irisSize: number;
    /** Pupil radius as a fraction of the iris radius. */
    pupil: number;
    /** The coloured eyeliner ring around the eyeball. */
    rim: string;
    rimWidth: number;
    /** Upper lid resting position: 0 wide open .. 1 closed. */
    lidRest: number;
    lashes: boolean;
  };
  beak: { kind: BeakKind; size: number; color: string; shade: string; metal: number };
  feet: { color: string; size: number };
  wings: { size: number; color: string };
  crest: { kind: CrestKind; size: number; color: string; tip: string };
  glasses: boolean;
};

export const QUILL: BirdConfig = {
  id: "quill",
  name: "Quill",
  role: "The builder. Earnest, curious, sketches everything first.",
  body: { height: 1.0, width: 0.98, depth: 0.92, bottomHeavy: 0.38, pear: 0.1, faceFlat: 0.35, flatBottom: 0.55, lean: 0.06, legLength: 0.1 },
  fur: {
    length: 0.085,
    density: 230,
    clumpFreq: 22,
    clump: 0.4,
    radius: 0.32,
    comb: 0.55,
    gravity: 0.25,
    strands: 26000,
    strandLength: 1.4,
    frizz: 0.35,
    base: "#E8D3AC",
    tip: "#F7EBD4",
    belly: "#FBF3E4",
    bellyAmount: 0.7,
    face: null,
    faceAmount: 0,
    blush: "#F2A089",
    blushAmount: 0.55,
    skin: "#C9B79A",
    sheen: 0.55,
  },
  eyes: {
    size: 0.19,
    spread: 25,
    height: 0.58,
    protrude: 0.52,
    iris: "#C98A3C",
    irisDark: "#6E3F14",
    irisSize: 0.6,
    pupil: 0.56,
    rim: "#D07A3A",
    rimWidth: 0.05,
    lidRest: 0.26,
    lashes: false,
  },
  beak: { kind: "nib", size: 0.11, color: "#C9A24A", shade: "#3B2A12", metal: 0.85 },
  feet: { color: "#E2A257", size: 1.0 },
  wings: { size: 0.3, color: "#EADCC2" },
  crest: { kind: "quill", size: 0.55, color: "#F6EFE2", tip: "#C4472F" },
  glasses: false,
};

export const INK: BirdConfig = {
  id: "ink",
  name: "Ink",
  role: "The engineer. Calm, precise, quietly funny.",
  body: { height: 1.16, width: 0.9, depth: 0.9, bottomHeavy: 0.55, pear: 0.32, faceFlat: 0.3, flatBottom: 0.5, lean: 0.03, legLength: 0.11 },
  fur: {
    length: 0.062,
    density: 250,
    clumpFreq: 26,
    clump: 0.3,
    radius: 0.3,
    comb: 0.75,
    gravity: 0.35,
    strands: 18000,
    strandLength: 1.3,
    frizz: 0.15,
    base: "#2B2A30",
    tip: "#4A4852",
    belly: "#E9E2D3",
    bellyAmount: 0.85,
    face: "#EFE8DA",
    faceAmount: 0.95,
    blush: "#D98C7C",
    blushAmount: 0.3,
    skin: "#1E1D22",
    sheen: 0.75,
  },
  eyes: {
    size: 0.18,
    spread: 24,
    height: 0.6,
    protrude: 0.5,
    iris: "#7F98A8",
    irisDark: "#2C3E4C",
    irisSize: 0.6,
    pupil: 0.52,
    rim: "#5E6F7C",
    rimWidth: 0.045,
    lidRest: 0.36,
    lashes: false,
  },
  beak: { kind: "round", size: 0.1, color: "#B7895A", shade: "#4A3524", metal: 0.35 },
  feet: { color: "#B7895A", size: 1.0 },
  wings: { size: 0.3, color: "#2F2E35" },
  crest: { kind: "sleek", size: 0.42, color: "#26252B", tip: "#EFE8DA" },
  glasses: true,
};

export const CHALK: BirdConfig = {
  id: "chalk",
  name: "Chalk",
  role: "The hype. Tiny, excitable, never stops bouncing.",
  body: { height: 0.84, width: 0.96, depth: 0.96, bottomHeavy: 0.22, pear: 0.0, faceFlat: 0.25, flatBottom: 0.5, lean: 0.08, legLength: 0.085 },
  fur: {
    length: 0.11,
    density: 210,
    clumpFreq: 18,
    clump: 0.48,
    radius: 0.33,
    comb: 0.35,
    gravity: 0.18,
    strands: 32000,
    strandLength: 1.55,
    frizz: 0.6,
    base: "#E06A4E",
    tip: "#F59A78",
    belly: "#FBC9A8",
    bellyAmount: 0.75,
    face: null,
    faceAmount: 0,
    blush: "#FF8E7A",
    blushAmount: 0.4,
    skin: "#A84A36",
    sheen: 0.5,
  },
  eyes: {
    size: 0.22,
    spread: 26,
    height: 0.56,
    protrude: 0.54,
    iris: "#8A5536",
    irisDark: "#2A160C",
    irisSize: 0.66,
    pupil: 0.5,
    rim: "#B8452C",
    rimWidth: 0.05,
    lidRest: 0.05,
    lashes: true,
  },
  beak: { kind: "point", size: 0.085, color: "#F2A15A", shade: "#9A4E1E", metal: 0.1 },
  feet: { color: "#F2A15A", size: 0.92 },
  wings: { size: 0.28, color: "#D9603F" },
  crest: { kind: "tuft", size: 0.5, color: "#E8735A", tip: "#FBB79A" },
  glasses: false,
};

export const BIRDS: Record<BirdId, BirdConfig> = { quill: QUILL, ink: INK, chalk: CHALK };
