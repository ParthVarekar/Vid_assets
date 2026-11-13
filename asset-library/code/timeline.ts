// The single clock for picture and sound.
//
// Everything is written in bars and beats of a 100 BPM score. At 30 fps that
// makes one beat exactly 18 frames and one bar exactly 72 frames, so every
// event lands on a whole frame. The audio renderer in scripts/audio imports
// this same file, which keeps sync exact by construction.
//
// Keep this file free of imports and of non-erasable TypeScript syntax: Node
// loads it directly when rendering the score.

export const FPS = 30;
export const BPM = 100;
export const BEAT = 18;
export const BAR = 72;

/** Frame offset of bar `barNo`, beat `beat` (both 1-based), plus `f` frames. */
export const at = (barNo: number, beat = 1, f = 0): number =>
  (barNo - 1) * BAR + (beat - 1) * BEAT + f;

/** Length of the camera move between scenes, centred on the bar line. */
export const PUSH = 24;
export const PRE = PUSH / 2;

// ---------------------------------------------------------------------------
// Master film: 25 bars, 1,800 frames, 60.0 seconds.
// ---------------------------------------------------------------------------

export const SCENES = {
  hook: { from: at(1), to: at(4), folio: "01", label: "an idea" },
  build: { from: at(4), to: at(11), folio: "02", label: "build" },
  automate: { from: at(11), to: at(16), folio: "03", label: "automate" },
  scale: { from: at(16), to: at(20), folio: "04", label: "scale" },
  proof: { from: at(20), to: at(22), folio: "05", label: "shipped" },
  reveal: { from: at(22), to: at(26), folio: "06", label: "protovinci" },
} as const;

export type SceneId = keyof typeof SCENES;
export const SCENE_ORDER: SceneId[] = ["hook", "build", "automate", "scale", "proof", "reveal"];
export const TOTAL_FRAMES = at(26);

// ---------------------------------------------------------------------------
// Event tables. Frames are local to each scene (0 = the scene's bar line).
// The scenes animate from these, and the score places its hits from them.
// ---------------------------------------------------------------------------

/** Scene 1, bars 1-3. */
export const HOOK = {
  quillIn: 0,
  touch: at(1, 2),
  line1: at(1, 2),
  lineStagger: BEAT,
  // The sentence is left clear to be read before the quill sweeps under it.
  underlineFrom: at(2, 3),
  underlineTo: at(3, 1, 6),
  note: at(3, 1),
  runFrom: at(3, 1, 6),
  runTo: at(4, 1, PRE),
};

/** Scene 2, bars 4-10 (local bar 1 = film bar 4). The snap is local bar 3. */
export const BUILD = {
  threadIn: -PRE,
  reachWindow: at(1, 2),
  sketchDone: at(2, 4),
  note: at(1, 2),
  secondaryFrom: at(1, 3),
  /** Speed of the secondary sketch marks; below 1 compresses them. */
  sketchRate: 1,
  hush: at(2, 4, 9),
  snap: at(3, 1),
  word: at(3, 1),
  caption: at(3, 2),
  nav: at(3, 3),
  headline: at(3, 4),
  subcopy: at(4, 1),
  button: at(4, 2),
  image: at(4, 3),
  click: at(4, 4),
  fig2: at(4, 1),
  phone: at(5, 1),
  fig3: at(5, 2),
  dashboard: at(6, 1),
  rows: at(6, 2),
  chart: at(6, 3),
  fig4: at(6, 3),
  leaveFrom: at(7, 1),
  leaveTo: at(8, 1, PRE),
};

/** Scene 3, bars 11-15. */
export const AUTOMATE = {
  threadIn: -PRE,
  word: at(1, 1),
  caption: at(1, 2),
  threadAcross: at(2, 3),
  nodes: [at(1, 3), at(1, 4), at(2, 1), at(2, 2)],
  branches: [at(2, 3), at(2, 4)],
  packetsFrom: at(2, 2),
  agentOpen: at(3, 1),
  agentLines: [at(3, 2), at(3, 3), at(3, 4)],
  agentClose: at(4, 1),
  tasks: [at(4, 1), at(4, 2), at(4, 3), at(4, 4)],
  leaveFrom: at(5, 1),
  leaveTo: at(6, 1, PRE),
};

/** Scene 4, bars 16-19. */
export const SCALE = {
  threadIn: -PRE,
  word: at(1, 1),
  caption: at(1, 2),
  steps: [at(1, 1), at(2, 1), at(3, 1), at(4, 1)],
  climbFrom: at(1, 3),
  climbTo: at(5, 1, PRE),
};

/** Scene 5, bars 20-21. */
export const PROOF = {
  threadIn: -PRE,
  headline: at(1, 1, 4),
  sub: at(1, 3),
  cards: at(1, 1),
  leaveFrom: at(2, 2),
  leaveTo: at(3, 1, PRE),
};

/** Scene 6, bars 22-25. The mark lands on local bar 2 (film bar 23). */
export const REVEAL = {
  threadIn: -PRE,
  /** The line reaches the tip of the cradle and starts writing it. */
  reachTip: at(1, 3),
  /** The cradle is complete; the quill lifts. */
  cradleTo: at(1, 4, 9),
  /** The quill docks: the logo is whole. The score's biggest hit. */
  land: at(2, 1),
  wordmark: at(2, 1, 3),
  tagline: at(2, 3),
  moveUp: at(3, 1),
  // After the lockup has cleared the space it rises into.
  cta: at(3, 2),
  underline: at(3, 3),
  url: at(3, 3, 9),
  foot: at(3, 4, 9),
};

// ---------------------------------------------------------------------------
// 15-second cutdown: 6.25 bars, 450 frames.
// ---------------------------------------------------------------------------

export const CUT_SCENES = {
  hook: { from: at(1), to: at(2), folio: "01", label: "an idea" },
  build: { from: at(2), to: at(3), folio: "02", label: "build" },
  automate: { from: at(3), to: at(4), folio: "03", label: "automate" },
  scale: { from: at(4), to: at(5), folio: "04", label: "scale" },
  reveal: { from: at(5), to: at(7, 2), folio: "05", label: "protovinci" },
} as const;

export type CutSceneId = keyof typeof CUT_SCENES;
export const CUT_ORDER: CutSceneId[] = ["hook", "build", "automate", "scale", "reveal"];
export const CUT_TOTAL_FRAMES = at(7, 2);

const NEVER = 99999;

/** Cutdown event tables: the same scenes, one bar each, then the ending. */
export const CUT_HOOK: typeof HOOK = {
  quillIn: -6,
  touch: 4,
  line1: 3,
  lineStagger: 7,
  underlineFrom: 36,
  underlineTo: 56,
  note: NEVER,
  runFrom: 56,
  runTo: BAR + PRE,
};

export const CUT_BUILD: typeof BUILD = {
  threadIn: -PRE,
  reachWindow: -2,
  sketchDone: 17,
  note: NEVER,
  secondaryFrom: -6,
  sketchRate: 0.22,
  hush: 15,
  snap: at(1, 2),
  word: at(1, 2),
  caption: at(1, 2, 6),
  nav: 24,
  headline: 28,
  subcopy: 32,
  button: 36,
  image: 40,
  click: 47,
  fig2: 34,
  phone: NEVER,
  fig3: NEVER,
  dashboard: NEVER,
  rows: NEVER,
  chart: NEVER,
  fig4: NEVER,
  leaveFrom: at(1, 4),
  leaveTo: BAR + PRE,
};

export const CUT_AUTOMATE: typeof AUTOMATE = {
  threadIn: -PRE,
  word: 0,
  caption: 6,
  threadAcross: 26,
  nodes: [8, 12, 16, 20],
  branches: [22, 26],
  packetsFrom: at(1, 2),
  agentOpen: NEVER,
  agentLines: [NEVER, NEVER, NEVER],
  agentClose: NEVER,
  tasks: [NEVER, NEVER, NEVER, NEVER],
  leaveFrom: at(1, 4),
  leaveTo: BAR + PRE,
};

export const CUT_SCALE: typeof SCALE = {
  threadIn: -PRE,
  word: 0,
  caption: 6,
  steps: [0, at(1, 2), at(1, 3), at(1, 4)],
  climbFrom: 10,
  climbTo: BAR + PRE,
};

export const CUT_REVEAL: typeof REVEAL = {
  threadIn: -PRE,
  reachTip: 14,
  cradleTo: 29,
  land: at(1, 3),
  wordmark: at(1, 3, 3),
  tagline: at(1, 4),
  moveUp: at(2, 1, 4),
  cta: at(2, 2),
  underline: at(2, 3),
  url: at(2, 3, 6),
  foot: at(2, 4, 6),
};
