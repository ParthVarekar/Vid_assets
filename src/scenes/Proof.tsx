// Scene 5 — Proof. A breath before the ending: real work, at human scale.
//
// The screens are ProtoVinci's own shipped projects, taken unmodified from the
// portfolio on its website, with the delivery times that page states.
// `showWork={false}` swaps them for abstract cards if client approval for
// advertising use has not been confirmed.

import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { EASE, mix, tween } from "../animations/ease";
import { Quill } from "../components/Quill";
import { Geometry, Paper } from "../components/Surface";
import { ThreadStroke, useThread, useThreadHead } from "../components/Thread";
import { Headline, Mono } from "../components/Type";
import { C } from "../theme";
import { PROOF, SCENES } from "../timeline";
import { useLayout } from "../utilities/layout";
import type { Pt, Stop } from "../utilities/path";
import { climbSlope, driftX, quillLean, useSceneFrame } from "./common";

const WORK = [
  { file: "gullyculture.webp", label: "Social commerce", time: "3 weeks" },
  { file: "awarddock.webp", label: "Workflow automation", time: "6 weeks" },
  { file: "wmc.webp", label: "Virtual lab", time: "6 weeks" },
  { file: "firdosh.webp", label: "Digital showroom", time: "2 weeks" },
  { file: "rk-enterprises.webp", label: "Product catalogue", time: "2 weeks" },
];

export const Proof: React.FC<{ k?: typeof PROOF; length?: number; showWork?: boolean }> = ({
  k = PROOF,
  length = SCENES.proof.to - SCENES.proof.from,
  showWork = true,
}) => {
  const f = useSceneFrame();
  const L = useLayout();
  const { w, h, u } = L;
  const wide = L.format === "wide";
  // Starts from zero so the line meets the previous scene's exactly (see Scale).
  const drift = Math.min(0, driftX(f, length, 14 * u) - 14 * u) * 0.5;

  // The line arrives through the bottom-left corner at the slope it left the
  // last scene with, crests, and settles onto the ground line.
  const slope = climbSlope(L);
  const rise = (h - L.threadY) * 0.62;
  const x1 = rise / slope;
  const points: Pt[] = [
    { x: -60 * u, y: h + 60 * u * slope },
    { x: 0, y: h },
    { x: x1, y: h - rise },
    { x: x1 + 78 * u, y: L.threadY - 22 * u },
    { x: x1 + 200 * u, y: L.threadY - 40 * u },
    { x: x1 + 350 * u, y: L.threadY - 16 * u },
    { x: x1 + 480 * u, y: L.threadY },
    { x: x1 + 700 * u, y: L.threadY },
    { x: w + 70 * u, y: L.threadY },
  ];
  const thread = useThread(points, { smooth: true });
  const stops: Stop[] = [
    { frame: k.threadIn, point: 0 },
    { frame: k.threadIn + 14, point: 2, ease: EASE.linear },
    { frame: k.threadIn + 40, point: 7, ease: EASE.soft },
    { frame: k.leaveFrom, point: 7 },
    { frame: k.leaveTo, point: 8, ease: EASE.inOut },
  ];
  const { progress, head } = useThreadHead(thread, stops, f);
  const resting = f > k.threadIn + 40 && f < k.leaveFrom ? 1 : 0;

  // Cards on a tilted plane, echoing the project row on the brand's own site.
  const cardW = (wide ? 700 : L.format === "tall" ? 700 : 560) * u;
  const cardH = cardW * 0.5;
  const gap = 34 * u;
  const rowLeft = wide ? w * 0.2 : L.margin * 0.6;
  const rowTop = wide ? h * 0.33 : L.stageBox.y + (L.format === "tall" ? 70 * u : 34 * u);
  const travel = wide
    ? mix(110 * u, -230 * u, tween(f, k.threadIn, length + 24, EASE.linear))
    : mix(150 * u, 10 * u, tween(f, k.threadIn, length + 24, EASE.linear));

  const size = L.type.title * (wide ? 0.6 : L.format === "tall" ? 0.66 : 0.72);

  return (
    <AbsoluteFill>
      <Paper drift={drift}>
        <Geometry draw={tween(f, -12, 70, EASE.inOut)} drift={drift} variant={2} opacity={0.5} />
      </Paper>
      <AbsoluteFill style={{ translate: `${drift}px 0px` }}>
        <ThreadStroke d={thread.d} to={progress} width={L.threadWidth} id="proof" />

        <div
          style={{
            position: "absolute",
            left: rowLeft,
            top: rowTop,
            perspective: `${1500 * u}px`,
            perspectiveOrigin: "30% 40%",
          }}
        >
          <div
            style={{
              display: "flex",
              gap,
              transform: `rotateX(26deg) rotateZ(-6.5deg) translateX(${travel.toFixed(2)}px)`,
              transformOrigin: "20% 50%",
              transformStyle: "preserve-3d",
            }}
          >
            {WORK.map((item, i) => {
              const t = tween(f, k.cards + i * 4, 22, EASE.out);
              return (
                <div
                  key={item.file}
                  style={{
                    flexShrink: 0,
                    width: cardW,
                    opacity: Math.min(1, t * 1.6),
                    translate: `0 ${((1 - t) * 120 * u).toFixed(2)}px`,
                  }}
                >
                  <div
                    style={{
                      width: cardW,
                      height: cardH,
                      borderRadius: 16 * u,
                      overflow: "hidden",
                      backgroundColor: C.white,
                      boxShadow: `0 ${44 * u}px ${70 * u}px ${-30 * u}px rgba(52,38,24,0.5), 0 0 0 ${1.2 * u}px rgba(9,9,11,0.09)`,
                    }}
                  >
                    {showWork ? (
                      <Img
                        src={staticFile(`assets/brand/work/${item.file}`)}
                        style={{ width: cardW, height: cardH, objectFit: "cover", objectPosition: "top left" }}
                      />
                    ) : (
                      <div style={{ padding: 26 * u }}>
                        <div style={{ width: "46%", height: 22 * u, borderRadius: 6 * u, backgroundColor: C.ink }} />
                        <div style={{ marginTop: 14 * u, width: "62%", height: 10 * u, borderRadius: 5 * u, backgroundColor: C.rule }} />
                        <div style={{ marginTop: 8 * u, width: "48%", height: 10 * u, borderRadius: 5 * u, backgroundColor: C.rule }} />
                        <div style={{ marginTop: 22 * u, width: "100%", height: cardH * 0.36, borderRadius: 10 * u, backgroundColor: i % 2 ? C.taupeLight : C.paper }} />
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 16 * u, display: "flex", alignItems: "center", gap: 10 * u }}>
                    <div style={{ width: 8 * u, height: 8 * u, borderRadius: 4 * u, backgroundColor: C.ink }} />
                    <Mono size={L.type.mono * 1.25} color={C.ink}>
                      {item.label}
                      <span style={{ color: C.graphite }}> · {item.time}</span>
                    </Mono>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: L.text.x,
            top: wide ? h * 0.145 : L.text.y - 8 * u,
          }}
        >
          <Headline
            lines={wide ? ["One team. Idea to launch."] : ["One team.", "Idea to launch."]}
            f={f}
            at={k.headline}
            size={size}
            stagger={6}
          />
          <div
            style={{
              marginTop: (wide ? 26 : 16) * u,
              opacity: tween(f, k.sub, 14, EASE.out),
              translate: `0 ${(1 - tween(f, k.sub, 14, EASE.out)) * 8 * u}px`,
            }}
          >
            <Mono size={L.type.mono} color={C.graphite} wide upper>
              status <span style={{ opacity: 0.5 }}>—</span>{" "}
              <span style={{ color: C.ink, fontWeight: 500 }}>shipped, in weeks</span>
            </Mono>
          </div>
        </div>

        <Quill
          x={head.x}
          y={head.y}
          size={L.quillSize}
          rotate={quillLean(head, 1 - resting)}
          lift={resting * 12 * u}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
