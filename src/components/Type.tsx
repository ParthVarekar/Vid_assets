// Typography in motion. One family (Switzer) in two weights, plus Geist Mono
// for labels. Words arrive by rising through a mask and settle; nothing
// bounces.

import React from "react";
import { EASE, tween } from "../animations/ease";
import { C, FONT, TRACK } from "../theme";

/** Reveals its children by sliding them up from behind a mask. */
export const Rise: React.FC<{
  f: number;
  at: number;
  out?: number;
  duration?: number;
  block?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ f, at, out, duration = 17, block = true, style, children }) => {
  const tIn = tween(f, at - 1, duration, EASE.out);
  const tOut = out === undefined ? 0 : tween(f, out, 11, EASE.in);
  return (
    <span
      style={{
        display: block ? "block" : "inline-block",
        overflow: "hidden",
        // Room for descenders and apostrophes inside the mask.
        paddingTop: "0.08em",
        paddingBottom: "0.2em",
        marginTop: "-0.08em",
        marginBottom: "-0.2em",
        verticalAlign: "top",
        ...style,
      }}
    >
      <span
        style={{
          display: "block",
          // Only something that has arrived can leave. Without this, an element
          // whose exit passes before its entrance would sit at rest, visible.
          translate: `0 ${(tIn >= 1 && tOut > 0 ? -tOut * 118 : (1 - tIn) * 118).toFixed(3)}%`,
        }}
      >
        {children}
      </span>
    </span>
  );
};

/** A statement set in Switzer Semibold, one masked line after another. */
export const Headline: React.FC<{
  lines: React.ReactNode[];
  f: number;
  at: number;
  out?: number;
  size: number;
  stagger?: number;
  color?: string;
  weight?: number;
  lineHeight?: number;
  tracking?: string;
  align?: "left" | "center";
  style?: React.CSSProperties;
}> = ({
  lines,
  f,
  at,
  out,
  size,
  stagger = 5,
  color = C.ink,
  weight = 600,
  lineHeight = 1.0,
  tracking = TRACK.display,
  align = "left",
  style,
}) => (
  <div
    style={{
      fontFamily: FONT.sans,
      fontWeight: weight,
      fontSize: size,
      lineHeight,
      letterSpacing: tracking,
      color,
      textAlign: align,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {lines.map((line, i) => (
      <Rise key={i} f={f} at={at + i * stagger} out={out === undefined ? undefined : out + i * 2}>
        {line}
      </Rise>
    ))}
  </div>
);

/** Mono label, as in a notebook margin. */
export const Mono: React.FC<{
  children: React.ReactNode;
  size: number;
  color?: string;
  wide?: boolean;
  upper?: boolean;
  weight?: number;
  style?: React.CSSProperties;
}> = ({ children, size, color = C.graphite, wide = false, upper = false, weight = 400, style }) => (
  <div
    style={{
      fontFamily: FONT.mono,
      fontSize: size,
      fontWeight: weight,
      letterSpacing: wide ? TRACK.monoWide : TRACK.mono,
      textTransform: upper ? "uppercase" : "none",
      color,
      lineHeight: 1.45,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * A figure label with a short leader line, as in a working drawing:
 * "fig. 02 — web app". Positioned in frame coordinates.
 */
export const Fig: React.FC<{
  f: number;
  at: number;
  out?: number;
  x: number;
  y: number;
  no: string;
  text: string;
  size: number;
  color?: string;
  accent?: string;
  leader?: number;
}> = ({ f, at, out, x, y, no, text, size, color = C.graphite, accent = C.ink, leader = 34 }) => {
  const line = tween(f, at, 9, EASE.out);
  const reveal = tween(f, at + 5, 15, EASE.out);
  const gone = out === undefined ? 0 : tween(f, out, 9, EASE.in);
  const lead = leader * (size / 21);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        display: "flex",
        alignItems: "center",
        gap: size * 0.5,
        opacity: 1 - gone,
      }}
    >
      <div
        style={{
          width: lead,
          height: Math.max(1, size * 0.07),
          backgroundColor: color,
          scale: `${line} 1`,
          transformOrigin: "left center",
          opacity: 0.8,
        }}
      />
      <div style={{ clipPath: `inset(-20% ${((1 - reveal) * 100).toFixed(2)}% -20% 0)` }}>
        <Mono size={size} color={color}>
          <span style={{ color: accent, fontWeight: 500 }}>fig. {no}</span>
          <span style={{ opacity: 0.55 }}> — </span>
          {text}
        </Mono>
      </div>
    </div>
  );
};
