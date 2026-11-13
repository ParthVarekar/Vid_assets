// Scene 6 — Reveal and call to action.
//
// The logo is a quill resting in a curved stroke. The film has shown both all
// along: the quill that draws and the line it drew. Here the line curls into
// that stroke, the quill comes to rest in it, and the mark is whole.

import React from "react";
import { AbsoluteFill } from "remotion";
import { EASE, mix, mixColor, pulse, tween } from "../animations/ease";
import { Cradle, markGeometry, Quill } from "../components/Quill";
import { Geometry, Paper } from "../components/Surface";
import { ThreadStroke, useThread, useThreadHead } from "../components/Thread";
import { Headline, Mono, Rise } from "../components/Type";
import { C, FONT, TRACK } from "../theme";
import { REVEAL, SCENES } from "../timeline";
import { useLayout } from "../utilities/layout";
import type { Pt, Stop } from "../utilities/path";
import { climbSlope, driftX, quillLean, useSceneFrame } from "./common";

/** A hand-drawn underline that draws itself beneath its children. */
const Underlined: React.FC<{ draw: number; width: number; children: React.ReactNode }> = ({
  draw,
  width,
  children,
}) => (
  <span style={{ position: "relative", display: "inline-block" }}>
    {children}
    <svg
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      style={{ position: "absolute", left: "-1%", bottom: "-0.1em", width: "102%", height: "0.2em", overflow: "visible" }}
    >
      <path
        d="M 1 5.5 C 14 3.2, 27 7.4, 41 5.2 S 68 3.4, 82 5.6 S 95 4.6, 99 4.2"
        fill="none"
        stroke={C.sanguine}
        strokeWidth={width}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        // Revealed with a clip, not a dash: dashes misbehave on a stroke
        // that is not scaled with its path.
        style={{ clipPath: `inset(-200% ${((1 - Math.max(0, Math.min(1, draw))) * 100).toFixed(2)}% -200% -5%)` }}
        opacity={draw > 0.001 ? 1 : 0}
      />
    </svg>
  </span>
);

export const Reveal: React.FC<{
  k?: typeof REVEAL;
  length?: number;
  url?: string;
  fromCorner?: boolean;
}> = ({
  k = REVEAL,
  length = SCENES.reveal.to - SCENES.reveal.from,
  url = "protovinci.vercel.app",
  fromCorner = false,
}) => {
  const f = useSceneFrame();
  const L = useLayout();
  const { w, h, u } = L;
  const wide = L.format === "wide";
  const tall = L.format === "tall";
  const drift = fromCorner
    ? 0
    : driftX(f, length, 6 * u) * (1 - tween(f, k.reachTip - 20, 30, EASE.inOut));

  // Lockup geometry.
  const cx = w / 2;
  const markH = (wide ? 292 : tall ? 330 : 262) * u;
  const markCy = wide ? h * 0.33 : tall ? h * 0.355 : h * 0.3;
  const g = markGeometry(cx, markCy, markH);
  const wordSize = (wide ? 132 : tall ? 150 : 116) * u;
  const tagSize = (wide ? 44 : tall ? 50 : 40) * u;
  const wordTop = g.top + markH + 30 * u;
  const tagTop = wordTop + wordSize * 1.02 + 16 * u;

  // The line: in along the ground, a rising flourish, then round the cradle.
  const tip = g.cradle[0];
  const ahead = g.cradle[Math.min(4, g.cradle.length - 1)];
  const dl = Math.hypot(ahead.x - tip.x, ahead.y - tip.y) || 1;
  const dir = { x: (ahead.x - tip.x) / dl, y: (ahead.y - tip.y) / dl };
  const climb = L.threadY - tip.y;
  // In the cutdown this scene follows Scale directly, so the line arrives
  // through the bottom-left corner at the slope it left with.
  const slope = climbSlope(L);
  const entry: Pt[] = fromCorner
    ? [
        { x: -60 * u, y: h + 60 * u * slope },
        { x: 0, y: h },
        { x: ((h - L.threadY) * 0.7) / slope, y: h - (h - L.threadY) * 0.7 },
      ]
    : [
        { x: -70 * u, y: L.threadY },
        { x: Math.max(60 * u, cx - 560 * u), y: L.threadY },
        { x: Math.max(130 * u, cx - 400 * u), y: L.threadY - climb * 0.07 },
      ];
  const approach: Pt[] = [
    ...entry,
    { x: tip.x - 190 * u, y: tip.y + climb * 0.42 },
    { x: tip.x - 150 * u, y: tip.y - 20 * u },
    { x: tip.x - 78 * u, y: tip.y - 132 * u },
    { x: tip.x + 34 * u, y: tip.y - 150 * u },
    { x: tip.x - dir.x * 74 * u, y: tip.y - dir.y * 74 * u },
  ];
  const points: Pt[] = [...approach, ...g.cradle];
  const tipIndex = approach.length;
  const thread = useThread(points, { smooth: true });
  const stops: Stop[] = [
    { frame: k.threadIn, point: 0 },
    { frame: k.reachTip, point: tipIndex, ease: EASE.soft },
    { frame: k.cradleTo, point: points.length - 1, ease: EASE.pen },
  ];
  const { progress, head } = useThreadHead(thread, stops, f);
  const tipFraction = thread.fractions[tipIndex];
  // The tail follows the head home, so the whole line ends up inside the mark.
  const tail = tween(f, k.reachTip + 3, k.land - k.reachTip - 5, EASE.inOut) * tipFraction;
  const cradleDraw = Math.max(0, (progress - tipFraction) / (1 - tipFraction));

  // The quill: rides the tip, then lifts and comes to rest in the cradle.
  const dock = tween(f, k.cradleTo, k.land - k.cradleTo, EASE.inOut);
  const landed = f >= k.land;
  const grow = tween(f, k.threadIn, k.reachTip - k.threadIn, EASE.inOut);
  const quillX = mix(head.x, g.nib.x, dock);
  const quillY = mix(head.y, g.nib.y, dock);
  const quillLift = Math.sin(dock * Math.PI) * 30 * u;
  const quillRot = mix(quillLean(head, 1), 0, dock);

  // Landing, then the move that makes room for the call to action.
  const hit = pulse(f, k.land, 16) * (landed ? 1 : 0);
  const ink = tween(f, k.land, 10, EASE.out);
  const up = tween(f, k.moveUp, 22, EASE.inOut);
  const lockScale = mix(1, wide ? 0.6 : tall ? 0.6 : 0.58, up) * (1 + hit * 0.03);
  const lockTargetTop = wide ? 156 * u : tall ? h * 0.168 : 106 * u;
  const lockY = mix(0, lockTargetTop - g.top, up);

  const ctaSize = (wide ? 96 : tall ? 132 : 100) * u;
  const ctaTop = wide ? h * 0.535 : tall ? h * 0.425 : h * 0.42;
  const underline = tween(f, k.underline, 16, EASE.pen);
  const ship = (
    <Underlined draw={underline} width={L.threadWidth * 1.05}>
      Let&apos;s ship it.
    </Underlined>
  );
  const ctaLines: React.ReactNode[] = wide
    ? [<>Got a vision? {ship}</>]
    : ["Got a vision?", ship];
  const urlT = tween(f, k.url, 16, EASE.out);
  const footT = tween(f, k.foot, 16, EASE.out);
  const pillTop = ctaTop + ctaLines.length * ctaSize * 1.04 + (wide ? 52 : 44) * u;
  const pillSize = (wide ? 32 : tall ? 38 : 30) * u;

  return (
    <AbsoluteFill>
      <Paper drift={drift} bright={tween(f, k.land, 14, EASE.out) * 0.55}>
        <Geometry draw={tween(f, -12, 80, EASE.inOut)} drift={drift} variant={0} opacity={0.42} />
      </Paper>
      <AbsoluteFill style={{ backgroundColor: "#fff", opacity: hit * 0.35 }} />

      <AbsoluteFill style={{ translate: `${drift}px 0px` }}>
        <ThreadStroke d={thread.d} from={tail} to={progress} width={L.threadWidth} id="reveal" opacity={1 - ink} />

        {/* The lockup: mark, name, promise. */}
        <AbsoluteFill
          style={{
            transformOrigin: `${cx}px ${g.top}px`,
            translate: `0 ${lockY.toFixed(2)}px`,
            scale: String(lockScale),
          }}
        >
          <Cradle cx={cx} cy={markCy} height={markH} draw={cradleDraw} color={mixColor(C.sanguine, C.ink, ink)} />
          <Quill
            x={quillX}
            y={quillY}
            size={mix(L.quillSize, markH, grow)}
            rotate={quillRot}
            lift={quillLift}
            shadow={!landed}
          />
          <div style={{ position: "absolute", left: 0, width: w, top: wordTop, display: "flex", justifyContent: "center" }}>
            <Headline lines={["ProtoVinci"]} f={f} at={k.wordmark} size={wordSize} align="center" />
          </div>
          <div style={{ position: "absolute", left: 0, width: w, top: tagTop, display: "flex", justifyContent: "center" }}>
            <Rise f={f} at={k.tagline} duration={18}>
              <div
                style={{
                  fontFamily: FONT.sans,
                  fontWeight: 500,
                  fontSize: tagSize,
                  letterSpacing: TRACK.title,
                  color: C.inkSoft,
                  whiteSpace: "nowrap",
                  lineHeight: 1.1,
                }}
              >
                Creativity, Engineered.
              </div>
            </Rise>
          </div>
        </AbsoluteFill>

        {/* Call to action. */}
        <div style={{ position: "absolute", left: 0, width: w, top: ctaTop, display: "flex", justifyContent: "center" }}>
          <Headline lines={ctaLines} f={f} at={k.cta} size={ctaSize} stagger={6} align="center" lineHeight={1.04} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            width: w,
            top: pillTop,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: (wide ? 30 : 28) * u,
          }}
        >
          <div
            style={{
              opacity: urlT,
              translate: `0 ${(1 - urlT) * 14 * u}px`,
              backgroundColor: C.ink,
              color: C.white,
              borderRadius: pillSize * 1.2,
              padding: `${pillSize * 0.52}px ${pillSize * 1.05}px`,
              fontFamily: FONT.sans,
              fontWeight: 500,
              fontSize: pillSize,
              letterSpacing: TRACK.body,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              gap: pillSize * 0.45,
              boxShadow: `0 ${18 * u}px ${36 * u}px ${-16 * u}px rgba(52,38,24,0.55)`,
            }}
          >
            {url}
            <span style={{ opacity: 0.6 }}>→</span>
          </div>
          <div style={{ opacity: footT, translate: `0 ${(1 - footT) * 8 * u}px` }}>
            <Mono size={L.type.mono} color={C.graphite} wide upper>
              Build. Automate. Scale.
            </Mono>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
