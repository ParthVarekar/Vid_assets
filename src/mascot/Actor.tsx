// The puppeteer. A Script says what Nib does and when; the Actor turns it into
// a Pose for every frame and adds the life automatically: blinking, breathing,
// feather sway, lip flap while talking, walk cycles, waves and hops.
//
//   const script: Script = {
//     start: { x: 300, gesture: "rest", expression: "neutral" },
//     cues: [
//       { at: 30, pose: { expression: "happy", gesture: "wave" } },
//       { at: 90, pose: { gesture: "present", expression: "proud" }, dur: 14 },
//     ],
//     walk: [{ from: 0, to: 40, toX: 820 }],
//     talk: [{ from: 50, to: 110 }],
//     wave: [{ from: 30, to: 70 }],
//     hop: [{ at: 120 }],
//   };
//   <Actor script={script} />   (inside an <svg>, e.g. a Studio stage)
//
// All frames are local to the enclosing <Sequence>.

import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { EASE } from "../animations/ease";
import { hash, noise1 } from "../utilities/rng";
import { Mascot } from "./Mascot";
import { applyPose, blendPose, GESTURES, REST, type Pose, type PoseInput } from "./rig";
import { FLOOR_Y, STAGE_H, STAGE_W, type Camera } from "./Studio";

export type Cue = {
  /** Frame at which the move starts. */
  at: number;
  /** What changes. Anything not mentioned stays as it was. */
  pose: PoseInput;
  /** Frames to get there (default 12). */
  dur?: number;
  ease?: "out" | "inOut" | "linear" | "snap";
};

export type Script = {
  start?: PoseInput;
  cues?: Cue[];
  /** Lip flap. `intensity` 0..1 (default 1). */
  talk?: Array<{ from: number; to: number; intensity?: number }>;
  /** Walk to `toX` over the range. Nib turns to face the way it walks. */
  walk?: Array<{ from: number; to: number; toX: number; fromX?: number }>;
  /** Wave the right hand. */
  wave?: Array<{ from: number; to: number }>;
  /** Little jump. */
  hop?: Array<{ at: number; height?: number }>;
  /** Nod (yes) or shake (no) the head. */
  nod?: Array<{ from: number; to: number; kind?: "yes" | "no" }>;
  /** Automatic life. Both default to true. */
  blink?: boolean;
  breathe?: boolean;
  /** Seed for blink timing etc., so two Nibs don't move in sync. */
  seed?: number;
};

const EASES = { out: EASE.out, inOut: EASE.inOut, linear: EASE.linear, snap: (t: number) => (t > 0 ? 1 : 0) };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Pose from the cue list alone (no automatic behaviour). */
export const cuePose = (script: Script, f: number): Pose => {
  const start = applyPose(REST, script.start ?? {});
  const cues = [...(script.cues ?? [])].sort((a, b) => a.at - b.at);
  let from = start;
  let target = start;
  let segStart = -1e9;
  let segDur = 1;
  let ease = EASES.out;
  for (const cue of cues) {
    if (cue.at > f) break;
    from = blendPose(from, target, ease(clamp01((cue.at - segStart) / segDur)));
    target = applyPose(target, cue.pose);
    segStart = cue.at;
    segDur = Math.max(1, cue.dur ?? 12);
    ease = EASES[cue.ease ?? "out"];
  }
  return blendPose(from, target, ease(clamp01((f - segStart) / segDur)));
};

/** Full performance at frame f: cues plus every automatic behaviour. */
export const perform = (script: Script, f: number): Pose => {
  let p = cuePose(script, f);
  const seed = script.seed ?? 1;

  // --- Walking -------------------------------------------------------------
  const walks = [...(script.walk ?? [])].sort((a, b) => a.from - b.from);
  let walkingSpeed = 0;
  let prevTo = applyPose(REST, script.start ?? {}).x;
  for (const w of walks) {
    const fromX = w.fromX ?? prevTo;
    prevTo = w.toX;
    if (f < w.from) break;
    const span = Math.max(1, w.to - w.from);
    const t = clamp01((f - w.from) / span);
    // Ease in and out of the walk so starts and stops are not abrupt.
    const xt = smooth(t);
    p = { ...p, x: fromX + (w.toX - fromX) * xt };
    const dir = Math.sign(w.toX - fromX) || 1;
    // Keep facing the walk direction afterwards, unless a later cue says otherwise.
    const overridden = (script.cues ?? []).some((c) => c.at > w.to && c.at <= f && c.pose.facing !== undefined);
    if (!overridden) p = { ...p, facing: dir };
    if (f <= w.to) {
      const phase = ((f - w.from) / 18) * Math.PI; // one step per beat (18 frames)
      const amp = Math.min(1, t * 6, (1 - t) * 6);
      walkingSpeed = amp;
      const s = Math.sin(phase);
      p = {
        ...p,
        legL: { step: p.legL.step + s * 30 * amp, lift: Math.max(0, s) * 22 * amp },
        legR: { step: p.legR.step - s * 30 * amp, lift: Math.max(0, -s) * 22 * amp },
        bounce: p.bounce - Math.abs(Math.cos(phase)) * 8 * amp + 4 * amp,
        lean: p.lean + 5 * amp,
        armL: { ...p.armL, shoulder: p.armL.shoulder - s * 16 * amp },
        armR: { ...p.armR, shoulder: p.armR.shoulder + s * 16 * amp },
      };
    }
  }

  // --- Waving --------------------------------------------------------------
  for (const w of script.wave ?? []) {
    if (f < w.from - 8 || f > w.to + 8) continue;
    const k = smooth(clamp01(Math.min((f - (w.from - 8)) / 8, (w.to + 8 - f) / 8)));
    const target = applyPose(p, GESTURES.wave as PoseInput);
    p = blendPose(p, target, k);
    p = { ...p, armR: { ...p.armR, elbow: p.armR.elbow + Math.sin((f - w.from) * 0.55) * 28 * k } };
  }

  // --- Hops ----------------------------------------------------------------
  for (const h of script.hop ?? []) {
    const t = f - h.at;
    if (t < -6 || t > 22) continue;
    const H = h.height ?? 70;
    if (t < 0) {
      // Anticipation: crouch.
      const k = smooth(clamp01((t + 6) / 6));
      p = { ...p, bounce: p.bounce + 18 * k, stretch: p.stretch - 0.1 * k };
    } else if (t <= 16) {
      const u = t / 16;
      p = { ...p, air: p.air + 4 * H * u * (1 - u), stretch: p.stretch + 0.1 * Math.sin(u * Math.PI) - (u > 0.85 ? 0.08 : 0) };
    } else {
      // Landing squash.
      const k = 1 - (t - 16) / 6;
      p = { ...p, bounce: p.bounce + 14 * k, stretch: p.stretch - 0.12 * k };
    }
  }

  // --- Nods ----------------------------------------------------------------
  for (const n of script.nod ?? []) {
    if (f < n.from || f > n.to) continue;
    const k = Math.min(1, (f - n.from) / 6, (n.to - f) / 6);
    const s = Math.sin((f - n.from) * 0.6) * k;
    p = n.kind === "no"
      ? { ...p, tilt: p.tilt + s * 7, face: { ...p.face, lookX: p.face.lookX + s * 0.5 } }
      : { ...p, face: { ...p.face, lookY: p.face.lookY + s * 0.4 }, bounce: p.bounce + Math.abs(s) * 4 };
  }

  // --- Talking -------------------------------------------------------------
  for (const t of script.talk ?? []) {
    if (f < t.from || f > t.to) continue;
    const env = Math.min(1, (f - t.from) / 3, (t.to - f) / 3);
    const syl = 0.5 + 0.5 * Math.sin(f * 1.15 + noise1(f * 0.21, seed) * 2.2);
    const open = (0.18 + 0.62 * syl * (0.6 + 0.4 * Math.abs(noise1(f * 0.13, seed + 3)))) * (t.intensity ?? 1) * env;
    p = {
      ...p,
      face: {
        ...p.face,
        mouthOpen: Math.max(p.face.mouthOpen, open),
        round: Math.max(0, Math.min(1, p.face.round + noise1(f * 0.17, seed + 9) * 0.35)),
        browRaise: p.face.browRaise + Math.max(0, noise1(f * 0.05, seed + 5)) * 0.35 * env,
      },
      tilt: p.tilt + noise1(f * 0.04, seed + 7) * 3 * env,
    };
  }

  // --- Breathing and feather -----------------------------------------------
  if (script.breathe !== false) {
    const b = Math.sin(f * 0.09 + seed);
    p = { ...p, stretch: p.stretch + b * 0.012, bounce: p.bounce + b * 1.2 };
  }
  // The feather lags behind motion and drifts on its own.
  const sway = Math.sin(f * 0.07 + seed) * 4 + noise1(f * 0.03, seed + 11) * 3 - walkingSpeed * Math.sin((f / 18) * Math.PI) * 6 - p.lean * 0.6 - p.tilt * 0.4;
  p = { ...p, plume: p.plume + sway };

  // --- Blinking ------------------------------------------------------------
  if (script.blink !== false) {
    // A blink roughly every 2.5-5 s; occasionally a double blink.
    let next = 20 + hash(0, seed) * 60;
    let i = 0;
    while (next + 12 < f && i < 500) {
      i++;
      next += 75 + hash(i, seed) * 75;
    }
    const d = f - next;
    const closed = d >= 0 && d < 7 ? Math.sin((d / 7) * Math.PI) : 0;
    const dbl = hash(i, seed + 2) > 0.8 && d >= 9 && d < 16 ? Math.sin(((d - 9) / 7) * Math.PI) : 0;
    const k = 1 - Math.max(closed, dbl);
    p = { ...p, face: { ...p.face, openL: p.face.openL * k, openR: p.face.openR * k } };
  }

  return p;
};

/**
 * A camera that follows the performer, for tall and square frames where the
 * 16:9 set is cropped. Pass the result to <Studio camera={...}>.
 *
 *   const camera = useFollowCamera(script);
 *   <Studio camera={camera}>…</Studio>
 *
 * It smooths Nib's x over +/- 10 frames so starts and stops do not jerk, keeps
 * the floor in view, and never shows past the edge of the set. In 16:9 it
 * returns the plain full-stage camera.
 */
export const useFollowCamera = (script: Script, zoomTall = 1.2): Camera => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const wide = width / height >= 16 / 9 - 0.01;
  const zoom = wide ? 1 : zoomTall;
  const scale = Math.max(width / (STAGE_W / zoom), height / (STAGE_H / zoom));
  const visW = width / scale;
  const visH = height / scale;
  if (wide) return { x: STAGE_W / 2, y: STAGE_H / 2, zoom: 1 };
  let sum = 0;
  const offsets = [-10, -5, 0, 5, 10];
  for (const o of offsets) sum += perform(script, Math.max(0, f + o)).x;
  const x = Math.max(visW / 2, Math.min(STAGE_W - visW / 2, sum / offsets.length));
  // Bottom of the view sits a little below the floor so the rug stays visible.
  const bottom = Math.min(STAGE_H, FLOOR_Y + 110);
  const y = Math.max(visH / 2, bottom - visH / 2);
  return { x, y, zoom };
};

export const Actor: React.FC<{ script: Script; id?: string }> = ({ script, id = "nib" }) => {
  const f = useCurrentFrame();
  return <Mascot pose={perform(script, f)} id={id} />;
};
