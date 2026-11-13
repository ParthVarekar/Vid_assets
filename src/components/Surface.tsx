// Grounds and textures: paper, the dark engine room, grain, and the thin
// construction geometry borrowed from ProtoVinci's LinkedIn cover.

import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";
import { hash } from "../utilities/rng";

/** Repeats a texture across the frame using real <Img> tags, which Remotion
 *  waits for before capturing a frame (CSS backgrounds are not waited for). */
const Tiled: React.FC<{
  file: string;
  size: number;
  offsetX?: number;
  offsetY?: number;
  opacity?: number;
  blend?: React.CSSProperties["mixBlendMode"];
}> = ({ file, size, offsetX = 0, offsetY = 0, opacity = 1, blend }) => {
  const { width, height } = useVideoConfig();
  const cols = Math.ceil(width / size) + 1;
  const rows = Math.ceil(height / size) + 1;
  const src = staticFile(file);
  const ox = -(((offsetX % size) + size) % size);
  const oy = -(((offsetY % size) + size) % size);
  const tiles: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push(
        <Img
          key={`${r}-${c}`}
          src={src}
          style={{
            position: "absolute",
            left: ox + c * size,
            top: oy + r * size,
            width: size,
            height: size,
          }}
        />,
      );
    }
  }
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: blend, pointerEvents: "none", overflow: "hidden" }}>
      {tiles}
    </AbsoluteFill>
  );
};

/** Fine grain over the whole film. Jumps every other frame so it reads as
 *  film grain rather than dirt on the lens. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.4 }) => {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 2);
  return (
    <Tiled
      file="assets/brand/grain.png"
      size={512}
      offsetX={hash(step, 11) * 512}
      offsetY={hash(step, 29) * 512}
      opacity={opacity}
    />
  );
};

/** Warm notebook paper. `bright` moves it toward the cleaner, lit surface
 *  used once the sketch has become engineered. */
export const Paper: React.FC<{ bright?: number; drift?: number; children?: React.ReactNode }> = ({
  bright = 0,
  drift = 0,
  children,
}) => {
  const base = bright <= 0 ? C.paper : bright >= 1 ? C.paperBright : undefined;
  return (
    <AbsoluteFill style={{ backgroundColor: base ?? C.paper }}>
      {base === undefined ? (
        <AbsoluteFill style={{ backgroundColor: C.paperBright, opacity: bright }} />
      ) : null}
      <Tiled
        file="assets/brand/mottle.png"
        size={1024}
        offsetX={-drift * 0.35}
        opacity={0.5 * (1 - bright * 0.55)}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 85% 75% at 50% 46%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 55%, rgba(84,66,48,0.10) 100%)",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

/** The engine room: ink ground with a faint dot grid. */
export const Night: React.FC<{ drift?: number; children?: React.ReactNode }> = ({
  drift = 0,
  children,
}) => {
  const { height } = useVideoConfig();
  const pitch = Math.round(height / 28);
  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      <AbsoluteFill
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.11) 1.1px, rgba(255,255,255,0) 1.7px)",
          backgroundSize: `${pitch}px ${pitch}px`,
          backgroundPosition: `${-drift * 0.35}px 0px`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 62% 44%, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0) 62%), radial-gradient(ellipse 120% 100% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

/**
 * Construction geometry: a large arc, rules and small squares in taupe
 * hairline, as on the brand's LinkedIn cover. `draw` runs 0 to 1.
 */
export const Geometry: React.FC<{
  draw: number;
  drift?: number;
  variant?: 0 | 1 | 2;
  color?: string;
  opacity?: number;
}> = ({ draw, drift = 0, variant = 0, color = C.taupe, opacity = 0.55 }) => {
  const { width: w, height: h } = useVideoConfig();
  const u = Math.min(w, h) / 1080;
  const sw = 1.25 * u;
  const dash = (len: number, delay = 0): React.CSSProperties => {
    const p = Math.max(0, Math.min(1, (draw - delay) / Math.max(0.01, 1 - delay)));
    return { strokeDasharray: len, strokeDashoffset: len * (1 - p) };
  };
  const sets = [
    { cx: w * 0.14, cy: h * 1.02, r: h * 0.86, vx: w * 0.705, hy: h * 0.158, sq: [w * 0.9, h * 0.72] },
    { cx: w * 0.93, cy: h * 0.02, r: h * 0.7, vx: w * 0.36, hy: h * 0.862, sq: [w * 0.07, h * 0.3] },
    { cx: w * 0.5, cy: h * 1.3, r: h * 0.98, vx: w * 0.18, hy: h * 0.2, sq: [w * 0.86, h * 0.26] },
  ];
  const g = sets[variant];
  const circ = 2 * Math.PI * g.r;
  const s = 18 * u;
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      <svg width={w} height={h} style={{ translate: `${-drift * 0.5}px 0px` }}>
        <circle
          cx={g.cx}
          cy={g.cy}
          r={g.r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          transform={`rotate(-90 ${g.cx} ${g.cy})`}
          style={dash(circ)}
        />
        <line x1={g.vx} y1={-20} x2={g.vx} y2={h + 20} stroke={color} strokeWidth={sw} style={dash(h + 40, 0.15)} />
        <line x1={-20} y1={g.hy} x2={w + 20} y2={g.hy} stroke={color} strokeWidth={sw} style={dash(w + 40, 0.3)} />
        <rect
          x={g.sq[0]}
          y={g.sq[1]}
          width={s}
          height={s}
          fill={color}
          opacity={Math.max(0, Math.min(1, (draw - 0.6) / 0.25))}
        />
        <rect
          x={g.sq[0] + s * 1.9}
          y={g.sq[1] + s * 1.9}
          width={s * 0.72}
          height={s * 0.72}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          opacity={Math.max(0, Math.min(1, (draw - 0.7) / 0.25))}
        />
      </svg>
    </AbsoluteFill>
  );
};
