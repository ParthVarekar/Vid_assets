// Timing helpers. The film's motion character is "fast in, settle, hold":
// exponential ease-out on arrivals, no bounce on type.

import { Easing, interpolate, interpolateColors } from "remotion";

export const EASE = {
  /** Arrivals: quick start, long settle. */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  /** Softer arrival for large objects. */
  soft: Easing.bezier(0.33, 1, 0.68, 1),
  /** Camera moves and travel along the line. */
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  /** Pen strokes: gentle start, confident finish. */
  pen: Easing.bezier(0.45, 0, 0.2, 1),
  /** Departures. */
  in: Easing.bezier(0.6, 0, 0.9, 0.3),
  linear: Easing.linear,
} as const;

/** 0 to 1 between `start` and `start + duration`, clamped. */
export const tween = (
  frame: number,
  start: number,
  duration: number,
  easing: (t: number) => number = EASE.out,
): number =>
  interpolate(frame, [start, start + Math.max(1, duration)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

/** 0 to 1 and back to 0: in over `fadeIn`, out over `fadeOut` ending at `end`. */
export const window01 = (
  frame: number,
  start: number,
  end: number,
  fadeIn = 8,
  fadeOut = 8,
): number => Math.min(tween(frame, start, fadeIn), 1 - tween(frame, end - fadeOut, fadeOut, EASE.in));

export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export const mixColor = (a: string, b: string, t: number): string =>
  interpolateColors(clamp01(t), [0, 1], [a, b]);

/** A short pulse that peaks at `at` and decays over `decay` frames. */
export const pulse = (frame: number, at: number, decay = 14): number => {
  if (frame < at) return 0;
  return Math.exp(-(frame - at) / (decay / 3));
};
