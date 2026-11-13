// Scene 1 — Hook. Paper, one line, one sentence.
// "Some ideas shouldn't stay ideas." is ProtoVinci's own pinned post.

import React from "react";
import { AbsoluteFill } from "remotion";
import { EASE, mix, tween } from "../animations/ease";
import { Plate } from "../components/Plate";
import { Quill } from "../components/Quill";
import { Geometry, Paper } from "../components/Surface";
import { ThreadStroke, useThread, useThreadHead } from "../components/Thread";
import { Headline, Mono } from "../components/Type";
import { C } from "../theme";
import { HOOK, SCENES } from "../timeline";
import { useLayout } from "../utilities/layout";
import type { Pt, Stop } from "../utilities/path";
import { driftX, idleBob, quillLean, useSceneFrame } from "./common";

export const Hook: React.FC<{ k?: typeof HOOK; length?: number }> = ({
  k = HOOK,
  length = SCENES.hook.to - SCENES.hook.from,
}) => {
  const f = useSceneFrame();
  const L = useLayout();
  const { w, h, u } = L;
  const drift = driftX(f, length, 14 * u);

  // Statement block.
  const size = L.type.hero;
  const lines = L.hookLines;
  const blockH = lines.length * size;
  // Indented so the quill can wait in the margin without covering the words.
  const left = L.margin + (L.format === "wide" ? 132 : 112) * u;
  const top = (L.format === "tall" ? h * 0.455 : h * 0.47) - blockH / 2;

  // The line: an underline beneath the last words, then on toward the edge.
  const lastChars = lines[lines.length - 1].length;
  const underlineY = top + blockH + size * 0.17;
  const underlineEnd = Math.min(left + lastChars * size * 0.468 + 46 * u, w - L.margin - 150 * u);
  const drop = L.threadY - underlineY;
  const points: Pt[] = [
    { x: left - 118 * u, y: underlineY },
    { x: underlineEnd, y: underlineY - 5 * u, r: drop * 0.42 },
    { x: Math.min(underlineEnd + drop * 0.62, w - 30 * u), y: L.threadY, r: drop * 0.42 },
    { x: w + 70 * u, y: L.threadY },
  ];
  const thread = useThread(points, { wobble: 3.6 * u, seed: 3 });
  const stops: Stop[] = [
    { frame: k.underlineFrom, point: 0 },
    { frame: k.underlineTo, point: 1 },
    { frame: k.runFrom, point: 1 },
    { frame: k.runTo, point: 3, ease: EASE.inOut },
  ];
  const { progress, head } = useThreadHead(thread, stops, f);

  // The quill comes down, touches, then rides the tip of the line.
  const arrive = tween(f, k.quillIn, k.touch - k.quillIn, EASE.out);
  const drawing = f >= k.underlineFrom ? 1 : 0;
  const quillX = head.x + (1 - arrive) * 74 * u;
  const quillY = head.y - (1 - arrive) * 150 * u;
  const lift = (1 - arrive) * 34 * u + (drawing ? 0 : idleBob(f, 3 * u) * arrive);
  const lean = mix(-12, quillLean(head, drawing), arrive);

  const note = tween(f, k.note, 16, EASE.out);

  return (
    <AbsoluteFill>
      <Paper drift={drift}>
        <Plate id="hook" />
        <Geometry draw={tween(f, 0, 96, EASE.inOut)} drift={drift} variant={0} />
      </Paper>
      <AbsoluteFill style={{ translate: `${drift}px 0px` }}>
        <div style={{ position: "absolute", left, top }}>
          <Headline
            lines={lines}
            f={f}
            at={k.line1}
            stagger={k.lineStagger}
            size={size}
            color={C.ink}
          />
        </div>

        <ThreadStroke d={thread.d} to={progress} width={L.threadWidth * 1.08} chalk={1} id="hook" />

        {/* Margin note: where the idea stands. The proof scene answers it. */}
        <div
          style={{
            position: "absolute",
            left,
            top: underlineY + 34 * u,
            opacity: note,
            translate: `0 ${(1 - note) * 10 * u}px`,
          }}
        >
          <Mono size={L.type.mono} color={C.graphite} wide upper>
            status <span style={{ opacity: 0.5 }}>—</span>{" "}
            <span style={{ color: C.ink, fontWeight: 500 }}>on paper</span>
          </Mono>
        </div>

        <Quill
          x={quillX}
          y={quillY}
          size={L.quillSize}
          rotate={lean}
          lift={lift}
          opacity={tween(f, k.quillIn, 8)}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
