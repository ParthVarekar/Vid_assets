// Reusable brand stills: lockups, social banners, posters, thumbnails.
// All use the film's own components, so they match it exactly.
//
//   npx remotion still Lockup out.png --props='{"color":"ink"}'
//   npx remotion still Card-OG out.png
//
// These render frame 0 only; nothing in them animates.

import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { LogoMark, Quill } from "../components/Quill";
import { Geometry, Grain, Night, Paper } from "../components/Surface";
import { ThreadStroke, useThread } from "../components/Thread";
import { Mono } from "../components/Type";
import { C, FONT, TRACK } from "../theme";
import type { Pt } from "../utilities/path";

// ---------------------------------------------------------------------------
// Lockup: mark + wordmark (+ optional tagline) on a transparent ground.
// ---------------------------------------------------------------------------

export type LockupProps = {
  color: "ink" | "white" | "sanguine";
  tagline: boolean;
  layout: "stacked" | "horizontal";
};

const INK: Record<LockupProps["color"], string> = {
  ink: C.ink,
  white: "#FFFFFF",
  sanguine: C.sanguine,
};

export const Lockup: React.FC<LockupProps> = ({ color, tagline, layout }) => {
  const { height: h } = useVideoConfig();
  const ink = INK[color];
  const stacked = layout === "stacked";
  const mark = h * (stacked ? 0.42 : 0.6);
  const word = h * (stacked ? 0.2 : 0.3);
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: stacked ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: stacked ? h * 0.03 : h * 0.06,
      }}
    >
      <LogoMark height={mark} color={ink} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: stacked ? "center" : "flex-start" }}>
        <div
          style={{
            fontFamily: FONT.sans,
            fontWeight: 600,
            fontSize: word,
            letterSpacing: TRACK.display,
            color: ink,
            lineHeight: 1,
          }}
        >
          ProtoVinci
        </div>
        {tagline ? (
          <div
            style={{
              fontFamily: FONT.sans,
              fontWeight: 500,
              fontSize: word * 0.34,
              letterSpacing: TRACK.title,
              color: ink,
              opacity: 0.82,
              marginTop: word * 0.16,
            }}
          >
            Creativity, Engineered.
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Card: a brand still for any size. Layout adapts to the aspect ratio.
// ---------------------------------------------------------------------------

export type CardProps = {
  theme: "paper" | "night";
  headline: string[];
  kicker: string;
  url: boolean;
};

export const Card: React.FC<CardProps> = ({ theme, headline, kicker, url }) => {
  const { width: w, height: h } = useVideoConfig();
  const u = Math.min(w, h) / 1080;
  const ratio = w / h;
  const banner = ratio > 2.4; // LinkedIn / X headers
  const dark = theme === "night";
  const ink = dark ? C.nightText : C.ink;
  const muted = dark ? C.nightMuted : C.graphite;
  const line = dark ? C.sanguineBright : C.sanguine;

  const m = (banner ? 0.07 : 0.075) * Math.min(w, h * 1.6);
  const groundY = h * (banner ? 0.8 : 0.82);
  // With a URL pill on the right, the quill stops short of it.
  const quillAt = { x: w * (banner ? 0.6 : url ? 0.42 : 0.72), y: groundY };
  const pts: Pt[] = [
    { x: -40, y: groundY },
    { x: quillAt.x, y: groundY },
  ];
  const thread = useThread(pts, { wobble: 2.4 * u, seed: 7 });

  // Fit the longest line to the space available (Switzer semibold, tight
  // tracking, averages about 0.5 em per character).
  const longest = Math.max(...headline.map((l) => l.length));
  const room = banner ? w * 0.46 : w - m * 2;
  const headSize = Math.min(
    banner ? h * 0.2 : (ratio < 1 ? 118 : 104) * u * (ratio > 1.6 ? 1.15 : 1),
    room / (longest * 0.5),
  );
  const markH = banner ? h * 0.3 : 64 * u;

  return (
    <AbsoluteFill>
      {dark ? <Night /> : <Paper />}
      <Geometry draw={1} variant={banner ? 2 : 0} opacity={dark ? 0.25 : 0.5} color={dark ? "#3A3A44" : C.taupe} />

      {/* Brand row */}
      <div
        style={{
          position: "absolute",
          left: m,
          top: banner ? h * 0.18 : m,
          display: "flex",
          alignItems: "center",
          gap: markH * 0.3,
        }}
      >
        <LogoMark height={markH} color={ink} />
        <div
          style={{
            fontFamily: FONT.sans,
            fontWeight: 600,
            fontSize: markH * (banner ? 0.62 : 0.56),
            letterSpacing: TRACK.title,
            color: ink,
            lineHeight: 1,
          }}
        >
          ProtoVinci
        </div>
      </div>

      {/* Headline */}
      <div
        style={{
          position: "absolute",
          left: banner ? w * 0.5 : m,
          right: m,
          top: banner ? h * 0.18 : undefined,
          bottom: banner ? undefined : h - groundY + (ratio < 1 ? 110 : 70) * u,
          fontFamily: FONT.sans,
          fontWeight: 600,
          fontSize: headSize,
          lineHeight: 1.0,
          letterSpacing: TRACK.display,
          color: ink,
          whiteSpace: "nowrap",
        }}
      >
        {headline.map((l) => (
          <div key={l}>{l}</div>
        ))}
        {kicker ? (
          <div style={{ marginTop: headSize * 0.3 }}>
            <Mono size={banner ? h * 0.055 : 22 * u} color={muted} wide upper>
              {kicker}
            </Mono>
          </div>
        ) : null}
      </div>

      <ThreadStroke d={thread.d} to={1} width={(banner ? 3.4 : 5) * u} color={line} chalk={dark ? 0 : 1} id="card" />
      <Quill
        x={quillAt.x}
        y={quillAt.y}
        size={(banner ? 120 : 150) * u * (banner ? 1.6 : 1)}
        rotate={-4}
        color={dark ? C.nightText : C.ink}
        shadow={!dark}
      />

      {url ? (
        <div
          style={{
            position: "absolute",
            right: m,
            bottom: h - groundY + (banner ? -h * 0.1 : 34 * u),
            backgroundColor: dark ? C.nightText : C.ink,
            color: dark ? C.ink : C.white,
            borderRadius: 999,
            padding: `${14 * u}px ${28 * u}px`,
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: (banner ? 22 : 26) * u * (banner ? 1.6 : 1),
            letterSpacing: TRACK.body,
          }}
        >
          protovinci.vercel.app →
        </div>
      ) : null}
      <Grain opacity={0.3} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Swatches: the palette as an image.
// ---------------------------------------------------------------------------

const SWATCHES: Array<[string, string, string]> = [
  ["Paper", C.paper, "ground"],
  ["Paper bright", C.paperBright, "lit ground"],
  ["Taupe", C.taupe, "construction"],
  ["Taupe light", C.taupeLight, "hairlines"],
  ["Ink", C.ink, "type, mark"],
  ["Graphite", C.graphite, "labels"],
  ["Zinc", C.zinc, "muted"],
  ["Night card", C.nightCard, "dark surfaces"],
  ["Sanguine", C.sanguine, "the line only"],
  ["Sanguine bright", C.sanguineBright, "line on dark"],
];

export const Palette: React.FC = () => {
  const { width: w, height: h } = useVideoConfig();
  const cols = 5;
  const cw = w / cols;
  const ch = h / 2;
  return (
    <AbsoluteFill style={{ backgroundColor: C.paperBright }}>
      {SWATCHES.map(([name, hex, use], i) => {
        const light = ["Paper", "Paper bright", "Taupe light"].includes(name);
        return (
          <div
            key={name}
            style={{
              position: "absolute",
              left: (i % cols) * cw,
              top: Math.floor(i / cols) * ch,
              width: cw,
              height: ch,
              backgroundColor: hex,
              padding: 36,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              color: light ? C.ink : "#fff",
            }}
          >
            <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 34, letterSpacing: TRACK.title }}>{name}</div>
            <Mono size={20} color={light ? C.graphite : "rgba(255,255,255,0.75)"}>
              {hex.toUpperCase()} · {use}
            </Mono>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
