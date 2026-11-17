// Turns a clip into a full pose for a bird at a frame: keyed values, plus the
// behaviour layers (blink, breathing, talk, wind) and secondary motion
// (follow-through on crest, fur and wings). Pure: same clip + frame, same pose.

import { hash, noise1 } from "../../utilities/rng";
import type { RigValues } from "../rig/schema";
import { sampleBirdKeys, sampleKeys, type Clip, type Track } from "./clip";

export type Secondary = {
  /** Extra crest rotation, radians (pitch back/forward, roll sideways). */
  crestPitch: number;
  crestRoll: number;
  /** World-space push on the fur tips (wind + follow-through). */
  wind: [number, number, number];
  /** Extra wing raise from follow-through. */
  wingLag: number;
};

export type BirdFrame = { values: RigValues; secondary: Secondary };

/**
 * Damped spring that chases a signal. Simulated from N frames back each time,
 * starting at rest, so the result depends only on the frame (no state).
 * Returns follower minus signal ("lag").
 */
const springLag = (signal: (f: number) => number, frame: number, hz: number, zeta: number, back = 45) => {
  const steps = 4;
  const dt = 1 / 30 / steps;
  const w = 2 * Math.PI * hz;
  let p = signal(frame - back);
  let v = 0;
  for (let f = frame - back; f < frame; f++) {
    for (let s = 0; s < steps; s++) {
      const target = signal(f + s / steps);
      const a = -w * w * (p - target) - 2 * zeta * w * v;
      v += a * dt;
      p += v * dt;
    }
  }
  return p - signal(frame);
};

/** Natural blinking: every 2.5-5 s, sometimes a double blink. */
const blinkAt = (f: number, seed: number) => {
  let next = 20 + hash(0, seed) * 60;
  let i = 0;
  while (next + 16 < f && i < 2000) {
    i++;
    next += 75 + hash(i, seed) * 75;
  }
  const d = f - next;
  const one = d >= 0 && d < 7 ? Math.sin((d / 7) * Math.PI) : 0;
  const two = hash(i, seed + 2) > 0.8 && d >= 9 && d < 16 ? Math.sin(((d - 9) / 7) * Math.PI) : 0;
  return Math.max(one, two);
};

/** Beak flapping for talk: syllables at ~5 per second with varied openness. */
const talkAt = (f: number, seed: number) => {
  const syll = Math.abs(Math.sin((f / 30) * Math.PI * 5 + noise1(f * 0.11, seed) * 1.2));
  const amp = 0.45 + 0.55 * Math.max(0, noise1(f * 0.21, seed + 4) * 0.5 + 0.5);
  return syll * amp;
};

export const evaluateBird = (clip: Clip, birdId: string, frame: number, seed = 1): BirdFrame => {
  const v = sampleBirdKeys(clip, birdId, frame);
  const track: Track = clip.tracks[birdId] ?? {};
  const ch = (id: string, fallback: number) => (f: number) => sampleKeys(track[id], f, fallback);

  // Behaviour layers.
  if (v.autoBlink > 0.5) {
    const b = blinkAt(frame, seed * 131 + 7);
    v.blinkL = Math.max(v.blinkL, b);
    v.blinkR = Math.max(v.blinkR, b);
  }
  if (v.breathe > 0) {
    const b = Math.sin(frame * 0.09 + seed);
    v.stretch += b * 0.012 * v.breathe;
    v.fluff += b * 0.018 * v.breathe;
  }
  if (v.talk > 0) v.beakOpen = Math.max(v.beakOpen, Math.min(1, talkAt(frame, seed * 17 + 3) * v.talk));

  // Secondary motion from how the body moves.
  const j = v.jiggle;
  let crestPitch = 0;
  let crestRoll = 0;
  let wx = 0;
  let wy = 0;
  let wingLag = 0;
  if (j > 0) {
    const lagY = springLag(ch("y", 0), frame, 2.2, 0.28);
    const lagX = springLag(ch("x", 0), frame, 1.8, 0.3);
    const lagLean = springLag(ch("lean", 0), frame, 2.0, 0.3);
    const lagTilt = springLag(ch("tilt", 0), frame, 2.0, 0.3);
    const lagS = springLag(ch("stretch", 0), frame, 3.0, 0.25);
    crestPitch = j * (lagY * 1.4 - lagLean * 0.018 - lagS * 0.8);
    crestRoll = j * (lagTilt * 0.02 + lagX * 0.9);
    wx = j * lagX * 1.2;
    wy = j * (lagY * 1.6 + lagS * 0.6);
    wingLag = j * -lagY * 0.9;
  }
  if (v.wind > 0) {
    const g = 0.6 + 0.4 * noise1(frame / 18, seed + 31);
    wx += v.wind * 0.55 * g;
    crestRoll += v.wind * 0.18 * g + v.wind * 0.06 * Math.sin(frame * 0.7);
  }
  return { values: v, secondary: { crestPitch, crestRoll, wind: [wx, wy, 0], wingLag } };
};
