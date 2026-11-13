// Scene 3 — Automate. The engine room.
//
// The line becomes the main path of a workflow. Work travels along it on the
// eighth-note grid, so every arrival at a node is also a note in the score.

import React from "react";
import { AbsoluteFill } from "remotion";
import { EASE, mix, tween } from "../animations/ease";
import { Plate } from "../components/Plate";
import { Quill } from "../components/Quill";
import { Night } from "../components/Surface";
import { ThreadStroke, useThread, useThreadHead } from "../components/Thread";
import { TitleBlock } from "../components/TitleBlock";
import { C, FONT, TRACK } from "../theme";
import { AUTOMATE, BEAT, SCENES } from "../timeline";
import { STAGE, useLayout } from "../utilities/layout";
import type { Pt, Stop } from "../utilities/path";
import { driftX, idleBob, quillLean, useSceneFrame } from "./common";

const LINE_Y = 300;
const NODE_X = [170, 390, 610, 830];
const NODE = { w: 172, h: 70 };
const HALF = BEAT / 2;

const MAIN = ["Form", "AI agent", "Document", "Email"];
const BRANCH = [
  { label: "Sheet", from: 1, x: 390, y: 470 },
  { label: "CRM", from: 2, x: 610, y: 138 },
  { label: "Payments", from: 3, x: 830, y: 470 },
];
const TASKS = ["Data entry", "Reports", "Certificates", "Follow-ups"];

/** Small line icons, drawn in an 18 px box. */
const Icon: React.FC<{ kind: string; color: string; size?: number }> = ({ kind, color, size = 18 }) => {
  const p = { fill: "none", stroke: color, strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      {kind === "Form" ? (
        <>
          <rect x={2.5} y={2.5} width={13} height={13} rx={2.5} {...p} />
          <path d="M5.5 7 H12.5 M5.5 10.5 H10" {...p} />
        </>
      ) : null}
      {kind === "AI agent" ? (
        <path d="M9 2 L10.6 7.4 L16 9 L10.6 10.6 L9 16 L7.4 10.6 L2 9 L7.4 7.4 Z" {...p} />
      ) : null}
      {kind === "Document" ? (
        <>
          <path d="M4.5 2.5 H10.5 L13.5 5.5 V15.5 H4.5 Z" {...p} />
          <path d="M7 9 H11 M7 12 H11" {...p} />
        </>
      ) : null}
      {kind === "Email" ? (
        <>
          <rect x={2.5} y={4} width={13} height={10} rx={2} {...p} />
          <path d="M3 5 L9 9.8 L15 5" {...p} />
        </>
      ) : null}
      {kind === "Sheet" ? (
        <>
          <rect x={2.5} y={3} width={13} height={12} rx={2} {...p} />
          <path d="M2.5 7.5 H15.5 M7 3 V15" {...p} />
        </>
      ) : null}
      {kind === "CRM" ? (
        <>
          <circle cx={9} cy={6.5} r={3} {...p} />
          <path d="M3.5 15.5 C4 12 6 10.8 9 10.8 C12 10.8 14 12 14.5 15.5" {...p} />
        </>
      ) : null}
      {kind === "Payments" ? (
        <>
          <rect x={2.5} y={4.5} width={13} height={9} rx={2} {...p} />
          <path d="M2.5 8 H15.5" {...p} />
        </>
      ) : null}
    </svg>
  );
};

const NodeCard: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  shown: number;
  glow: number;
}> = ({ x, y, w, h, label, shown, glow }) => {
  if (shown <= 0) return null;
  const edge = `rgba(255,255,255,${mix(0.13, 0.9, glow).toFixed(3)})`;
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        borderRadius: 14,
        boxSizing: "border-box",
        backgroundColor: C.nightCard,
        border: `1.25px solid ${edge}`,
        boxShadow: `0 18px 40px -18px rgba(0,0,0,0.9), 0 0 ${24 * glow}px rgba(255,255,255,${(glow * 0.16).toFixed(3)})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        opacity: shown,
        scale: String(mix(0.86, 1, shown) + glow * 0.035),
      }}
    >
      <Icon kind={label} size={h > 60 ? 22 : 19} color={mix(0.62, 1, glow) > 0.8 ? "#fff" : "#C9C9D1"} />
      <div
        style={{
          fontFamily: FONT.sans,
          fontWeight: 500,
          fontSize: h > 60 ? 20 : 17,
          letterSpacing: TRACK.body,
          color: C.nightText,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const Automate: React.FC<{ k?: typeof AUTOMATE; length?: number }> = ({
  k = AUTOMATE,
  length = SCENES.automate.to - SCENES.automate.from,
}) => {
  const f = useSceneFrame();
  const L = useLayout();
  const { w, u } = L;
  const sc = L.stage.scale;
  const drift = driftX(f, length, 14 * u);

  // The line: in along the ground, up into the stage, through every node, out.
  const a = L.S(40, LINE_Y);
  const z = L.S(934, LINE_Y);
  const points: Pt[] = [
    { x: -70 * u, y: L.threadY },
    { x: a.x, y: L.threadY, r: 30 * u },
    { x: a.x, y: a.y, r: 30 * u },
    ...NODE_X.map((x) => ({ x: L.S(x, LINE_Y).x, y: a.y })),
    { x: z.x, y: z.y, r: 30 * u },
    { x: z.x, y: L.threadY, r: 30 * u },
    { x: w + 70 * u, y: L.threadY },
  ];
  const thread = useThread(points);
  const stops: Stop[] = [
    { frame: k.threadIn, point: 0 },
    { frame: k.nodes[0] - 24, point: 1, ease: EASE.soft },
    { frame: k.nodes[0] - 8, point: 2 },
    { frame: k.nodes[0], point: 3, ease: EASE.linear },
    { frame: k.nodes[1], point: 4 },
    { frame: k.nodes[2], point: 5 },
    { frame: k.nodes[3], point: 6 },
    { frame: k.nodes[3] + 10, point: 7 },
    { frame: k.threadAcross + 4, point: 8 },
    { frame: k.leaveFrom, point: 8 },
    { frame: k.leaveTo, point: 9, ease: EASE.inOut },
  ];
  const { progress, head } = useThreadHead(thread, stops, f);

  // Work on the line. Packet j reaches node i at T0 + j beats + i half-beats.
  const T0 = k.packetsFrom;
  const nodeGlow = (i: number): number => {
    const t = f - T0 - i * HALF;
    if (t < 0) return 0;
    return Math.exp(-(t % BEAT) / 3.6);
  };
  const packets: Array<{ x: number; fade: number }> = [];
  if (f >= T0 - HALF) {
    const jMax = Math.floor((f - T0) / BEAT) + 1;
    for (let j = Math.max(0, jMax - 6); j <= jMax; j++) {
      const pos = (f - T0 - j * BEAT) / HALF; // in node units
      const x = NODE_X[0] + (NODE_X[1] - NODE_X[0]) * pos;
      if (x < 40 || x > 934) continue;
      packets.push({ x, fade: Math.min(1, (x - 40) / 50, (934 - x) / 50) });
    }
  }
  // Branches fire on alternate packets.
  const branchState = (b: (typeof BRANCH)[number], index: number) => {
    const offset = b.from * HALF + (index === 1 ? BEAT : 0);
    const t = f - T0 - offset;
    if (t < 0) return { travel: -1, glow: 0 };
    const phase = t % (BEAT * 2);
    return {
      travel: phase <= HALF ? phase / HALF : -1,
      glow: phase >= HALF ? Math.exp(-(phase - HALF) / 3.6) : 0,
    };
  };

  // The agent card.
  const card = tween(f, k.agentOpen, 14, EASE.out);
  const done = tween(f, k.agentClose, 8, EASE.out);
  const agentLines = ["read 3 new enquiries", "draft the replies", "update the records"];

  const quillColor = C.nightText;
  const resting = f > k.threadAcross + 4 && f < k.leaveFrom;
  const lift = resting
    ? tween(f, k.threadAcross + 4, 10, EASE.out) * (1 - tween(f, k.leaveFrom - 9, 9, EASE.inOut)) * (15 * u + idleBob(f, 4 * u))
    : 0;

  return (
    <AbsoluteFill>
      <Night drift={drift}>
        <Plate id="night" opacity={0.5} blend="screen" />
      </Night>
      <AbsoluteFill style={{ translate: `${drift}px 0px` }}>
        {/* Branch lines and the line itself sit under the node cards. */}
        <div
          style={{
            position: "absolute",
            left: L.stage.x,
            top: L.stage.y,
            width: STAGE.w,
            height: STAGE.h,
            transformOrigin: "0 0",
            scale: String(sc),
          }}
        >
          <svg width={STAGE.w} height={STAGE.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            {BRANCH.map((b, i) => {
              const shown = tween(f, k.branches[i === 1 ? 1 : 0] + i * 2, 12, EASE.out);
              const y0 = b.y > LINE_Y ? LINE_Y + NODE.h / 2 : LINE_Y - NODE.h / 2;
              const y1 = b.y > LINE_Y ? b.y - 28 : b.y + 28;
              const st = branchState(b, i);
              return (
                <g key={b.label} opacity={shown}>
                  <line
                    x1={b.x}
                    y1={y0}
                    x2={b.x}
                    y2={mix(y0, y1, shown)}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={1.4}
                    strokeDasharray="3 5"
                  />
                  {st.travel >= 0 ? <circle cx={b.x} cy={mix(y0, y1, st.travel)} r={3.6} fill="#fff" /> : null}
                </g>
              );
            })}
            {/* Card leader */}
            <line
              x1={NODE_X[1]}
              y1={LINE_Y - NODE.h / 2}
              x2={NODE_X[1]}
              y2={mix(LINE_Y - NODE.h / 2, 242, card)}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1.4}
              opacity={card}
            />
          </svg>
        </div>

        <ThreadStroke d={thread.d} to={progress} width={L.threadWidth} color={C.sanguineBright} id="automate" />

        <div
          style={{
            position: "absolute",
            left: L.stage.x,
            top: L.stage.y,
            width: STAGE.w,
            height: STAGE.h,
            transformOrigin: "0 0",
            scale: String(sc),
          }}
        >
          {/* Packets of work, white-hot on the red line. */}
          <svg width={STAGE.w} height={STAGE.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            {packets.map((p, i) => (
              <g key={i} opacity={p.fade}>
                <circle cx={p.x} cy={LINE_Y} r={11} fill="rgba(255,255,255,0.16)" />
                <circle cx={p.x} cy={LINE_Y} r={5} fill="#fff" />
              </g>
            ))}
          </svg>

          {MAIN.map((label, i) => (
            <NodeCard
              key={label}
              x={NODE_X[i]}
              y={LINE_Y}
              w={NODE.w}
              h={NODE.h}
              label={label}
              shown={tween(f, k.nodes[i] - 2, 10, EASE.out)}
              glow={nodeGlow(i)}
            />
          ))}
          {BRANCH.map((b, i) => (
            <NodeCard
              key={b.label}
              x={b.x}
              y={b.y}
              w={150}
              h={56}
              label={b.label}
              shown={tween(f, k.branches[i === 1 ? 1 : 0] + 6 + i * 2, 10, EASE.out)}
              glow={branchState(b, i).glow}
            />
          ))}

          {/* What the agent is doing. */}
          {card > 0 ? (
            <div
              style={{
                position: "absolute",
                left: 200,
                top: 46,
                width: 324,
                height: 196,
                boxSizing: "border-box",
                borderRadius: 16,
                backgroundColor: C.nightRaise,
                border: "1.25px solid rgba(255,255,255,0.16)",
                boxShadow: "0 30px 60px -20px rgba(0,0,0,0.9)",
                padding: "16px 18px",
                opacity: card,
                scale: String(mix(0.9, 1, card)),
                transformOrigin: "50% 100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon kind="AI agent" color="#fff" />
                  <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 18.5, color: C.nightText, letterSpacing: TRACK.body }}>
                    AI agent
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 10.5,
                    letterSpacing: "0.08em",
                    color: done > 0.5 ? C.night : C.nightMuted,
                    backgroundColor: done > 0.5 ? C.nightText : "rgba(255,255,255,0.08)",
                    borderRadius: 9,
                    padding: "3px 9px",
                  }}
                >
                  {done > 0.5 ? "DONE" : "WORKING"}
                </div>
              </div>
              <div style={{ marginTop: 17, display: "flex", flexDirection: "column", gap: 12 }}>
                {agentLines.map((text, i) => {
                  const typed = tween(f, k.agentLines[i], 12, EASE.linear);
                  const tick = tween(f, k.agentLines[i] + 13, 7, EASE.out);
                  const chars = Math.round(text.length * typed);
                  return (
                    <div key={text} style={{ display: "flex", alignItems: "center", gap: 11, height: 26 }}>
                      <svg width={18} height={18} viewBox="0 0 18 18">
                        <circle cx={9} cy={9} r={7.5} fill={tick > 0 ? "#fff" : "none"} stroke="rgba(255,255,255,0.35)" strokeWidth={1.4} opacity={mix(1, 1, tick)} />
                        <path
                          d="M5.4 9.2 L8 11.7 L12.7 6.6"
                          fill="none"
                          stroke={C.night}
                          strokeWidth={1.9}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          pathLength={1}
                          strokeDasharray={`${tick.toFixed(3)} 2`}
                        />
                      </svg>
                      <div style={{ fontFamily: FONT.mono, fontSize: 16, color: mix(0, 1, tick) > 0.5 ? C.nightText : "#B9B9C2", letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
                        {text.slice(0, chars)}
                        {typed > 0 && typed < 1 ? <span style={{ opacity: 0.7 }}>▍</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Repetitive work, ticking itself off. */}
          {TASKS.map((label, i) => {
            const shown = tween(f, k.agentOpen + 4 + i * 4, 12, EASE.out);
            const tick = tween(f, k.tasks[i], 9, EASE.out);
            const cw = 218;
            const gap = (STAGE.w - 80 - cw * 4) / 3;
            return (
              <div
                key={label}
                style={{
                  position: "absolute",
                  left: 40 + i * (cw + gap),
                  top: 552,
                  width: cw,
                  height: 52,
                  boxSizing: "border-box",
                  borderRadius: 26,
                  border: `1.25px solid rgba(255,255,255,${mix(0.14, 0.5, tick).toFixed(3)})`,
                  backgroundColor: `rgba(255,255,255,${mix(0, 0.07, tick).toFixed(3)})`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0 16px",
                  opacity: shown,
                  translate: `0 ${(1 - shown) * 10}px`,
                }}
              >
                <svg width={18} height={18} viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
                  <circle cx={9} cy={9} r={7.5} fill={tick > 0.4 ? "#fff" : "none"} stroke="rgba(255,255,255,0.4)" strokeWidth={1.4} />
                  <path
                    d="M5.4 9.2 L8 11.7 L12.7 6.6"
                    fill="none"
                    stroke={C.night}
                    strokeWidth={1.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={1}
                    strokeDasharray={`${tick.toFixed(3)} 2`}
                  />
                </svg>
                <div style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 18, color: tick > 0.4 ? C.nightText : "#A9A9B3", letterSpacing: TRACK.body, whiteSpace: "nowrap" }}>
                  {label}
                </div>
                <div style={{ marginLeft: "auto", fontFamily: FONT.mono, fontSize: 10, letterSpacing: "0.1em", color: C.nightMuted, opacity: tick }}>
                  AUTO
                </div>
              </div>
            );
          })}
        </div>

        <TitleBlock
          f={f}
          L={L}
          at={k.word}
          captionAt={k.caption}
          index="02"
          word="Automate."
          caption={["AI agents · workflows", "integrations"]}
          captionOneLine="AI agents · workflows · integrations"
          dark
        />

        <Quill
          x={head.x}
          y={head.y}
          size={L.quillSize}
          rotate={quillLean(head, resting ? 0 : 1)}
          lift={lift}
          color={quillColor}
          shadow={false}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
