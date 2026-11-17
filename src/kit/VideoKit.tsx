// Video kit: drop-in animated pieces for any ProtoVinci video.
// Each component animates from its own local frame 0, so place it in a
// <Sequence from={...}> and it plays from there.
//
//   <Sequence from={60} durationInFrames={150}><LowerThird name="..." role="..." /></Sequence>
//
// Every piece follows asset-library/MOTION-RULES.md: masked rises, ease-out,
// no bounce, sanguine only on the line.

import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, mix, tween } from "../animations/ease";
import { LogoMark, Quill } from "../components/Quill";
import { Geometry, Night, Paper } from "../components/Surface";
import { ThreadStroke, useThread } from "../components/Thread";
import { Headline, Mono, Rise } from "../components/Type";
import { C, FONT, TRACK } from "../theme";
import { ICON_PATHS, type IconName } from "../three/data/icons";

type Tone = "paper" | "night";
const inkOf = (t: Tone) => (t === "night" ? C.nightText : C.ink);
const mutedOf = (t: Tone) => (t === "night" ? C.nightMuted : C.graphite);
const lineOf = (t: Tone) => (t === "night" ? C.sanguineBright : C.sanguine);
const unit = (w: number, h: number) => Math.min(w, h) / 1080;

/** 0..1 for a piece that enters at 0 and leaves `outLen` frames before `dur`. */
const life = (f: number, dur: number, inLen = 16, outLen = 12) =>
  Math.min(tween(f, 0, inLen, EASE.out), 1 - tween(f, dur - outLen, outLen, EASE.in));

// ---------------------------------------------------------------------------
// Icon (2D), same artwork as the icon set and the 3D icons
// ---------------------------------------------------------------------------

export const Icon: React.FC<{ name: IconName; size: number; color: string; stroke?: number }> = ({
  name,
  size,
  color,
  stroke = 1.6,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 18 18"
    fill="none"
    stroke={color}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
  />
);

// ---------------------------------------------------------------------------
// Lower third: name and role, with the line drawing underneath
// ---------------------------------------------------------------------------

export const LowerThird: React.FC<{
  name: string;
  role: string;
  tone?: Tone;
  /** Total frames on screen (enter + hold + exit). */
  duration?: number;
  side?: "left" | "right";
}> = ({ name, role, tone = "paper", duration = 150, side = "left" }) => {
  const f = useCurrentFrame();
  const { width: w, height: h } = useVideoConfig();
  const u = unit(w, h);
  const tall = h > w;
  const out = duration - 14;
  const draw = Math.min(tween(f, 4, 20, EASE.pen), 1);
  const gone = tween(f, out, 12, EASE.in);
  const size = (tall ? 54 : 46) * u;
  // Sits above the caption band (see Captions), so both can be on screen at once.
  const bottom = tall ? h * 0.33 : 160 * u;
  const lineW = 420 * u;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          [side]: tall ? 72 * u : 96 * u,
          bottom,
          display: "flex",
          flexDirection: "column",
          alignItems: side === "left" ? "flex-start" : "flex-end",
          opacity: 1 - gone,
        }}
      >
        <Headline lines={[name]} f={f} at={6} size={size} color={inkOf(tone)} tracking={TRACK.title} />
        <div style={{ marginTop: 10 * u }}>
          <Rise f={f} at={12} duration={14}>
            <Mono size={20 * u * (tall ? 1.2 : 1)} color={mutedOf(tone)} wide upper>
              {role}
            </Mono>
          </Rise>
        </div>
        <svg width={lineW} height={10 * u} style={{ marginTop: 14 * u, overflow: "visible" }}>
          <line
            x1={side === "left" ? 0 : lineW}
            y1={5 * u}
            x2={side === "left" ? lineW : 0}
            y2={5 * u}
            stroke={lineOf(tone)}
            strokeWidth={4 * u}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${(draw * (1 - gone)).toFixed(4)} 2`}
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Captions: word-timed subtitles, current word underlined
// ---------------------------------------------------------------------------

export type CaptionWord = { text: string; from: number; to: number };

/** Splits a sentence into evenly timed words (use real timings when you have them). */
export const evenWords = (sentence: string, from: number, framesPerWord = 9): CaptionWord[] =>
  sentence.split(/\s+/).map((text, i) => ({ text, from: from + i * framesPerWord, to: from + (i + 1) * framesPerWord }));

export const Captions: React.FC<{
  words: CaptionWord[];
  tone?: Tone;
  /** Words shown per page. */
  perPage?: number;
}> = ({ words, tone = "paper", perPage = 5 }) => {
  const f = useCurrentFrame();
  const { width: w, height: h } = useVideoConfig();
  const u = unit(w, h);
  const tall = h > w;
  const idx = Math.max(0, words.findIndex((wd) => f < wd.to));
  if (words.length === 0 || f >= words[words.length - 1].to + 12) return null;
  const page = Math.floor((idx === -1 ? words.length - 1 : idx) / perPage);
  const shown = words.slice(page * perPage, page * perPage + perPage);
  const plate = tone === "night" ? "rgba(9,9,11,0.82)" : "rgba(247,245,240,0.92)";
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          marginBottom: tall ? h * 0.26 : 48 * u,
          maxWidth: w * 0.84,
          padding: `${14 * u}px ${26 * u}px`,
          borderRadius: 14 * u,
          backgroundColor: plate,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: `${4 * u}px ${14 * u}px`,
          fontFamily: FONT.sans,
          fontWeight: 600,
          fontSize: (tall ? 58 : 44) * u,
          letterSpacing: TRACK.title,
          lineHeight: 1.15,
        }}
      >
        {shown.map((wd) => {
          const active = f >= wd.from && f < wd.to;
          const seen = f >= wd.from;
          return (
            <span
              key={`${wd.text}-${wd.from}`}
              style={{
                color: inkOf(tone),
                opacity: seen ? 1 : 0.32,
                boxShadow: active ? `inset 0 ${-5 * u}px 0 ${lineOf(tone)}` : "none",
              }}
            >
              {wd.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Line wipe: a transition. The line sweeps across and drags a new ground in.
// Place it over the cut, centred on the frame where the scenes change.
// ---------------------------------------------------------------------------

export const LineWipe: React.FC<{ duration?: number; to?: Tone; direction?: "ltr" | "rtl" }> = ({
  duration = 24,
  to = "night",
  direction = "ltr",
}) => {
  const f = useCurrentFrame();
  const { width: w, height: h } = useVideoConfig();
  const u = unit(w, h);
  const t = tween(f, 0, duration * 0.55, EASE.inOut);
  const clear = tween(f, duration * 0.55, duration * 0.45, EASE.inOut);
  const x = mix(-0.05, 1.05, t) * w;
  const xOut = mix(-0.05, 1.05, clear) * w;
  const ltr = direction === "ltr";
  const left = ltr ? xOut : w - x;
  const right = ltr ? x : w - xOut;
  if (f > duration) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: Math.min(left, right),
          width: Math.max(0, Math.abs(right - left)),
          top: 0,
          bottom: 0,
          backgroundColor: to === "night" ? C.night : C.paper,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: (ltr ? x : w - x) - 3 * u,
          top: 0,
          bottom: 0,
          width: 6 * u,
          backgroundColor: lineOf(to === "night" ? "paper" : "night"),
          opacity: t < 1 ? 1 : 0,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Title card: section opener ("01 / Build.") on its own ground
// ---------------------------------------------------------------------------

export const TitleCard: React.FC<{
  index?: string;
  title: string;
  subtitle?: string;
  tone?: Tone;
  duration?: number;
}> = ({ index, title, subtitle, tone = "paper", duration = 90 }) => {
  const f = useCurrentFrame();
  const { width: w, height: h } = useVideoConfig();
  const u = unit(w, h);
  const ground = tone === "night" ? <Night /> : <Paper />;
  const size = Math.min(170 * u, (w * 0.84) / Math.max(4, title.length * 0.5));
  const thread = useThread([{ x: -40, y: h * 0.7 }, { x: w * 0.5, y: h * 0.7 }], { wobble: tone === "paper" ? 3 * u : 0, seed: 4 });
  const draw = tween(f, 10, 26, EASE.pen);
  return (
    <AbsoluteFill>
      {ground}
      <Geometry draw={tween(f, 0, 40, EASE.inOut)} opacity={tone === "night" ? 0.2 : 0.45} color={tone === "night" ? "#3A3A44" : C.taupe} />
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: w * 0.08, opacity: 1 - tween(f, duration - 12, 12, EASE.in) }}>
        {index ? (
          <div style={{ opacity: tween(f, 0, 12), marginBottom: 18 * u }}>
            <Mono size={24 * u} color={mutedOf(tone)} wide upper>
              {index}
            </Mono>
          </div>
        ) : null}
        <Headline lines={[title]} f={f} at={4} size={size} color={inkOf(tone)} />
        {subtitle ? (
          <div style={{ marginTop: 26 * u }}>
            <Rise f={f} at={12} duration={15}>
              <Mono size={26 * u} color={mutedOf(tone)}>
                {subtitle}
              </Mono>
            </Rise>
          </div>
        ) : null}
      </AbsoluteFill>
      <ThreadStroke d={thread.d} to={draw} width={5 * u} color={lineOf(tone)} chalk={tone === "paper" ? 1 : 0} id="titlecard" />
      <Quill
        x={w * 0.5 * draw - 40 * (1 - draw)}
        y={h * 0.7}
        size={150 * u}
        rotate={-6}
        color={inkOf(tone)}
        shadow={tone === "paper"}
        opacity={tween(f, 6, 8) * (1 - tween(f, duration - 12, 10))}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// End card: lockup + call to action. Use as the last 3-4 seconds of anything.
// ---------------------------------------------------------------------------

export const EndCard: React.FC<{ cta?: string; url?: string; tone?: Tone }> = ({
  cta = "Got a vision? Let's ship it.",
  url = "protovinci.vercel.app",
  tone = "paper",
}) => {
  const f = useCurrentFrame();
  const { width: w, height: h } = useVideoConfig();
  const u = unit(w, h);
  const tall = h > w;
  const ink = inkOf(tone);
  const mark = tween(f, 0, 18, EASE.out);
  const urlT = tween(f, 26, 16, EASE.out);
  const words = tall ? cta.split(/(?<=\?)\s+/) : [cta];
  return (
    <AbsoluteFill>
      {tone === "night" ? <Night /> : <Paper />}
      <Geometry draw={1} opacity={tone === "night" ? 0.2 : 0.4} color={tone === "night" ? "#3A3A44" : C.taupe} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 30 * u }}>
        <div style={{ opacity: mark, scale: String(mix(0.92, 1, mark)), display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * u }}>
          <LogoMark height={110 * u} color={ink} />
          <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 52 * u, letterSpacing: TRACK.title, color: ink }}>ProtoVinci</div>
        </div>
        <Headline lines={words} f={f} at={12} size={(tall ? 96 : 84) * u} color={ink} align="center" stagger={5} />
        <div
          style={{
            opacity: urlT,
            translate: `0 ${(1 - urlT) * 12 * u}px`,
            backgroundColor: ink,
            color: tone === "night" ? C.ink : C.white,
            borderRadius: 999,
            padding: `${16 * u}px ${32 * u}px`,
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: 30 * u,
            letterSpacing: TRACK.body,
          }}
        >
          {url} →
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Logo bug: small corner mark for the whole length of a video
// ---------------------------------------------------------------------------

export const LogoBug: React.FC<{ corner?: "tl" | "tr" | "bl" | "br"; tone?: Tone; withName?: boolean }> = ({
  corner = "tr",
  tone = "paper",
  withName = true,
}) => {
  const f = useCurrentFrame();
  const { width: w, height: h } = useVideoConfig();
  const u = unit(w, h);
  const tall = h > w;
  const m = (tall ? 64 : 56) * u;
  const pos: React.CSSProperties = {
    [corner[0] === "t" ? "top" : "bottom"]: tall ? h * (corner[0] === "t" ? 0.14 : 0.22) : m,
    [corner[1] === "l" ? "left" : "right"]: m,
  };
  return (
    <div
      style={{
        position: "absolute",
        ...pos,
        display: "flex",
        alignItems: "center",
        gap: 10 * u,
        opacity: 0.88 * tween(f, 0, 12),
        pointerEvents: "none",
      }}
    >
      <LogoMark height={34 * u} color={inkOf(tone)} />
      {withName ? (
        <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 24 * u, letterSpacing: TRACK.title, color: inkOf(tone) }}>ProtoVinci</div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Callout: an icon chip that pops in beside a point, with a leader line
// ---------------------------------------------------------------------------

export const Callout: React.FC<{ x: number; y: number; icon: IconName; label: string; tone?: Tone; duration?: number }> = ({
  x,
  y,
  icon,
  label,
  tone = "paper",
  duration = 90,
}) => {
  const f = useCurrentFrame();
  const { width: w, height: h } = useVideoConfig();
  const u = unit(w, h);
  const t = life(f, duration);
  const lead = tween(f, 0, 12, EASE.out);
  const dark = tone === "night";
  return (
    <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: -6 * u, top: -6 * u, width: 12 * u, height: 12 * u, borderRadius: 99, backgroundColor: lineOf(tone), opacity: t }} />
      <div style={{ position: "absolute", left: 0, top: -1 * u, width: 60 * u * lead, height: 2 * u, backgroundColor: mutedOf(tone), opacity: t }} />
      <div
        style={{
          position: "absolute",
          left: 66 * u,
          top: -26 * u,
          display: "flex",
          alignItems: "center",
          gap: 12 * u,
          padding: `${10 * u}px ${18 * u}px ${10 * u}px ${12 * u}px`,
          borderRadius: 999,
          backgroundColor: dark ? C.nightRaise : C.white,
          boxShadow: dark ? "0 0 0 1px rgba(255,255,255,0.14)" : "0 10px 30px -12px rgba(52,38,24,0.4), 0 0 0 1px rgba(9,9,11,0.06)",
          opacity: t,
          translate: `${(1 - t) * -10 * u}px 0`,
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ width: 32 * u, height: 32 * u, borderRadius: 99, backgroundColor: dark ? C.nightText : C.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={18 * u} color={dark ? C.ink : C.white} />
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 24 * u, letterSpacing: TRACK.body, color: inkOf(tone) }}>{label}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Screen frame: drop a screenshot or screen recording into a browser frame
// ---------------------------------------------------------------------------

const isResolved = (src: string): boolean => src.startsWith("http") || src.startsWith("/");

export const ScreenFrame: React.FC<{ src: string; width: number; url?: string; tilt?: boolean }> = ({
  src,
  width,
  url = "your-idea.com",
  tilt = false,
}) => {
  const f = useCurrentFrame();
  const t = tween(f, 0, 22, EASE.out);
  const bar = width * 0.045;
  return (
    <div style={{ perspective: width * 2.4 }}>
      <div
        style={{
          width,
          borderRadius: width * 0.014,
          overflow: "hidden",
          backgroundColor: C.white,
          boxShadow: `0 ${width * 0.04}px ${width * 0.08}px -${width * 0.03}px rgba(52,38,24,0.45), 0 0 0 1px rgba(9,9,11,0.07)`,
          opacity: t,
          transform: `translateY(${(1 - t) * width * 0.05}px) ${tilt ? "rotateX(18deg) rotateZ(-4deg)" : ""}`,
        }}
      >
        <div style={{ height: bar, display: "flex", alignItems: "center", gap: bar * 0.3, padding: `0 ${bar * 0.45}px`, backgroundColor: "#FAFAFA", borderBottom: `1px solid ${C.rule}` }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: bar * 0.24, height: bar * 0.24, borderRadius: 99, backgroundColor: "#D9D9DE" }} />
          ))}
          <div style={{ marginLeft: "auto", marginRight: "auto", fontFamily: FONT.mono, fontSize: bar * 0.32, color: C.graphite, backgroundColor: "#F0F0F2", borderRadius: 99, padding: `${bar * 0.1}px ${bar * 0.8}px` }}>
            {url}
          </div>
        </div>
        {/* Accepts a path under public/, an absolute URL, or an already-resolved static path. */}
        <Img src={isResolved(src) ? src : staticFile(src)} style={{ width, display: "block" }} />
      </div>
    </div>
  );
};
