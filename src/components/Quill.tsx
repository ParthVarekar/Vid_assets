// The brand mark, in the two parts the film uses: the quill that draws, and
// the complete logo. Path data is traced from the official artwork by
// scripts/assets/trace-logo.mjs and is never redrawn by hand.

import React from "react";
import { C } from "../theme";
import {
  CRADLE_CENTRELINE,
  CRADLE_PATH,
  CRADLE_THICKNESS,
  LOGO_PATH,
  LOGO_VIEWBOX as V,
  NIB_TIP,
  QUILL_PATH,
} from "./logoPath";

const viewBox = `${V.x} ${V.y} ${V.w} ${V.h}`;

/** Geometry of the mark when drawn `height` pixels tall, centred on (cx, cy). */
export const markGeometry = (cx: number, cy: number, height: number) => {
  const scale = height / V.h;
  const left = cx - (V.w * scale) / 2;
  const top = cy - height / 2;
  const toFrame = (p: { x: number; y: number }) => ({
    x: left + (p.x - V.x) * scale,
    y: top + (p.y - V.y) * scale,
  });
  return {
    scale,
    left,
    top,
    width: V.w * scale,
    height,
    nib: toFrame(NIB_TIP),
    cradle: CRADLE_CENTRELINE.map(toFrame),
    cradleThickness: CRADLE_THICKNESS * scale,
    toFrame,
  };
};

/**
 * The quill, placed so the tip of its nib is exactly at (x, y).
 * `size` is the height the whole logo would have at this scale, so a quill
 * drawn at a given size docks into a logo of the same size without a jump.
 */
export const Quill: React.FC<{
  x: number;
  y: number;
  size: number;
  rotate?: number;
  lift?: number;
  color?: string;
  opacity?: number;
  shadow?: boolean;
}> = ({ x, y, size, rotate = 0, lift = 0, color = C.ink, opacity = 1, shadow = true }) => {
  if (opacity <= 0.001) return null;
  const scale = size / V.h;
  const nx = (NIB_TIP.x - V.x) * scale;
  const ny = (NIB_TIP.y - V.y) * scale;
  const s = size / 168;
  return (
    <svg
      viewBox={viewBox}
      width={V.w * scale}
      height={size}
      style={{
        position: "absolute",
        left: x - nx,
        top: y - ny - lift,
        overflow: "visible",
        opacity,
        rotate: `${rotate}deg`,
        transformOrigin: `${nx}px ${ny}px`,
        filter: shadow
          ? `drop-shadow(${(5 + lift * 0.55) * s}px ${(8 + lift * 1.05) * s}px ${(6 + lift * 0.7) * s}px rgba(52, 38, 24, ${Math.max(0.08, 0.24 - lift * 0.004)}))`
          : undefined,
      }}
    >
      <path d={QUILL_PATH} fill={color} fillRule="evenodd" />
    </svg>
  );
};

/** The complete official mark. */
export const LogoMark: React.FC<{
  height: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ height, color = C.ink, style }) => (
  <svg viewBox={viewBox} width={(V.w / V.h) * height} height={height} style={style}>
    <path d={LOGO_PATH} fill={color} fillRule="evenodd" />
  </svg>
);

/**
 * The cradle stroke, written on from its left tip to its right end.
 * `draw` runs 0 to 1. Positioned by the same geometry as `markGeometry`.
 */
export const Cradle: React.FC<{
  cx: number;
  cy: number;
  height: number;
  draw: number;
  color: string;
  id?: string;
}> = ({ cx, cy, height, draw, color, id = "cradle" }) => {
  if (draw <= 0.001) return null;
  const g = markGeometry(cx, cy, height);
  const line = CRADLE_CENTRELINE.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  const maskId = `write-${id}`;
  return (
    <svg
      viewBox={viewBox}
      width={g.width}
      height={g.height}
      style={{ position: "absolute", left: g.left, top: g.top, overflow: "visible" }}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={V.x - 80} y={V.y - 80} width={V.w + 160} height={V.h + 160}>
          <path
            d={line}
            fill="none"
            stroke="#fff"
            strokeWidth={CRADLE_THICKNESS * 2.1}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={`${Math.min(1, draw).toFixed(5)} 2`}
          />
        </mask>
      </defs>
      <path d={CRADLE_PATH} fill={color} fillRule="evenodd" mask={draw >= 0.999 ? undefined : `url(#${maskId})`} />
    </svg>
  );
};
