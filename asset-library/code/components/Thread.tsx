// The line. One continuous stroke that runs through the whole film: red chalk
// and slightly unsteady while it is only an idea, exact once it is engineered.

import React, { useMemo } from "react";
import { useVideoConfig } from "remotion";
import { C } from "../theme";
import {
  headAt,
  progressAt,
  roundedPath,
  smoothPath,
  waypointFractions,
  wobblePath,
  type Head,
  type Pt,
  type Stop,
} from "../utilities/path";

export type ThreadGeometry = {
  /** Path as drawn (with wobble applied, if any). */
  d: string;
  /** Fraction of the line's length at each waypoint. */
  fractions: number[];
};

/** Builds the line's path from waypoints. Memoised: the path only changes
 *  when the layout or the wobble does, not every frame. */
export const useThread = (
  points: Pt[],
  options: { radius?: number; wobble?: number; seed?: number; smooth?: boolean } = {},
): ThreadGeometry => {
  const { radius = 26, wobble = 0, seed = 1, smooth = false } = options;
  const key = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.r ?? ""}`).join("|");
  return useMemo(() => {
    const exact = smooth ? smoothPath(points) : roundedPath(points, radius);
    return {
      d: wobblePath(exact, wobble, seed),
      fractions: waypointFractions(points),
    };
    // `key` captures the points; listing the array itself would rebuild every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, radius, wobble, seed, smooth]);
};

/** Where the tip of the line is at `frame`, given its stops. */
export const useThreadHead = (
  geometry: ThreadGeometry,
  stops: Stop[],
  frame: number,
): { progress: number; head: Head } => {
  const progress = progressAt(frame, stops, geometry.fractions);
  const head = useMemo(() => headAt(geometry.d, progress), [geometry.d, progress]);
  return { progress, head };
};

/**
 * Draws the line from `from` to `to` (fractions of its length).
 * `chalk` from 0 to 1 roughens the stroke like chalk dragged over paper tooth;
 * the texture is anchored to the frame, so it belongs to the paper.
 */
export const ThreadStroke: React.FC<{
  d: string;
  to: number;
  from?: number;
  width: number;
  color?: string;
  chalk?: number;
  opacity?: number;
  id?: string;
}> = ({ d, to, from = 0, width, color = C.sanguine, chalk = 0, opacity = 1, id = "thread" }) => {
  const { width: w, height: h } = useVideoConfig();
  const visible = Math.max(0, to - from);
  if (visible < 0.0004 || opacity <= 0.001) return null;
  const filterId = `chalk-${id}`;
  return (
    <svg
      width={w}
      height={h}
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity }}
    >
      {chalk > 0.01 ? (
        <defs>
          <filter
            id={filterId}
            filterUnits="userSpaceOnUse"
            x={-80}
            y={-80}
            width={w + 160}
            height={h + 160}
          >
            <feTurbulence type="fractalNoise" baseFrequency={0.82} numOctaves={2} seed={5} result="tooth" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="tooth"
              scale={3.4 * chalk}
              xChannelSelector="R"
              yChannelSelector="G"
              result="rough"
            />
            <feColorMatrix
              in="tooth"
              type="matrix"
              values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${(-3.4 * chalk).toFixed(3)} 0 0 0 ${(1 + 1.75 * chalk).toFixed(3)}`}
              result="gaps"
            />
            <feComposite in="rough" in2="gaps" operator="in" />
          </filter>
        </defs>
      ) : null}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={`${visible.toFixed(5)} 2`}
        strokeDashoffset={(-from).toFixed(5)}
        filter={chalk > 0.01 ? `url(#${filterId})` : undefined}
      />
    </svg>
  );
};

/**
 * A lighter hand-drawn stroke for the secondary marks of a sketch.
 * `draw` runs from 0 to 1.
 */
export const SketchStroke: React.FC<{
  points: Pt[];
  draw: number;
  width: number;
  seed: number;
  wobble?: number;
  radius?: number;
  closed?: boolean;
  color?: string;
  opacity?: number;
}> = ({ points, draw, width, seed, wobble = 2.4, radius = 6, closed = false, color = C.sanguine, opacity = 0.9 }) => {
  const key = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("|");
  const d = useMemo(() => {
    const pts = closed ? [...points, points[0]] : points;
    return wobblePath(roundedPath(pts, radius), wobble, seed, 9, 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, wobble, seed, radius, closed]);
  if (draw <= 0.001) return null;
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={`${Math.min(1, draw).toFixed(5)} 2`}
      opacity={opacity}
    />
  );
};
