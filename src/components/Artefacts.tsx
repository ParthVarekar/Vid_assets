// The things that get built in the Build scene: a website, its mobile
// version and an internal tool. Designed and animated for the film rather
// than screen-recorded, so pacing and hierarchy stay under control.
//
// All coordinates are in stage space (1000 x 640).

import React from "react";
import { EASE, mix, pulse, tween } from "../animations/ease";
import { C, FONT, TRACK } from "../theme";

export const BROWSER = { x: 20, y: 40, w: 580, h: 390, r: 14, bar: 44 } as const;
export const PHONE = { x: 640, y: 168, w: 160, h: 360, r: 26 } as const;
export const DASH = { x: 700, y: 50, w: 290, h: 250, r: 14 } as const;

const sans = (size: number, weight = 500, color: string = C.ink): React.CSSProperties => ({
  fontFamily: FONT.sans,
  fontSize: size,
  fontWeight: weight,
  color,
  letterSpacing: TRACK.body,
  lineHeight: 1.15,
  whiteSpace: "nowrap",
});

/**
 * A component that starts as a flat wireframe block and resolves into its
 * finished form. `t` runs 0 (wireframe) to 1 (finished).
 */
const Resolve: React.FC<{
  t: number;
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
  children: React.ReactNode;
}> = ({ t, x, y, w, h, radius = 6, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: radius,
        backgroundColor: C.rule,
        opacity: 1 - t,
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: t,
        translate: `0 ${((1 - t) * 7).toFixed(2)}px`,
      }}
    >
      {children}
    </div>
  </div>
);

/** A small composition in the brand's own geometry, standing in for imagery. */
const BrandPanel: React.FC<{ w: number; h: number; radius: number; t?: number }> = ({
  w,
  h,
  radius,
  t = 1,
}) => (
  <svg width={w} height={h} style={{ display: "block", borderRadius: radius }}>
    <rect width={w} height={h} fill={C.paper} />
    <circle cx={w * 0.2} cy={h * 1.02} r={h * 0.78 * mix(0.86, 1, t)} fill={C.taupe} />
    <circle cx={w * 0.2} cy={h * 1.02} r={h * 0.98} fill="none" stroke={C.taupeLight} strokeWidth={1.2} />
    <line x1={w * 0.72} y1={0} x2={w * 0.72} y2={h} stroke={C.taupeLight} strokeWidth={1.2} />
    <line x1={0} y1={h * 0.24} x2={w} y2={h * 0.24} stroke={C.taupeLight} strokeWidth={1.2} />
    <rect x={w * 0.72 - 9} y={h * 0.24 - 9} width={18} height={18} fill={C.ink} />
    <rect x={w * 0.82} y={h * 0.62} width={12} height={12} fill={C.paperBright} stroke={C.taupe} strokeWidth={1} />
  </svg>
);

export type BuildTimes = {
  snap: number;
  nav: number;
  headline: number;
  subcopy: number;
  button: number;
  image: number;
  click: number;
  phone: number;
  dashboard: number;
  rows: number;
  chart: number;
};

/** The website. Appears as a precise wireframe at the snap, then resolves. */
export const BrowserWindow: React.FC<{ f: number; k: BuildTimes }> = ({ f, k }) => {
  const appear = tween(f, k.snap, 5, EASE.out);
  const B = BROWSER;
  const r = (at: number) => tween(f, at, 11, EASE.out);
  const press = pulse(f, k.click, 12);
  const ring = tween(f, k.click, 16, EASE.out);
  return (
    <div
      style={{
        position: "absolute",
        left: B.x,
        top: B.y,
        width: B.w,
        height: B.h,
        borderRadius: B.r,
        backgroundColor: C.white,
        boxShadow: `0 ${mix(4, 34, appear)}px ${mix(8, 70, appear)}px -24px rgba(52,38,24,0.38), 0 0 0 1px rgba(9,9,11,0.07)`,
        opacity: appear,
        overflow: "hidden",
      }}
    >
      {/* Window bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: B.w,
          height: B.bar,
          borderBottom: `1px solid ${C.rule}`,
          backgroundColor: "#FAFAFA",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 20 + i * 17,
              top: B.bar / 2 - 5,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: "#D9D9DE",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: B.w / 2 - 110,
            top: 10,
            width: 220,
            height: 24,
            borderRadius: 12,
            backgroundColor: "#F0F0F2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT.mono,
            fontSize: 11,
            color: C.graphite,
            letterSpacing: "0.02em",
          }}
        >
          your-idea.com
        </div>
      </div>

      {/* Navigation */}
      <Resolve t={r(k.nav)} x={28} y={B.bar + 14} w={B.w - 56} h={26} radius={6}>
        <div style={{ display: "flex", alignItems: "center", height: 26, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: C.ink }} />
            <div style={sans(15, 600)}>yourbrand</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            {["Product", "Pricing", "Contact"].map((t) => (
              <div key={t} style={sans(12.5, 500, C.graphite)}>
                {t}
              </div>
            ))}
            <div
              style={{
                ...sans(12, 600, C.white),
                backgroundColor: C.ink,
                borderRadius: 13,
                padding: "6px 13px",
              }}
            >
              Get started
            </div>
          </div>
        </div>
      </Resolve>

      {/* Headline */}
      <Resolve t={r(k.headline)} x={28} y={B.bar + 76} w={292} h={92} radius={8}>
        <div
          style={{
            ...sans(42, 600),
            letterSpacing: "-0.045em",
            lineHeight: 1.06,
          }}
        >
          Your idea,
          <br />
          live in weeks.
        </div>
      </Resolve>

      {/* Supporting copy */}
      <Resolve t={r(k.subcopy)} x={28} y={B.bar + 186} w={236} h={40} radius={6}>
        <div style={{ ...sans(14.5, 500, C.graphite), lineHeight: 1.38 }}>
          Designed, built and launched
          <br />
          by one team.
        </div>
      </Resolve>

      {/* Button */}
      <Resolve t={r(k.button)} x={28} y={B.bar + 250} w={148} h={42} radius={21}>
        <div
          style={{
            ...sans(14, 600, C.white),
            width: 148,
            height: 42,
            borderRadius: 21,
            backgroundColor: C.ink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            scale: String(1 - press * 0.05),
          }}
        >
          Start a project <span style={{ opacity: 0.7 }}>→</span>
        </div>
        {ring > 0 && ring < 1 ? (
          <div
            style={{
              position: "absolute",
              left: -8 - ring * 14,
              top: -8 - ring * 14,
              width: 164 + ring * 28,
              height: 58 + ring * 28,
              borderRadius: 40,
              border: `1.5px solid ${C.ink}`,
              opacity: (1 - ring) * 0.35,
            }}
          />
        ) : null}
      </Resolve>

      {/* Image panel */}
      <Resolve t={r(k.image)} x={338} y={B.bar + 66} w={214} h={254} radius={12}>
        <BrandPanel w={214} h={254} radius={12} t={r(k.image)} />
      </Resolve>
    </div>
  );
};

/** The same product on a phone. Slides out from behind the window. */
export const PhoneFrame: React.FC<{ f: number; k: BuildTimes }> = ({ f, k }) => {
  const t = tween(f, k.phone, 20, EASE.out);
  if (t <= 0) return null;
  const P = PHONE;
  const item = (i: number) => tween(f, k.phone + 6 + i * 4, 12, EASE.out);
  return (
    <div
      style={{
        position: "absolute",
        left: P.x - (1 - t) * 130,
        top: P.y + (1 - t) * 12,
        width: P.w,
        height: P.h,
        borderRadius: P.r,
        backgroundColor: C.ink,
        padding: 5,
        boxShadow: "0 30px 60px -22px rgba(52,38,24,0.5)",
        opacity: Math.min(1, t * 2.4),
      }}
    >
      <div
        style={{
          position: "relative",
          width: P.w - 10,
          height: P.h - 10,
          borderRadius: P.r - 5,
          backgroundColor: C.white,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: (P.w - 10) / 2 - 22,
            top: 7,
            width: 44,
            height: 12,
            borderRadius: 6,
            backgroundColor: C.ink,
          }}
        />
        <div style={{ position: "absolute", left: 14, top: 32, display: "flex", alignItems: "center", gap: 6, opacity: item(0) }}>
          <div style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: C.ink }} />
          <div style={sans(11, 600)}>yourbrand</div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 14,
            top: 58,
            ...sans(21, 600),
            letterSpacing: "-0.045em",
            lineHeight: 1.06,
            opacity: item(1),
            translate: `0 ${(1 - item(1)) * 6}px`,
          }}
        >
          Your idea,
          <br />
          live in weeks.
        </div>
        <div style={{ position: "absolute", left: 14, top: 118, opacity: item(2), translate: `0 ${(1 - item(2)) * 6}px` }}>
          <BrandPanel w={P.w - 38} h={96} radius={10} />
        </div>
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 14,
              top: 226 + i * 38,
              width: P.w - 38,
              height: 30,
              borderRadius: 8,
              border: `1px solid ${C.rule}`,
              opacity: item(3 + i),
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 9px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: i === 0 ? C.taupe : C.rule }} />
            <div style={{ width: 54 - i * 12, height: 5, borderRadius: 3, backgroundColor: C.rule }} />
          </div>
        ))}
        <div
          style={{
            position: "absolute",
            left: 14,
            top: 306,
            width: P.w - 38,
            height: 30,
            borderRadius: 15,
            backgroundColor: C.ink,
            ...sans(11.5, 600, C.white),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: item(5),
          }}
        >
          Start a project
        </div>
      </div>
    </div>
  );
};

/** An internal tool: orders, status and a chart. */
export const DashboardCard: React.FC<{ f: number; k: BuildTimes }> = ({ f, k }) => {
  const t = tween(f, k.dashboard, 20, EASE.out);
  if (t <= 0) return null;
  const D = DASH;
  const chart = tween(f, k.chart, 30, EASE.inOut);
  const pts: Array<[number, number]> = [
    [0, 52], [26, 46], [52, 49], [78, 36], [104, 39], [130, 27], [156, 30], [182, 17], [208, 20], [234, 7], [258, 4],
  ];
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ");
  const rows = ["Catalogue order", "Showroom enquiry", "Certificate batch"];
  return (
    <div
      style={{
        position: "absolute",
        left: D.x,
        top: D.y + (1 - t) * 34,
        width: D.w,
        height: D.h,
        borderRadius: D.r,
        backgroundColor: C.white,
        boxShadow: "0 30px 60px -26px rgba(52,38,24,0.4), 0 0 0 1px rgba(9,9,11,0.07)",
        opacity: Math.min(1, t * 2.2),
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: 16, top: 14, ...sans(14.5, 600) }}>Orders</div>
      <div
        style={{
          position: "absolute",
          right: 14,
          top: 13,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 9px",
          borderRadius: 10,
          backgroundColor: "#F0F0F2",
          fontFamily: FONT.mono,
          fontSize: 10,
          color: C.inkSoft,
          letterSpacing: "0.06em",
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: C.ink,
            opacity: 0.45 + 0.55 * Math.abs(Math.sin(f * 0.17)),
          }}
        />
        LIVE
      </div>
      <svg width={258} height={62} style={{ position: "absolute", left: 16, top: 46, overflow: "visible" }}>
        {[14, 34, 54].map((y) => (
          <line key={y} x1={0} y1={y} x2={258} y2={y} stroke={C.rule} strokeWidth={1} />
        ))}
        <path
          d={`${line} L 258 62 L 0 62 Z`}
          fill={C.taupeLight}
          opacity={0.5 * chart}
          style={{ clipPath: `inset(0 ${((1 - chart) * 100).toFixed(2)}% 0 0)` }}
        />
        <path
          d={line}
          fill="none"
          stroke={C.ink}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={`${chart.toFixed(4)} 2`}
        />
      </svg>
      {rows.map((label, i) => {
        const rt = tween(f, k.rows + i * 5, 12, EASE.out);
        return (
          <div
            key={label}
            style={{
              position: "absolute",
              left: 16,
              top: 126 + i * 38,
              width: D.w - 32,
              height: 30,
              borderTop: `1px solid ${C.rule}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 10,
              opacity: rt,
              translate: `0 ${(1 - rt) * 6}px`,
            }}
          >
            <div style={{ ...sans(11.5, 500, C.inkSoft), marginRight: "auto", paddingLeft: 92 }}>{label}</div>
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 9.5,
                letterSpacing: "0.05em",
                color: i === 2 ? C.white : C.inkSoft,
                backgroundColor: i === 2 ? C.ink : "#F0F0F2",
                borderRadius: 8,
                padding: "3px 8px",
              }}
            >
              {i === 2 ? "SENT" : i === 1 ? "NEW" : "PAID"}
            </div>
          </div>
        );
      })}
    </div>
  );
};
