// Scene 2 — Sketch, then Build.
//
// The line sketches a rough wireframe: "the thing nobody's built yet". On one
// downbeat it snaps true and becomes the outline of a real interface. That
// snap is "Creativity, Engineered" shown rather than said.

import React from "react";
import { AbsoluteFill } from "remotion";
import { EASE, mix, pulse, tween } from "../animations/ease";
import { BROWSER, BrowserWindow, DASH, DashboardCard, PHONE, PhoneFrame } from "../components/Artefacts";
import { Quill } from "../components/Quill";
import { Geometry, Paper } from "../components/Surface";
import { SketchStroke, ThreadStroke, useThread, useThreadHead } from "../components/Thread";
import { TitleBlock } from "../components/TitleBlock";
import { Fig, Mono, Rise } from "../components/Type";
import { C, FONT, TRACK } from "../theme";
import { BUILD, SCENES } from "../timeline";
import { STAGE, useLayout } from "../utilities/layout";
import type { Pt, Stop } from "../utilities/path";
import { driftX, idleBob, quillLean, useSceneFrame } from "./common";

export const SketchBuild: React.FC<{ k?: typeof BUILD; length?: number }> = ({
  k = BUILD,
  length = SCENES.build.to - SCENES.build.from,
}) => {
  const f = useSceneFrame();
  const L = useLayout();
  const { w, h, u } = L;
  const sc = L.stage.scale;
  const drift = driftX(f, length, 14 * u);
  const B = BROWSER;

  // The snap.
  const snap = tween(f, k.snap, 5, EASE.out);
  const hush = tween(f, k.hush, k.snap - k.hush, EASE.inOut) * (1 - snap);
  const flash = pulse(f, k.snap, 9) * (f >= k.snap ? 1 : 0);

  // The line: along the ground, up the window's left side, across its top,
  // down its right side, and on.
  const tl = L.S(B.x, B.y);
  const tr = L.S(B.x + B.w, B.y);
  const points: Pt[] = [
    { x: -70 * u, y: L.threadY },
    { x: tl.x, y: L.threadY, r: 30 * u },
    { x: tl.x, y: tl.y, r: B.r * sc },
    { x: tr.x, y: tr.y, r: B.r * sc },
    { x: tr.x, y: L.threadY, r: 30 * u },
    { x: w + 70 * u, y: L.threadY },
  ];
  const thread = useThread(points, { wobble: 4.2 * u * (1 - snap), seed: 9 });
  const stops: Stop[] = [
    { frame: k.threadIn, point: 0 },
    { frame: k.reachWindow, point: 1, ease: EASE.soft },
    { frame: mix(k.reachWindow, k.sketchDone, 0.34), point: 2 },
    { frame: mix(k.reachWindow, k.sketchDone, 0.76), point: 3 },
    { frame: k.sketchDone, point: 4 },
    { frame: k.leaveFrom, point: 4 },
    { frame: k.leaveTo, point: 5, ease: EASE.inOut },
  ];
  const { progress, head } = useThreadHead(thread, stops, f);

  // Secondary sketch marks, in stage coordinates.
  const P = (x: number, y: number): Pt => L.S(B.x + x, B.y + y);
  const s0 = k.secondaryFrom;
  const mark = (start: number, duration: number) =>
    tween(f, s0 + start * k.sketchRate, Math.max(3, duration * k.sketchRate), EASE.pen);
  const thin = 2.6 * u;
  const box = (x: number, y: number, bw: number, bh: number): Pt[] => [
    P(x, y),
    P(x + bw, y),
    P(x + bw, y + bh),
    P(x, y + bh),
  ];

  // The quill lifts off the page at the snap and hovers while things lock in.
  const locks = [k.nav, k.headline, k.subcopy, k.button, k.image, k.phone, k.dashboard];
  const tap = Math.max(0, ...locks.map((t) => pulse(f, t, 11)));
  const hover = tween(f, k.snap, 10, EASE.out) * (1 - tween(f, k.leaveFrom - 9, 9, EASE.inOut));
  const drawing = f < k.sketchDone || f >= k.leaveFrom ? 1 : 0;
  const lift = hover * (17 * u - 10 * u * tap) + hover * idleBob(f, 4 * u);

  const noteOut = k.snap - 5;
  const noteSize = L.type.lead * (L.format === "wide" ? 1.32 : 1.2);
  const figSize = L.type.mono * 0.92;
  const fig2 = L.S(B.x + 22, B.y + B.h + 16);
  const fig3 = L.S(PHONE.x - 4, PHONE.y + PHONE.h + 14);
  // In the narrower formats the label would run off the right edge.
  const fig4 = L.S(
    L.format === "wide" ? DASH.x : L.format === "tall" ? DASH.x - 170 : DASH.x - 96,
    DASH.y - 36,
  );

  return (
    <AbsoluteFill>
      <Paper bright={tween(f, k.snap, 9, EASE.out)} drift={drift}>
        <Geometry draw={tween(f, -10, 110, EASE.inOut)} drift={drift} variant={1} opacity={0.55 - snap * 0.2} />
      </Paper>
      <AbsoluteFill style={{ backgroundColor: "#fff", opacity: flash * 0.5 }} />

      <AbsoluteFill style={{ translate: `${drift}px 0px` }}>
        {/* Built artefacts (stage space). Dashboard at the back, phone in front. */}
        <div
          style={{
            position: "absolute",
            left: L.stage.x,
            top: L.stage.y,
            width: STAGE.w,
            height: STAGE.h,
            transformOrigin: "0 0",
            scale: String(sc * (1 - hush * 0.012)),
          }}
        >
          <DashboardCard f={f} k={k} />
          <PhoneFrame f={f} k={k} />
          <BrowserWindow f={f} k={k} />
        </div>

        {/* The sketch: secondary marks, gone the instant it becomes real. */}
        <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, opacity: 1 - snap }}>
          <SketchStroke points={[P(0, B.h), P(B.w, B.h)]} draw={mark(52, 26)} width={thin * 1.25} seed={21} wobble={3 * u} />
          <SketchStroke points={[P(0, B.bar), P(B.w, B.bar)]} draw={mark(6, 20)} width={thin} seed={22} />
          {[0, 1, 2].map((i) => (
            <SketchStroke
              key={i}
              points={box(18 + i * 17, 17, 9, 9)}
              closed
              radius={4}
              draw={mark(14 + i * 3, 8)}
              width={thin * 0.8}
              seed={30 + i}
              wobble={1.2 * u}
            />
          ))}
          <SketchStroke points={box(28, B.bar + 20, 14, 14)} closed radius={7} draw={mark(22, 10)} width={thin} seed={40} wobble={1.4 * u} />
          {[0, 1, 2].map((i) => (
            <SketchStroke
              key={`n${i}`}
              points={[P(360 + i * 62, B.bar + 27), P(402 + i * 62, B.bar + 27)]}
              draw={mark(26 + i * 4, 8)}
              width={thin}
              seed={44 + i}
              wobble={1.6 * u}
            />
          ))}
          <SketchStroke points={[P(30, B.bar + 100), P(300, B.bar + 100)]} draw={mark(34, 16)} width={thin * 3.1} seed={50} wobble={3 * u} />
          <SketchStroke points={[P(30, B.bar + 144), P(246, B.bar + 144)]} draw={mark(44, 14)} width={thin * 3.1} seed={51} wobble={3 * u} />
          <SketchStroke points={[P(30, B.bar + 198), P(250, B.bar + 198)]} draw={mark(54, 12)} width={thin} seed={52} />
          <SketchStroke points={[P(30, B.bar + 216), P(184, B.bar + 216)]} draw={mark(60, 10)} width={thin} seed={53} />
          <SketchStroke points={box(28, B.bar + 250, 148, 42)} closed radius={20} draw={mark(66, 18)} width={thin} seed={54} />
          <SketchStroke points={box(338, B.bar + 66, 214, 254)} closed radius={8} draw={mark(40, 30)} width={thin} seed={55} wobble={3 * u} />
          <SketchStroke points={[P(338, B.bar + 66), P(552, B.bar + 320)]} draw={mark(64, 12)} width={thin * 0.8} seed={56} opacity={0.7} />
          <SketchStroke points={[P(552, B.bar + 66), P(338, B.bar + 320)]} draw={mark(72, 12)} width={thin * 0.8} seed={57} opacity={0.7} />
        </svg>

        {/* The line itself. */}
        <ThreadStroke
          d={thread.d}
          to={progress}
          width={L.threadWidth * mix(1.08, 1, snap)}
          chalk={1 - snap}
          id="build"
        />

        {/* Figure labels. */}
        <Fig f={f} at={k.fig2} x={fig2.x} y={fig2.y} no="02" text="web app" size={figSize} />
        <Fig f={f} at={k.fig3} x={fig3.x} y={fig3.y} no="03" text="mobile" size={figSize} />
        <Fig f={f} at={k.fig4} x={fig4.x} y={fig4.y} no="04" text="internal tools" size={figSize} />

        {/* Notebook note, before the snap. */}
        <div
          style={{
            position: "absolute",
            left: L.text.x,
            top: L.text.y + (L.format === "wide" ? 70 * u : 6 * u),
          }}
        >
          <Rise f={f} at={k.note} out={noteOut} duration={15}>
            <Mono size={L.type.mono} color={C.graphite} wide upper>
              <span style={{ color: C.ink, fontWeight: 500 }}>fig. 01</span>
            </Mono>
          </Rise>
          <div
            style={{
              marginTop: 14 * u,
              fontFamily: FONT.sans,
              fontWeight: 500,
              fontSize: noteSize,
              lineHeight: 1.08,
              letterSpacing: TRACK.title,
              color: C.ink,
              whiteSpace: "nowrap",
            }}
          >
            {(L.format === "wide" ? ["the thing nobody's", "built yet."] : ["the thing nobody's built yet."]).map(
              (line, i) => (
                <Rise key={line} f={f} at={k.note + 5 + i * 5} out={noteOut + i * 2}>
                  {line}
                </Rise>
              ),
            )}
          </div>
        </div>

        {/* Build. */}
        <TitleBlock
          f={f}
          L={L}
          at={k.word}
          captionAt={k.caption}
          index="01"
          word="Build."
          caption={["websites · web apps", "mobile · custom software"]}
          captionOneLine="websites · web apps · mobile · custom software"
        />

        <Quill
          x={head.x}
          y={head.y}
          size={L.quillSize}
          rotate={quillLean(head, drawing) + hover * -4}
          lift={lift}
          // The hand withdraws while the phone and dashboard take the space
          // beside the window, and returns to draw the line onward.
          opacity={1 - tween(f, k.phone - 14, 10, EASE.out) + tween(f, k.leaveFrom - 14, 10, EASE.out)}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
