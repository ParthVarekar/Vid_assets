// Animation clips: plain JSON, one file per scene in content/episodes.
//
// {
//   "version": 1, "name": "rig-demo", "fps": 30, "duration": 180,
//   "rig": "studio",                       // light rig / time of day
//   "cast": [{ "id": "quill", "seed": 1 }],
//   "tracks": {
//     "quill":  { "y": [{ "f": 10, "v": 0 }, { "f": 18, "v": 0.6, "e": [0.2, 0, 0.4, 1] }] },
//     "camera": { "pz": [{ "f": 0, "v": 9 }] }
//   }
// }
//
// A key holds a value at a frame. The segment from a key to the next one is
// shaped by that key's interpolation: "bezier" (default) with an easing curve
// `e` = [x1, y1, x2, y2] exactly like CSS cubic-bezier(), "linear", or "step"
// (hold the value until the next key). Channels with no keys use their default.
//
// Everything is a pure function of the frame number.

import { CAMERA_BY_ID, CHANNEL_BY_ID, clampChannel, type RigValues } from "../rig/schema";
import type { BirdId } from "../characters/config";

/** Camera tracks: "camera" (the main shot camera) and "camera-9x16" (optional vertical-only camera). */
export const isCameraTrack = (t: string) => t === "camera" || t.startsWith("camera-");

export type Interp = "bezier" | "linear" | "step";
export type Key = { f: number; v: number; i?: Interp; e?: [number, number, number, number] };
export type Track = Record<string, Key[]>;
export type CastMember = { id: BirdId; seed?: number };
export type Clip = {
  version: 1;
  name: string;
  fps: number;
  duration: number;
  rig?: string;
  /** The world: "studio" (plain sweep) or "desk" (the Desk diorama). */
  set?: "studio" | "desk";
  cast: CastMember[];
  tracks: Record<string, Track>;
  /** Text and graphics drawn over the 3D scene (captions, end card, wipe, logo bug). */
  overlays?: Overlays;
  /** Optional audio for talk timing, relative to public/. */
  audio?: string | null;
  notes?: string;
};

export type Overlays = {
  /** Each caption line appears word by word from `from` (frames per word default 8). */
  captions?: Array<{ from: number; text: string; framesPerWord?: number; tone?: "paper" | "night" }>;
  /** Brand line-wipe transition centred on `at`. */
  wipe?: { at: number; to?: "paper" | "night" };
  /** Full-frame ProtoVinci end card from `from` to the end. */
  endCard?: { from: number; cta?: string; url?: string; tone?: "paper" | "night" };
  /** Small corner logo between `from` and `to`. */
  logoBug?: { from: number; to: number; corner?: "tl" | "tr" | "bl" | "br"; tone?: "paper" | "night" };
};

export const EASE_DEFAULT: [number, number, number, number] = [0.33, 0, 0.67, 1];
export const EASE_PRESETS: Record<string, [number, number, number, number]> = {
  "ease in-out": [0.33, 0, 0.67, 1],
  "ease out (decelerate)": [0.1, 0.6, 0.3, 1],
  "ease in (accelerate)": [0.6, 0, 0.9, 0.4],
  "snap (fast out, slow settle)": [0.05, 0.9, 0.2, 1],
  overshoot: [0.3, 0, 0.3, 1.35],
  anticipate: [0.4, -0.35, 0.6, 1],
};

// Cubic-bezier easing, solved for x by Newton iterations then bisection.
const bez = (t: number, a: number, b: number) => {
  const u = 1 - t;
  return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
};
const bezD = (t: number, a: number, b: number) => {
  const u = 1 - t;
  return 3 * u * u * a + 6 * u * t * (b - a) + 3 * t * t * (1 - b);
};
export const cubicBezier = (e: [number, number, number, number], x: number) => {
  const [x1, y1, x2, y2] = e;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const err = bez(t, x1, x2) - x;
    const d = bezD(t, x1, x2);
    if (Math.abs(err) < 1e-6) break;
    if (Math.abs(d) < 1e-6) break;
    t -= err / d;
  }
  if (t < 0 || t > 1 || Math.abs(bez(t, x1, x2) - x) > 1e-4) {
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      if (bez(t, x1, x2) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
  }
  return bez(t, y1, y2);
};

/** Value of a key list at a (possibly fractional) frame. */
export const sampleKeys = (keys: Key[] | undefined, frame: number, fallback: number): number => {
  if (!keys || keys.length === 0) return fallback;
  if (frame <= keys[0].f) return keys[0].v;
  const last = keys[keys.length - 1];
  if (frame >= last.f) return last.v;
  // Binary search for the segment.
  let lo = 0;
  let hi = keys.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (keys[m].f <= frame) lo = m;
    else hi = m;
  }
  const a = keys[lo];
  const b = keys[hi];
  const i = a.i ?? "bezier";
  if (i === "step") return a.v;
  const x = (frame - a.f) / (b.f - a.f);
  const y = i === "linear" ? x : cubicBezier(a.e ?? EASE_DEFAULT, x);
  return a.v + (b.v - a.v) * y;
};

/** Raw keyed values of one bird (no behaviours), clamped to the rig ranges. */
export const sampleBirdKeys = (clip: Clip, bird: string, frame: number): RigValues => {
  const track = clip.tracks[bird] ?? {};
  const out: RigValues = {};
  for (const id in CHANNEL_BY_ID) out[id] = clampChannel(id, sampleKeys(track[id], frame, CHANNEL_BY_ID[id].default));
  return out;
};

export const sampleCamera = (clip: Clip, frame: number, name = "camera"): RigValues => {
  const track = clip.tracks[name] ?? {};
  const out: RigValues = {};
  for (const id in CAMERA_BY_ID) out[id] = sampleKeys(track[id], frame, CAMERA_BY_ID[id].default);
  return out;
};

// ---------------------------------------------------------------------------
// Pure editing helpers (the editor uses these; LLM scripts can too).
// ---------------------------------------------------------------------------

const sortKeys = (k: Key[]) => k.sort((a, b) => a.f - b.f);

export const setKey = (clip: Clip, track: string, channel: string, key: Key): Clip => {
  const t = { ...(clip.tracks[track] ?? {}) };
  const keys = (t[channel] ?? []).filter((k) => k.f !== key.f);
  const prev = (t[channel] ?? []).find((k) => k.f === key.f);
  keys.push({ ...prev, ...key });
  t[channel] = sortKeys(keys);
  return { ...clip, tracks: { ...clip.tracks, [track]: t } };
};

export const deleteKeys = (clip: Clip, sel: Array<{ track: string; channel: string; f: number }>): Clip => {
  const tracks = { ...clip.tracks };
  for (const s of sel) {
    const t = { ...(tracks[s.track] ?? {}) };
    t[s.channel] = (t[s.channel] ?? []).filter((k) => k.f !== s.f);
    if (t[s.channel].length === 0) delete t[s.channel];
    tracks[s.track] = t;
  }
  return { ...clip, tracks };
};

/** Move keys by a frame offset (keys landing on an existing frame replace it). */
export const shiftKeys = (clip: Clip, sel: Array<{ track: string; channel: string; f: number }>, df: number): Clip => {
  if (df === 0) return clip;
  const tracks: Record<string, Track> = JSON.parse(JSON.stringify(clip.tracks));
  const moving = sel.map((s) => ({ s, k: tracks[s.track]?.[s.channel]?.find((k) => k.f === s.f) })).filter((m) => m.k);
  for (const m of moving) tracks[m.s.track][m.s.channel] = tracks[m.s.track][m.s.channel].filter((k) => k !== m.k);
  for (const m of moving) {
    const nf = Math.max(0, m.k!.f + df);
    const list = tracks[m.s.track][m.s.channel].filter((k) => k.f !== nf);
    list.push({ ...m.k!, f: nf });
    tracks[m.s.track][m.s.channel] = sortKeys(list);
  }
  return { ...clip, tracks };
};

export const emptyClip = (name: string, cast: CastMember[] = [{ id: "quill", seed: 1 }]): Clip => ({
  version: 1,
  name,
  fps: 30,
  duration: 180,
  rig: "studio",
  cast,
  tracks: {},
});

/**
 * JSON for saving: readable and diff-friendly (one key per line, channels in
 * schema order), so git diffs show exactly which keys changed.
 */
export const formatClip = (clip: Clip): string => {
  const r = (n: number) => Math.round(n * 10000) / 10000;
  const key = (k: Key) => {
    const o: Record<string, unknown> = { f: k.f, v: r(k.v) };
    if (k.i && k.i !== "bezier") o.i = k.i;
    if (k.e) o.e = k.e.map(r);
    return JSON.stringify(o).replace(/,/g, ", ").replace(/:/g, ": ");
  };
  const order = (track: string) => Object.keys(isCameraTrack(track) ? CAMERA_BY_ID : CHANNEL_BY_ID);
  const lines: string[] = ["{"];
  const head = { version: clip.version, name: clip.name, fps: clip.fps, duration: clip.duration, set: clip.set ?? "studio", rig: clip.rig ?? "studio" };
  for (const [k, v] of Object.entries(head)) lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  if (clip.audio) lines.push(`  "audio": ${JSON.stringify(clip.audio)},`);
  if (clip.notes) lines.push(`  "notes": ${JSON.stringify(clip.notes)},`);
  if (clip.overlays) lines.push(`  "overlays": ${JSON.stringify(clip.overlays)},`);
  lines.push(`  "cast": ${JSON.stringify(clip.cast).replace(/,"/g, ', "').replace(/:/g, ": ").replace(/\},\{/g, "}, {")},`);
  lines.push('  "tracks": {');
  const tracks = Object.entries(clip.tracks).filter(([, t]) => Object.keys(t).length);
  tracks.forEach(([tn, t], ti) => {
    lines.push(`    ${JSON.stringify(tn)}: {`);
    const chans = order(tn).filter((c) => t[c]?.length);
    chans.forEach((c, ci) => {
      lines.push(`      ${JSON.stringify(c)}: [`);
      t[c].forEach((k, kk) => lines.push(`        ${key(k)}${kk < t[c].length - 1 ? "," : ""}`));
      lines.push(`      ]${ci < chans.length - 1 ? "," : ""}`);
    });
    lines.push(`    }${ti < tracks.length - 1 ? "," : ""}`);
  });
  lines.push("  }", "}", "");
  return lines.join("\n");
};

/** Basic validation, so hand-edited or LLM-written JSON fails loudly. */
export const validateClip = (c: unknown): string[] => {
  const errs: string[] = [];
  const clip = c as Clip;
  if (!clip || typeof clip !== "object") return ["not an object"];
  if (clip.version !== 1) errs.push("version must be 1");
  if (!(clip.fps > 0)) errs.push("fps must be > 0");
  if (!(clip.duration > 0)) errs.push("duration must be > 0");
  if (!Array.isArray(clip.cast)) errs.push("cast must be an array");
  for (const [tn, t] of Object.entries(clip.tracks ?? {})) {
    const known = isCameraTrack(tn) ? CAMERA_BY_ID : CHANNEL_BY_ID;
    for (const [ch, keys] of Object.entries(t)) {
      if (!known[ch]) errs.push(`${tn}.${ch}: unknown channel`);
      if (!Array.isArray(keys)) errs.push(`${tn}.${ch}: keys must be an array`);
      else
        keys.forEach((k, i) => {
          if (typeof k.f !== "number" || typeof k.v !== "number") errs.push(`${tn}.${ch}[${i}]: needs numeric f and v`);
          if (i > 0 && k.f <= keys[i - 1].f) errs.push(`${tn}.${ch}[${i}]: frames must increase`);
        });
    }
  }
  return errs;
};
