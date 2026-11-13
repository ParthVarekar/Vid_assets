// Geometry for the line. A line is described as waypoints; these helpers turn
// waypoints into an SVG path, optionally with the unsteadiness of a hand, and
// answer "where is the tip when this much has been drawn".

import { getLength, getPointAtLength, getTangentAtLength } from "@remotion/paths";
import { EASE, mix } from "../animations/ease";
import { noise1 } from "./rng";

export type Pt = { x: number; y: number; r?: number };

const n2 = (v: number): string => v.toFixed(2);

// The library returns null for a degenerate path; fall back to harmless values.
const pointAt = (d: string, s: number): { x: number; y: number } =>
  getPointAtLength(d, s) ?? { x: 0, y: 0 };
const tangentAt = (d: string, s: number): { x: number; y: number } =>
  getTangentAtLength(d, s) ?? { x: 1, y: 0 };

/** Polyline with rounded corners. A point's own `r` overrides `radius`. */
export const roundedPath = (pts: Pt[], radius = 0): string => {
  if (pts.length < 2) return "";
  let d = `M ${n2(pts[0].x)} ${n2(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const p = pts[i];
    const b = pts[i + 1];
    const da = Math.hypot(p.x - a.x, p.y - a.y);
    const db = Math.hypot(b.x - p.x, b.y - p.y);
    const k = Math.min(p.r ?? radius, da / 2, db / 2);
    if (k < 0.5 || da < 0.01 || db < 0.01) {
      d += ` L ${n2(p.x)} ${n2(p.y)}`;
      continue;
    }
    const inX = p.x + ((a.x - p.x) / da) * k;
    const inY = p.y + ((a.y - p.y) / da) * k;
    const outX = p.x + ((b.x - p.x) / db) * k;
    const outY = p.y + ((b.y - p.y) / db) * k;
    d += ` L ${n2(inX)} ${n2(inY)} Q ${n2(p.x)} ${n2(p.y)} ${n2(outX)} ${n2(outY)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L ${n2(last.x)} ${n2(last.y)}`;
};

/** Smooth curve through every point (Catmull-Rom converted to cubic Béziers). */
export const smoothPath = (pts: Pt[]): string => {
  if (pts.length < 2) return "";
  let d = `M ${n2(pts[0].x)} ${n2(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${n2(c1x)} ${n2(c1y)} ${n2(c2x)} ${n2(c2y)} ${n2(p2.x)} ${n2(p2.y)}`;
  }
  return d;
};

/**
 * Redraws an exact path as if by hand: resampled, then pushed sideways by
 * smooth noise. The offset tapers to zero at both ends so a hand-drawn line
 * still meets the next scene's line exactly at the frame edge.
 */
export const wobblePath = (
  exact: string,
  amplitude: number,
  seed: number,
  step = 14,
  period = 44,
): string => {
  if (amplitude <= 0.01) return exact;
  const length = getLength(exact);
  const count = Math.max(2, Math.ceil(length / step));
  const pts: Pt[] = [];
  for (let i = 0; i <= count; i++) {
    // Stay just inside the path: the library returns null exactly at its end.
    const s = Math.min(length - 0.02, Math.max(0.02, (length * i) / count));
    const p = pointAt(exact, s);
    const t = tangentAt(exact, s);
    const tl = Math.hypot(t.x, t.y) || 1;
    const taper = Math.max(0, Math.min(1, s / 80, (length - s) / 80));
    const offset =
      (noise1(s / period, seed) * 0.6 + noise1(s / (period * 4.3), seed + 17)) * amplitude * taper;
    pts.push({ x: p.x + (-t.y / tl) * offset, y: p.y + (t.x / tl) * offset });
  }
  return smoothPath(pts);
};

/** Fraction of total polyline length at each waypoint, from 0 to 1. */
export const waypointFractions = (pts: Pt[]): number[] => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  const total = cum[cum.length - 1] || 1;
  return cum.map((c) => c / total);
};

/** A stop says: at `frame`, the tip of the line is at waypoint `point`. */
export type Stop = { frame: number; point: number; ease?: (t: number) => number };

/** How much of the line is drawn at `frame`, from 0 to 1. */
export const progressAt = (frame: number, stops: Stop[], fractions: number[]): number => {
  const frac = (point: number): number => {
    const i = Math.max(0, Math.min(fractions.length - 1, Math.floor(point)));
    const j = Math.min(fractions.length - 1, i + 1);
    return mix(fractions[i], fractions[j], point - i);
  };
  if (frame <= stops[0].frame) return frac(stops[0].point);
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (frame <= b.frame) {
      const span = Math.max(1, b.frame - a.frame);
      const t = (b.ease ?? EASE.pen)((frame - a.frame) / span);
      return mix(frac(a.point), frac(b.point), t);
    }
  }
  return frac(stops[stops.length - 1].point);
};

export type Head = { x: number; y: number; angle: number };

/** Position and heading of the tip when `progress` of the path is drawn. */
export const headAt = (d: string, progress: number): Head => {
  const length = getLength(d);
  const s = Math.max(0, Math.min(length, length * progress));
  const p = pointAt(d, s);
  const t = tangentAt(d, Math.max(0.01, Math.min(length - 0.01, s)));
  return { x: p.x, y: p.y, angle: (Math.atan2(t.y, t.x) * 180) / Math.PI };
};

export const pathLength = (d: string): number => getLength(d);
