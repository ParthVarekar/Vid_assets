// What each rig control does: Quill at the minimum, the default and the maximum
// of the main channels. Rendered into docs/RIG-REFERENCE.md by
// scripts/docs/make-rig-reference.mjs.
//
//   npx remotion still RigSheet out/rig.png --gl=angle
//
// All birds share one canvas (browsers cap WebGL contexts at ~16) with a narrow
// lens, so the z = 0 plane maps linearly to pixels and the HTML labels line up.

import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { C, FONT } from "../theme";
import { Bird, ContactShadow, RigLights } from "./Bird";
import { BIRDS } from "./characters/config";
import { STUDIO } from "./lighting";
import { CHANNEL_BY_ID } from "./rig/schema";

/** Two channels per row, three birds each: minimum, default, maximum. */
export const RIG_SHEET_CHANNELS = ["lean", "tilt", "twist", "stretch", "fluff", "lookX", "lookY", "blinkL", "lidTiltL", "lidOpen", "squint", "pupil", "beakOpen", "wingL", "wingSwingL", "crest"];

const COLS = 6;
const CELL_W = 1.9;
const HEAD_H = 0.45;
const BIRD_H = 1.9;
const LABEL_H = 0.45;
const ROW_H = HEAD_H + BIRD_H + LABEL_H;
const ROWS = Math.ceil(RIG_SHEET_CHANNELS.length / 2);
const TITLE_H = 1.0;
const PAD = 0.3;
const FOV = 12;
const YAW = 25; // a little turn shows depth (lean, swing) as well as the face

const W = COLS * CELL_W + 2 * PAD;
const H = TITLE_H + ROWS * ROW_H;
const SCALE = 150;
export const RIG_SHEET = { width: Math.round(W * SCALE), height: Math.round(H * SCALE) };

const fmt = (id: string, v: number) => `${+v.toFixed(2)}${CHANNEL_BY_ID[id]?.unit === "deg" ? "°" : ""}`;

export const RigSheet: React.FC = () => {
  const { width, height } = useVideoConfig();
  const ppu = height / H;
  const dist = H / 2 / Math.tan((FOV * Math.PI) / 360);
  const cellX = (c: number) => -W / 2 + PAD + (c + 0.5) * CELL_W;
  const rowTop = (r: number) => H / 2 - TITLE_H - r * ROW_H;
  const px = (x: number) => width / 2 + x * ppu;
  const py = (y: number) => (H / 2 - y) * ppu;
  const bird = BIRDS.quill;

  const birds: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];
  RIG_SHEET_CHANNELS.forEach((id, i) => {
    const ch = CHANNEL_BY_ID[id];
    const row = Math.floor(i / 2);
    const slot = i % 2;
    const base = rowTop(row) - HEAD_H - BIRD_H;
    labels.push(
      <div
        key={`h-${id}`}
        style={{ position: "absolute", left: px(cellX(slot * 3) - CELL_W / 2) + 8, top: py(rowTop(row)) + 6, fontFamily: FONT.sans, fontWeight: 600, fontSize: 30, letterSpacing: "-0.01em", color: C.ink }}
      >
        {ch.label} <span style={{ fontFamily: FONT.mono, fontWeight: 400, fontSize: 18, opacity: 0.6 }}>{id}</span>
      </div>,
    );
    [ch.min, ch.default, ch.max].forEach((v, j) => {
      const x = cellX(slot * 3 + j);
      birds.push(
        <React.Fragment key={`${id}-${j}`}>
          <Bird id="quill" rig={STUDIO} quality="preview" pose={{ [id]: v }} position={[x, base, 0]} yaw={YAW} />
          <ContactShadow position={[x, base + 0.001, 0.02]} radius={bird.body.width * 0.95} />
        </React.Fragment>,
      );
      labels.push(
        <div
          key={`l-${id}-${j}`}
          style={{ position: "absolute", left: px(x) - (CELL_W * ppu) / 2, width: CELL_W * ppu, top: py(base) + 8, textAlign: "center", fontFamily: FONT.mono, fontSize: 21, color: C.ink, opacity: j === 1 ? 0.5 : 0.85 }}
        >
          {j === 0 ? "min " : j === 2 ? "max " : "default "}
          {fmt(id, v)}
        </div>,
      );
    });
  });

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 70% at 50% 40%, #FBF7EF 0%, #EFE7DA 60%, #DDD2C0 100%)" }}>
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} camera={{ fov: FOV, near: 1, far: 500, position: [0, 0, dist] }}>
        <RigLights rig={STUDIO} />
        {birds}
      </ThreeCanvas>
      {labels}
      <div style={{ position: "absolute", left: PAD * ppu + 8, top: 24, fontFamily: FONT.sans, fontWeight: 600, fontSize: 52, letterSpacing: "-0.02em", color: C.ink }}>
        Rig channels
        <span style={{ fontFamily: FONT.mono, fontWeight: 400, fontSize: 22, marginLeft: 24, opacity: 0.6 }}>Quill, each channel alone at its minimum, default and maximum</span>
      </div>
    </AbsoluteFill>
  );
};
