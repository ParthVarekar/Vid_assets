// Scene 4 — Scale. One working unit becomes a field of them, and the line
// climbs out of the top-right corner. The camera follows it up into the next
// scene. No numbers appear: this is an illustration, not a claimed result.

import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { EASE, mix, mixColor, pulse, tween } from "../animations/ease";
import { Quill } from "../components/Quill";
import { Night } from "../components/Surface";
import { ThreadStroke, useThread, useThreadHead } from "../components/Thread";
import { TitleBlock } from "../components/TitleBlock";
import { C } from "../theme";
import { SCALE, SCENES } from "../timeline";
import { useLayout } from "../utilities/layout";
import type { Pt, Stop } from "../utilities/path";
import { hash } from "../utilities/rng";
import { CLIMB_K, climbStartX, driftX, quillLean, useSceneFrame } from "./common";

/** Camera zoom at each step: one unit, 3x3, 7x7, then a field. */
const ZOOM = [1, 0.5, 0.24, 0.135];

export const Scale: React.FC<{ k?: typeof SCALE; length?: number }> = ({
  k = SCALE,
  length = SCENES.scale.to - SCENES.scale.from,
}) => {
  const f = useSceneFrame();
  const L = useLayout();
  const { w, h, u } = L;
  // The line leaves through a corner at a steep angle, so any sideways drift
  // there would show as a kink where the next scene picks it up. Drift settles
  // to zero by the end of this scene, and the next one starts from zero.
  const drift = Math.max(0, driftX(f, length, 10 * u) + 10 * u) * 0.5;

  // Camera: eases to the next zoom level on each step, with a slow creep between.
  let zoom = ZOOM[0];
  for (let i = 1; i < ZOOM.length; i++) {
    const t = tween(f, k.steps[i] - 5, 24, EASE.inOut);
    zoom = zoom * Math.pow(ZOOM[i] / ZOOM[i - 1], t);
  }
  zoom *= 1 - tween(f, 0, length, EASE.linear) * 0.06;

  const centre = L.S(500, 300);
  const pitch = 312 * L.stage.scale;
  const tile = 262 * L.stage.scale;

  // Which ring is born at which step.
  const bornAt = (ring: number, i: number, j: number): number => {
    if (ring === 0) return -999;
    if (ring === 1) return k.steps[1] + hash(i * 31 + j * 17, 3) * 5;
    if (ring <= 3) return k.steps[2] + (ring - 2) * 5 + hash(i * 31 + j * 17, 5) * 5;
    return k.steps[3] + Math.min(16, (ring - 4) * 1.1) + hash(i * 31 + j * 17, 7) * 6;
  };

  const tiles: React.ReactNode[] = [];
  const step = pitch * zoom;
  const size = tile * zoom;
  const cols = Math.ceil((Math.max(centre.x, w - centre.x) + size) / step);
  const rows = Math.ceil((Math.max(centre.y, h - centre.y) + size) / step);
  const maxRing = Math.max(cols, rows);
  for (let j = -rows; j <= rows; j++) {
    for (let i = -cols; i <= cols; i++) {
      const ring = Math.max(Math.abs(i), Math.abs(j));
      const born = tween(f, bornAt(ring, i, j), 11, EASE.out);
      if (born <= 0) continue;
      const cx = centre.x + i * step;
      const cy = centre.y + j * step;
      const s = size * mix(0.55, 1, born);
      const far = ring / Math.max(1, maxRing);
      // Each multiplication sends a wave of light outward through the field.
      const lit = Math.max(0, ...k.steps.map((ts) => pulse(f, ts + ring * 1.4, 16)));
      const blink = 0.5 + 0.5 * Math.sin(f * 0.21 + hash(i * 13 + j * 7, 1) * 6.283);
      const r = s * 0.17;
      tiles.push(
        <g key={`${i},${j}`} opacity={born * mix(1, 0.55, far)}>
          <rect
            x={cx - s / 2}
            y={cy - s / 2}
            width={s}
            height={s}
            rx={r}
            fill={mixColor("#1B1B22", "#4A4A56", lit * 0.7)}
            stroke={`rgba(255,255,255,${(0.3 + lit * 0.6).toFixed(3)})`}
            strokeWidth={Math.max(0.6, 1.25 * Math.min(1, zoom * 2.4))}
          />
          {s > 64 ? (
            <>
              <path
                d={`M ${cx - s * 0.26} ${cy} H ${cx + s * 0.26}`}
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={Math.max(1, s * 0.012)}
              />
              {[-0.26, 0, 0.26].map((o, n) => (
                <rect
                  key={n}
                  x={cx + s * o - s * 0.07}
                  y={cy - s * 0.07}
                  width={s * 0.14}
                  height={s * 0.14}
                  rx={s * 0.035}
                  fill={C.nightRaise}
                  stroke={`rgba(255,255,255,${(0.6 + (n === 1 ? blink * 0.4 : 0.1)).toFixed(3)})`}
                  strokeWidth={Math.max(1, s * 0.01)}
                />
              ))}
            </>
          ) : s > 15 ? (
            <circle cx={cx} cy={cy} r={Math.max(1.1, s * 0.07)} fill="#fff" opacity={Math.min(1, 0.45 + blink * 0.45 + lit * 0.4)} />
          ) : null}
        </g>,
      );
    }
  }

  // The line: along the ground, then climbing out through the top-right corner.
  const startX = climbStartX(L);
  const points = useMemo(() => {
    const pts: Pt[] = [{ x: -70 * u, y: L.threadY }, { x: startX - 120 * u, y: L.threadY }];
    const steps = 22;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push({
        x: mix(startX, w, t),
        y: L.threadY - L.threadY * ((Math.exp(CLIMB_K * t) - 1) / (Math.exp(CLIMB_K) - 1)),
      });
    }
    // Carry on past the corner at the same slope.
    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];
    pts.push({ x: b.x + (b.x - a.x) * 2.2, y: b.y + (b.y - a.y) * 2.2 });
    return pts;
  }, [L.threadY, startX, u, w]);
  const thread = useThread(points, { smooth: true });
  const stops: Stop[] = [
    { frame: k.threadIn, point: 0 },
    { frame: k.climbFrom, point: 2, ease: EASE.soft },
    { frame: k.climbTo, point: points.length - 1, ease: EASE.inOut },
  ];
  const { progress, head } = useThreadHead(thread, stops, f);

  return (
    <AbsoluteFill>
      <Night drift={drift} />
      <AbsoluteFill style={{ translate: `${drift}px 0px` }}>
        <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {tiles}
        </svg>
        {/* Keeps the word legible over the field. */}
        <AbsoluteFill
          style={{
            background:
              L.format === "wide"
                ? `linear-gradient(90deg, ${C.night} 0%, rgba(9,9,11,0.92) 26%, rgba(9,9,11,0) 50%)`
                : `linear-gradient(180deg, ${C.night} 0%, rgba(9,9,11,0.94) ${L.format === "tall" ? 30 : 26}%, rgba(9,9,11,0) ${L.format === "tall" ? 42 : 40}%)`,
            opacity: tween(f, k.steps[1] - 6, 30, EASE.inOut),
          }}
        />
        <ThreadStroke d={thread.d} to={progress} width={L.threadWidth} color={C.sanguineBright} id="scale" />
        <TitleBlock
          f={f}
          L={L}
          at={k.word}
          captionAt={k.caption}
          index="03"
          word="Scale."
          caption={["cloud · systems that", "grow with you"]}
          captionOneLine="cloud · systems that grow with you"
          dark
        />
        <Quill
          x={head.x}
          y={head.y}
          size={L.quillSize}
          rotate={quillLean(head, 1) * 0.6}
          color={C.nightText}
          shadow={false}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
