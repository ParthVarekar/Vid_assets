// Shared scene plumbing.

import { useCurrentFrame } from "remotion";
import { mix } from "../animations/ease";
import { PRE, PUSH } from "../timeline";
import type { Layout } from "../utilities/layout";
import type { Head } from "../utilities/path";

/**
 * Frame local to the scene: 0 is the scene's bar line. Scenes are mounted
 * PRE frames early so they can already be moving while the camera arrives,
 * so this can be negative.
 */
export const useSceneFrame = (): number => useCurrentFrame() - PRE;

/** Slow lateral creep so no hold is a frozen frame. Lateral only: the line's
 *  height at the frame edges must not change, or scenes would not join. */
export const driftX = (f: number, length: number, amount: number): number =>
  mix(amount, -amount, (f + PRE) / (length + PUSH));

// The climb out of the Scale scene. Scale draws it and Proof has to pick the
// line up at exactly the same slope, so both read the shape from here.
export const CLIMB_K = 2.7;
export const climbStartX = (L: Layout): number =>
  L.format === "wide" ? L.stage.x - 40 * L.u : L.margin * 1.2;
/** Rise over run of the line as it passes through the top-right corner. */
export const climbSlope = (L: Layout): number =>
  (L.threadY * CLIMB_K * Math.exp(CLIMB_K)) / (Math.exp(CLIMB_K) - 1) / (L.w - climbStartX(L));

/** How the quill leans as it draws: a little into the direction of travel. */
export const quillLean = (head: Head, moving: number): number =>
  (Math.sin((head.angle * Math.PI) / 180) * 7 - 3) * moving;

/** A small breathing motion for a quill at rest. */
export const idleBob = (f: number, amount: number): number =>
  (1 - Math.cos(f * 0.085)) * 0.5 * amount;
