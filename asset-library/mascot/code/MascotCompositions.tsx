// Nib's compositions: a demo episode in the Studio, and reference sheets.

import React from "react";
import { AbsoluteFill, Composition, Folder, Sequence, Still } from "remotion";
import { Paper } from "../components/Surface";
import { Captions, evenWords } from "../kit/VideoKit";
import { C, FONT } from "../theme";
import { FPS } from "../timeline";
import { Actor, useFollowCamera, type Script } from "./Actor";
import { Mascot } from "./Mascot";
import { applyPose, EXPRESSIONS, GESTURES, REST, type BodyColor, type Expression, type Gesture, type Hat, type PoseInput, type PropName } from "./rig";
import { FLOOR_Y, MARKS, Studio, type MonitorShows, type TimeOfDay } from "./Studio";

// ---------------------------------------------------------------------------
// Demo episode (12 s): Nib walks in, waves, introduces the studio, has an idea.
// ---------------------------------------------------------------------------

export const EPISODE_DEMO: Script = {
  start: { x: -200, y: FLOOR_Y, scale: 0.9, expression: "neutral", gesture: "rest" },
  walk: [
    { from: 0, to: 54, toX: MARKS.centre },
    { from: 250, to: 300, toX: MARKS.desk - 60 },
  ],
  cues: [
    { at: 56, pose: { facing: 1, expression: "happy" } },
    { at: 60, pose: { expression: "joy" }, dur: 8 },
    { at: 100, pose: { gesture: "present", expression: "happy" }, dur: 14 },
    { at: 160, pose: { gesture: "think", expression: "thinking" }, dur: 14 },
    { at: 205, pose: { gesture: "cheer", expression: "surprised", prop: "bulb" }, dur: 8 },
    { at: 232, pose: { gesture: "rest", expression: "determined", prop: "none" }, dur: 12 },
    { at: 302, pose: { facing: -1, gesture: "point", expression: "proud", prop: "pencil" }, dur: 12 },
  ],
  wave: [{ from: 64, to: 96 }],
  talk: [
    { from: 100, to: 150 },
    { from: 306, to: 350 },
  ],
  hop: [{ at: 206 }],
  nod: [{ from: 120, to: 140 }],
  seed: 3,
};

export const NibDemo: React.FC<{ time: TimeOfDay; monitor: MonitorShows }> = ({ time, monitor }) => {
  // In 16:9 this is the whole set; in 9:16 and 1:1 it follows Nib.
  const camera = useFollowCamera(EPISODE_DEMO);
  return (
    <AbsoluteFill>
      <Studio time={time} monitor={monitor} camera={camera}>
        <Actor script={EPISODE_DEMO} />
      </Studio>
      <Sequence from={100} durationInFrames={56}>
        <Captions words={evenWords("Hi! I'm Nib. Welcome to the studio.", 0, 7)} perPage={7} />
      </Sequence>
      <Sequence from={306} durationInFrames={48}>
        <Captions words={evenWords("Let's sketch it, then ship it.", 0, 7)} perPage={7} />
      </Sequence>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Reference sheets
// ---------------------------------------------------------------------------

type Cell = { label: string; pose: PoseInput; /** Shift the character sideways in its card. */ dx?: number };

const Sheet: React.FC<{ title: string; cells: Cell[]; cols: number; zoom?: "face" | "full" }> = ({ title, cells, cols, zoom = "full" }) => {
  const rows = Math.ceil(cells.length / cols);
  const cw = 360;
  const ch = zoom === "face" ? 330 : 560;
  const W = cols * cw;
  const H = rows * ch + 110;
  return (
    <AbsoluteFill>
      <Paper />
      {/* Wrapped: Paper is absolutely positioned and would otherwise paint over an in-flow svg. */}
      <AbsoluteFill>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <text x={36} y={66} fontFamily={FONT.sans} fontWeight={600} fontSize={40} letterSpacing="-1.5" fill={C.ink}>
          {title}
        </text>
        {cells.map((c, i) => {
          const cx = (i % cols) * cw + cw / 2;
          const top = 110 + Math.floor(i / cols) * ch;
          const pose = applyPose(REST, { ...c.pose });
          return (
            <g key={c.label}>
              <rect x={(i % cols) * cw + 10} y={top + 6} width={cw - 20} height={ch - 16} rx={18} fill={C.paperBright} stroke={C.taupeLight} strokeWidth={2} />
              {zoom === "face" ? (
                <g transform={`translate(${cx} ${top + 470}) scale(0.92)`}>
                  <Mascot pose={{ ...pose, x: 0, y: 0 }} id={`s${i}`} />
                </g>
              ) : (
                <g transform={`translate(${cx + (c.dx ?? 0)} ${top + ch - 70}) scale(0.82)`}>
                  <Mascot pose={{ ...pose, x: 0, y: 0 }} id={`s${i}`} />
                </g>
              )}
              <text x={cx} y={top + ch - 26} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={C.graphite}>
                {c.label}
              </text>
            </g>
          );
        })}
      </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const exprCells: Cell[] = (Object.keys(EXPRESSIONS) as Expression[]).map((e) => ({ label: e, pose: { expression: e } }));
const gestureCells: Cell[] = (Object.keys(GESTURES) as Gesture[]).map((g) => ({
  label: g,
  pose: { gesture: g, expression: g === "cheer" ? "joy" : g === "think" ? "thinking" : g === "shrug" ? "worried" : g === "hips" ? "proud" : "happy", prop: g === "hold" ? "mug" : "none" },
}));
const outfitCells: Cell[] = [
  ...(["none", "beret", "hardhat", "headphones"] as Hat[]).map((h) => ({ label: `hat: ${h}`, pose: { hat: h, expression: "happy" as const } })),
  { label: "glasses", pose: { glasses: true, expression: "proud" } },
  ...(["paper", "sanguine"] as BodyColor[]).map((b) => ({ label: `body: ${b}`, pose: { body: b, expression: "happy" as const } })),
  ...(["pencil", "mug", "laptop", "phone", "flag", "bulb", "wrench"] as PropName[]).map((p) => ({
    label: `prop: ${p}`,
    // "hold" keeps the hand inside the card; "reach" would push it past the edge.
    pose: { prop: p, gesture: "hold" as const, expression: "happy" as const },
    dx: -40,
  })),
];

const SETS: Array<{ id: string; time: TimeOfDay; monitor: MonitorShows; sign: boolean }> = [
  { id: "Day", time: "day", monitor: "site", sign: true },
  { id: "Golden", time: "golden", monitor: "chart", sign: true },
  { id: "Night", time: "night", monitor: "code", sign: true },
];

export const MascotCompositions: React.FC = () => (
  <Folder name="Nib">
    <Composition id="Nib-Demo" component={NibDemo} durationInFrames={360} fps={FPS} width={1920} height={1080} defaultProps={{ time: "day" as TimeOfDay, monitor: "site" as MonitorShows }} />
    <Composition id="Nib-Demo-Vertical" component={NibDemo} durationInFrames={360} fps={FPS} width={1080} height={1920} defaultProps={{ time: "golden" as TimeOfDay, monitor: "chart" as MonitorShows }} />
    <Still id="Nib-Expressions" component={() => <Sheet title="Nib — expressions" cells={exprCells} cols={6} />} width={2160} height={1340} />
    <Still id="Nib-Gestures" component={() => <Sheet title="Nib — gestures" cells={gestureCells} cols={6} />} width={2160} height={1340} />
    <Still id="Nib-Outfits" component={() => <Sheet title="Nib — outfits and props" cells={outfitCells} cols={7} />} width={2520} height={1340} />
    {SETS.map((s) => (
      <Still key={s.id} id={`Studio-${s.id}`} component={() => <Studio time={s.time} monitor={s.monitor} sign={s.sign} />} width={1920} height={1080} />
    ))}
  </Folder>
);
