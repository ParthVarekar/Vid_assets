// Reference sheet of the pose library: every pose from content/poses on all
// three birds, in a labelled grid. Use it to check a pose reads at thumbnail
// size, on every bird.
//
//   npx remotion still PoseSheet-Expressions out/expressions.png --gl=angle
//   npx remotion still PoseSheet-Gestures    out/gestures.png    --gl=angle
//
// All 36 birds share one canvas (browsers cap WebGL contexts at ~16). The
// camera has a narrow lens, so the z = 0 plane maps linearly to pixels and the
// HTML labels sit exactly under each bird.

import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import expressionsJson from "../../content/poses/expressions.json";
import gesturesJson from "../../content/poses/gestures.json";
import { C, FONT } from "../theme";
import { Bird, ContactShadow, RigLights } from "./Bird";
import { BIRDS, type BirdId } from "./characters/config";
import { STUDIO } from "./lighting";

type Pose = { name: string; values: Record<string, number> };
const LIB: Record<"expressions" | "gestures", Pose[]> = {
  expressions: expressionsJson as unknown as Pose[],
  gestures: gesturesJson as unknown as Pose[],
};

const BIRD_ORDER: BirdId[] = ["quill", "ink", "chalk"];
const COLS = 6;
const ROWS_PER_BIRD = 2;
const CELL_W = 1.9;
const CELL_H = 2.35;
const MARGIN_L = 1.0;
const TITLE_H = 1.0;
const LABEL_H = 0.45;
const FOV = 12;

const W = MARGIN_L + COLS * CELL_W;
const H = TITLE_H + BIRD_ORDER.length * ROWS_PER_BIRD * CELL_H;
const SCALE = 170; // pixels per world unit
export const POSE_SHEET = { width: Math.round(W * SCALE), height: Math.round(H * SCALE) };

/** yaw: turn every bird this many degrees (default: gestures 20 to show depth, expressions 0 to face the camera). */
export type PoseSheetProps = { which: "expressions" | "gestures"; quality?: "preview" | "final"; yaw?: number };

export const PoseSheet: React.FC<PoseSheetProps> = ({ which, quality = "preview", yaw = which === "gestures" ? 20 : 0 }) => {
  const { width, height } = useVideoConfig();
  const ppu = height / H;
  const dist = H / 2 / Math.tan((FOV * Math.PI) / 360);
  const poses = LIB[which];
  const cellX = (c: number) => -W / 2 + MARGIN_L + (c + 0.5) * CELL_W;
  const cellBottom = (r: number) => H / 2 - TITLE_H - (r + 1) * CELL_H;
  const px = (x: number) => width / 2 + x * ppu;
  const py = (y: number) => (H / 2 - y) * ppu;

  const birds: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];
  BIRD_ORDER.forEach((id, bi) => {
    for (let half = 0; half < ROWS_PER_BIRD; half++) {
      const row = bi * ROWS_PER_BIRD + half;
      for (let c = 0; c < COLS; c++) {
        const pose = poses[half * COLS + c];
        if (!pose) continue;
        const x = cellX(c);
        const base = cellBottom(row) + LABEL_H;
        birds.push(
          <React.Fragment key={`${id}-${pose.name}`}>
            <Bird id={id} rig={STUDIO} quality={quality} pose={pose.values} position={[x, base, 0]} yaw={yaw} />
            <ContactShadow position={[x, base + 0.001, 0.02]} radius={BIRDS[id].body.width * 0.95} />
          </React.Fragment>,
        );
        labels.push(
          <div
            key={`l-${id}-${pose.name}`}
            style={{ position: "absolute", left: px(x) - (CELL_W * ppu) / 2, width: CELL_W * ppu, top: py(cellBottom(row) + LABEL_H) + 8, textAlign: "center", fontFamily: FONT.mono, fontSize: 22, color: C.ink, opacity: 0.8 }}
          >
            {pose.name}
          </div>,
        );
      }
    }
    // Bird name down the left margin, spanning its two rows.
    const top = py(cellBottom(bi * ROWS_PER_BIRD - 1));
    const h = ROWS_PER_BIRD * CELL_H * ppu;
    labels.push(
      <div
        key={`n-${id}`}
        style={{ position: "absolute", left: px(-W / 2), top, width: MARGIN_L * ppu, height: h, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div style={{ transform: "rotate(-90deg)", whiteSpace: "nowrap", fontFamily: FONT.sans, fontWeight: 600, fontSize: 44, letterSpacing: "-0.02em", color: C.ink }}>{BIRDS[id].name}</div>
      </div>,
    );
    if (bi > 0) {
      labels.push(<div key={`d-${id}`} style={{ position: "absolute", left: px(-W / 2) + 24, right: 24, top, height: 2, background: "rgba(60,50,40,0.18)" }} />);
    }
  });

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 70% at 50% 40%, #FBF7EF 0%, #EFE7DA 60%, #DDD2C0 100%)" }}>
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} camera={{ fov: FOV, near: 1, far: 400, position: [0, 0, dist] }}>
        <RigLights rig={STUDIO} />
        {birds}
      </ThreeCanvas>
      {labels}
      <div style={{ position: "absolute", left: MARGIN_L * ppu + 24, top: 28, fontFamily: FONT.sans, fontWeight: 600, fontSize: 56, letterSpacing: "-0.02em", color: C.ink }}>
        {which === "expressions" ? "Expressions" : "Gestures"}
        <span style={{ fontFamily: FONT.mono, fontWeight: 400, fontSize: 24, marginLeft: 24, opacity: 0.6 }}>content/poses/{which}.json</span>
      </div>
    </AbsoluteFill>
  );
};
