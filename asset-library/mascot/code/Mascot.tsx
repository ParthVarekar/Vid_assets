// Nib — the ProtoVinci mascot, drawn from a Pose. Pure: same pose, same picture.
//
// Nib is a fountain-pen nib come to life (the nib from the logo), with a cream
// quill feather for hair and arms and legs made of the brand's red-chalk line.
// The nib's slit and breather hole sit on its belly.
//
// Render inside any <svg>. Origin: ground point between the feet.

import React from "react";
import { C } from "../theme";
import type { Arm, Pose } from "./rig";

const HIP_Y = -116;
const SHOULDER = { x: 90, y: -262 };
const UPPER = 64;
const FORE = 58;
const LEG = 118;
const HEAD_PIVOT = -300;

const rad = (d: number) => (d * Math.PI) / 180;

/** Elbow and hand positions for an arm, in body space. side -1 left, +1 right. */
export const armPoints = (arm: Arm, side: -1 | 1) => {
  const s = { x: side * SHOULDER.x, y: SHOULDER.y };
  const a1 = rad(arm.shoulder);
  const e = { x: s.x + side * Math.sin(a1) * UPPER, y: s.y + Math.cos(a1) * UPPER };
  const a2 = rad(arm.shoulder + arm.elbow);
  const h = { x: e.x + side * Math.sin(a2) * FORE, y: e.y + Math.cos(a2) * FORE };
  return { s, e, h, handAngle: (Math.atan2(h.y - e.y, h.x - e.x) * 180) / Math.PI };
};

type Palette = { body: string; feature: string; eyeWhite: string; outline: string | null; limb: string; hand: string; handEdge: string };

const PALETTES: Record<Pose["body"], Palette> = {
  ink: { body: C.ink, feature: C.paperBright, eyeWhite: "#FFFFFF", outline: null, limb: C.sanguine, hand: C.ink, handEdge: C.paperBright },
  paper: { body: C.paperBright, feature: C.ink, eyeWhite: "#FFFFFF", outline: C.ink, limb: C.sanguine, hand: C.ink, handEdge: C.ink },
  sanguine: { body: C.sanguine, feature: C.paperBright, eyeWhite: "#FFFFFF", outline: null, limb: C.ink, hand: C.ink, handEdge: C.paperBright },
};

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

const BODY_PATH =
  "M0 -100 C -34 -142, -104 -214, -104 -298 C -104 -370, -62 -412, 0 -412 C 62 -412, 104 -370, 104 -298 C 104 -214, 34 -142, 0 -100 Z";

const Feather: React.FC<{ angle: number; id: string }> = ({ angle, id }) => (
  <g transform={`translate(0 -404) rotate(${angle.toFixed(2)})`}>
    <defs>
      <clipPath id={`feather-${id}`}>
        <path d="M0 6 C -26 -40, -24 -120, 50 -158 C 46 -100, 36 -40, 0 6 Z" />
      </clipPath>
    </defs>
    <path d="M0 6 C -26 -40, -24 -120, 50 -158 C 46 -100, 36 -40, 0 6 Z" fill="#F3ECDF" stroke={C.taupe} strokeWidth={2.5} />
    {/* Dipped in red chalk. */}
    <g clipPath={`url(#feather-${id})`}>
      <circle cx={52} cy={-160} r={34} fill={C.sanguine} />
    </g>
    <path d="M0 6 Q 12 -70 49 -152" fill="none" stroke={C.taupe} strokeWidth={3} strokeLinecap="round" />
    {/* Vane notches. */}
    <path d="M-17 -64 L -6 -60 M-14 -96 L -1 -90 M 30 -52 L 20 -56" stroke={C.taupe} strokeWidth={2.5} strokeLinecap="round" />
  </g>
);

const Eye: React.FC<{ cx: number; cy: number; open: number; lookX: number; lookY: number; happyClosed: boolean; p: Palette; id: string }> = ({
  cx,
  cy,
  open,
  lookX,
  lookY,
  happyClosed,
  p,
  id,
}) => {
  const rx = 25;
  const ry = 29 * Math.max(0, open);
  if (open < 0.14) {
    // Closed: a lid line, or a happy arc when smiling.
    const d = happyClosed ? `M${cx - 20} ${cy + 4} Q ${cx} ${cy - 14} ${cx + 20} ${cy + 4}` : `M${cx - 20} ${cy} Q ${cx} ${cy + 8} ${cx + 20} ${cy}`;
    return <path d={d} fill="none" stroke={p.feature} strokeWidth={6} strokeLinecap="round" />;
  }
  const px = cx + lookX * 9;
  const py = cy + lookY * 10;
  return (
    <g>
      <defs>
        <clipPath id={`eye-${id}`}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
        </clipPath>
      </defs>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={p.eyeWhite} stroke={p.outline ?? "none"} strokeWidth={p.outline ? 4 : 0} />
      <g clipPath={`url(#eye-${id})`}>
        <circle cx={px} cy={py} r={13} fill={C.ink} />
        <circle cx={px - 4.5} cy={py - 5} r={4.6} fill="#FFFFFF" />
      </g>
    </g>
  );
};

const Mouth: React.FC<{ open: number; smile: number; round: number; p: Palette; id: string }> = ({ open, smile, round, p, id }) => {
  const y = -254;
  const w = 42 * (1 - 0.45 * round) + open * 6;
  const h = open * 36;
  const corner = y - smile * 9;
  if (h < 3) {
    return (
      <path
        d={`M${-w / 2} ${corner} Q 0 ${y + smile * 13} ${w / 2} ${corner}`}
        fill="none"
        stroke={p.feature}
        strokeWidth={6}
        strokeLinecap="round"
      />
    );
  }
  const shape =
    round > 0.6
      ? `M0 ${y - h * 0.45} C ${w * 0.62} ${y - h * 0.45}, ${w * 0.62} ${y + h * 0.6}, 0 ${y + h * 0.6} C ${-w * 0.62} ${y + h * 0.6}, ${-w * 0.62} ${y - h * 0.45}, 0 ${y - h * 0.45} Z`
      : `M${-w / 2} ${corner} Q 0 ${y - h * 0.2 + smile * 5} ${w / 2} ${corner} Q 0 ${y + h + smile * 8} ${-w / 2} ${corner} Z`;
  return (
    <g>
      <defs>
        <clipPath id={`mouth-${id}`}>
          <path d={shape} />
        </clipPath>
      </defs>
      <path d={shape} fill="#3A0E07" />
      <g clipPath={`url(#mouth-${id})`}>
        <ellipse cx={0} cy={y + h * 0.75} rx={w * 0.34} ry={h * 0.32} fill={C.sanguineBright} />
      </g>
      <path d={shape} fill="none" stroke={p.feature} strokeWidth={4} strokeLinejoin="round" />
    </g>
  );
};

const Hat: React.FC<{ hat: Pose["hat"] }> = ({ hat }) => {
  if (hat === "beret") {
    return (
      <g transform="rotate(-10 0 -400)">
        <ellipse cx={-8} cy={-400} rx={84} ry={30} fill={C.sanguine} />
        <path d="M-88 -398 Q -8 -380 74 -394" fill="none" stroke="#9E3624" strokeWidth={5} strokeLinecap="round" />
        <rect x={-14} y={-440} width={10} height={16} rx={4} fill={C.sanguine} />
      </g>
    );
  }
  if (hat === "hardhat") {
    return (
      <g>
        <path d="M-86 -378 C -86 -440, 86 -440, 86 -378 Z" fill={C.sanguine} />
        <rect x={-104} y={-384} width={208} height={16} rx={8} fill={C.sanguine} />
        <path d="M-10 -436 V -380 M 10 -436 V -380" stroke="#9E3624" strokeWidth={5} />
      </g>
    );
  }
  if (hat === "headphones") {
    return (
      <g>
        <path d="M-104 -300 C -104 -452, 104 -452, 104 -300" fill="none" stroke={C.inkSoft} strokeWidth={14} strokeLinecap="round" />
        <rect x={-122} y={-334} width={30} height={64} rx={14} fill={C.sanguine} />
        <rect x={92} y={-334} width={30} height={64} rx={14} fill={C.sanguine} />
      </g>
    );
  }
  return null;
};

/** Props drawn at the right hand. Upright props ignore the forearm angle. */
const Prop: React.FC<{ prop: Pose["prop"]; x: number; y: number; angle: number; facing: number }> = ({ prop, x, y, facing }) => {
  const unflip = facing < 0 ? -1 : 1;
  switch (prop) {
    case "pencil":
      return (
        // Held upright in the fist, tip up, leaning slightly outward.
        <g transform={`translate(${x} ${y}) rotate(14)`}>
          <rect x={-8} y={-92} width={16} height={104} rx={3} fill={C.sanguine} />
          <rect x={-8} y={0} width={16} height={12} rx={2} fill={C.taupe} />
          <path d="M-8 -92 L 0 -118 L 8 -92 Z" fill="#E9D7B8" />
          <path d="M-3 -108 L 0 -118 L 3 -108 Z" fill={C.ink} />
        </g>
      );
    case "wrench":
      return (
        // Upright, open jaw at the top.
        <g transform={`translate(${x} ${y}) rotate(14)`}>
          <rect x={-8} y={-84} width={16} height={96} rx={6} fill={C.zinc} stroke={C.inkSoft} strokeWidth={3} />
          <path d="M-22 -84 A 22 22 0 1 1 22 -84 L 11 -84 L 11 -100 L -11 -100 L -11 -84 Z" fill={C.zinc} stroke={C.inkSoft} strokeWidth={3} strokeLinejoin="round" />
        </g>
      );
    case "mug":
      return (
        <g transform={`translate(${x - 4} ${y - 34})`}>
          <path d="M22 4 a 14 14 0 0 1 0 28" fill="none" stroke={C.paperBright} strokeWidth={6} />
          <rect x={-24} y={-8} width={46} height={52} rx={8} fill={C.paperBright} stroke={C.ink} strokeWidth={3} />
          <rect x={-24} y={10} width={46} height={10} fill={C.sanguine} />
        </g>
      );
    case "phone":
      return (
        <g transform={`translate(${x} ${y - 36})`}>
          <rect x={-20} y={-36} width={40} height={74} rx={8} fill={C.ink} stroke={C.paperBright} strokeWidth={3} />
          <rect x={-15} y={-29} width={30} height={60} rx={4} fill={C.paperBright} />
          <rect x={-10} y={-20} width={20} height={6} rx={2} fill={C.ink} />
          <rect x={-10} y={10} width={20} height={8} rx={4} fill={C.sanguine} />
        </g>
      );
    case "laptop":
      return (
        <g transform={`translate(${x - 10} ${y - 10})`}>
          <rect x={-70} y={-66} width={120} height={78} rx={6} fill={C.inkSoft} stroke={C.paperBright} strokeWidth={3} />
          <rect x={-62} y={-58} width={104} height={62} rx={3} fill={C.paperBright} />
          <rect x={-54} y={-48} width={52} height={10} rx={2} fill={C.ink} />
          <rect x={6} y={-48} width={28} height={34} rx={3} fill={C.taupe} />
          <rect x={-82} y={12} width={144} height={10} rx={5} fill={C.zinc} />
        </g>
      );
    case "flag":
      return (
        <g transform={`translate(${x} ${y})`}>
          {/* The flag hangs toward the body so it stays inside the frame. */}
          <rect x={-4} y={-140} width={8} height={160} rx={4} fill={C.taupe} />
          <path d="M-4 -138 H -104 L -88 -112 L -104 -86 H -4 Z" fill={C.sanguine} />
          <g transform={`translate(-52 -105) scale(${unflip} 1)`}>
            <text x={0} y={0} textAnchor="middle" fontFamily="Switzer" fontWeight={600} fontSize={20} fill="#FFFFFF" letterSpacing="-0.3">
              SHIP IT
            </text>
          </g>
        </g>
      );
    case "bulb":
      return (
        <g transform={`translate(${x} ${y - 70})`}>
          <circle cx={0} cy={-6} r={44} fill="#FFE7A8" opacity={0.45} />
          <path d="M-22 4 C -36 -12, -30 -44, 0 -46 C 30 -44, 36 -12, 22 4 L 16 16 H -16 Z" fill="#FFF6D6" stroke={C.ink} strokeWidth={3.5} />
          <rect x={-14} y={16} width={28} height={16} rx={4} fill={C.zinc} />
          <path d="M-8 -6 Q 0 -22 8 -6" fill="none" stroke={C.sanguine} strokeWidth={3.5} strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
};

// ---------------------------------------------------------------------------
// The character
// ---------------------------------------------------------------------------

export const Mascot: React.FC<{ pose: Pose; id?: string }> = ({ pose, id = "nib" }) => {
  const p = PALETTES[pose.body];
  const f = pose.face;
  const air = Math.max(0, pose.air);
  const bodyDy = pose.bounce - air;
  const sx = 1 - pose.stretch * 0.45;
  const sy = 1 + pose.stretch;

  // Legs: hips move with the body; feet stay on the floor unless lifted.
  const legPath = (side: -1 | 1) => {
    const leg = side < 0 ? pose.legL : pose.legR;
    const hip = { x: side * 30, y: HIP_Y + bodyDy };
    const foot = { x: side * 40 + leg.step, y: -leg.lift - air - 10 };
    const dx = foot.x - hip.x;
    const dy = foot.y - hip.y;
    const d = Math.hypot(dx, dy);
    // Knee bulges forward (toward +x in character space) when the leg is compressed.
    const bend = d < LEG ? Math.sqrt(LEG * LEG - d * d) * 0.6 : 0;
    const mx = (hip.x + foot.x) / 2 + bend;
    const my = (hip.y + foot.y) / 2;
    return { d: `M${hip.x} ${hip.y} Q ${mx} ${my} ${foot.x} ${foot.y}`, foot };
  };
  const legs = [legPath(-1), legPath(1)];

  const left = armPoints(pose.armL, -1);
  const right = armPoints(pose.armR, 1);
  const happyClosed = f.smile > 0.45;
  const shadowScale = Math.max(0.45, 1 - air / 320);

  return (
    <g transform={`translate(${pose.x} ${pose.y}) scale(${(pose.scale * pose.facing).toFixed(4)} ${pose.scale})`}>
      {/* Contact shadow */}
      <ellipse cx={0} cy={2} rx={96 * shadowScale} ry={13 * shadowScale} fill="rgba(52,38,24,0.2)" />

      {/* Legs and feet */}
      {legs.map((l, i) => (
        <g key={i}>
          <path d={l.d} fill="none" stroke={p.limb} strokeWidth={13} strokeLinecap="round" />
          <ellipse cx={l.foot.x + 10} cy={l.foot.y + 3} rx={28} ry={13} fill={p.hand} stroke={p.handEdge} strokeWidth={p.outline ? 0 : 0} />
        </g>
      ))}

      {/* Body, face, arms: everything above the hips */}
      <g transform={`translate(0 ${bodyDy}) rotate(${pose.lean} 0 ${HIP_Y}) translate(0 ${HIP_Y}) scale(${sx} ${sy}) translate(0 ${-HIP_Y})`}>
        <path d={BODY_PATH} fill={p.body} stroke={p.outline ?? "none"} strokeWidth={p.outline ? 6 : 0} />
        {/* Sheen */}
        <path d="M-78 -330 C -80 -372, -50 -398, -18 -400 C -46 -386, -64 -360, -66 -322 Z" fill="#FFFFFF" opacity={pose.body === "ink" ? 0.09 : 0.25} />
        {/* Nib slit and breather hole */}
        <path d="M0 -186 V -110" stroke={p.feature} strokeWidth={4} strokeLinecap="round" />
        <circle cx={0} cy={-196} r={10} fill={p.feature} />

        {/* Head group: tilts as one */}
        <g transform={`rotate(${pose.tilt} 0 ${HEAD_PIVOT}) translate(${f.lookX * 5} ${f.lookY * 3})`}>
          <Feather angle={pose.plume} id={id} />
          <Hat hat={pose.hat} />
          {/* Blush */}
          <ellipse cx={-64} cy={-270} rx={15} ry={8} fill="#F2876C" opacity={f.blush * 0.85} />
          <ellipse cx={64} cy={-270} rx={15} ry={8} fill="#F2876C" opacity={f.blush * 0.85} />
          <Eye cx={-36} cy={-308} open={f.openL} lookX={f.lookX} lookY={f.lookY} happyClosed={happyClosed} p={p} id={`${id}-l`} />
          <Eye cx={36} cy={-308} open={f.openR} lookX={f.lookX} lookY={f.lookY} happyClosed={happyClosed} p={p} id={`${id}-r`} />
          {/* Brows */}
          {([-1, 1] as const).map((s) => (
            <path
              key={s}
              d={`M${s * 36 - 17} 0 H ${s * 36 + 17}`}
              transform={`translate(0 ${-352 - f.browRaise * 13}) rotate(${s * f.browSlant * 18} ${s * 36} 0)`}
              stroke={p.feature}
              strokeWidth={7}
              strokeLinecap="round"
            />
          ))}
          {pose.glasses ? (
            <g fill="none" stroke={p.feature} strokeWidth={4.5}>
              <circle cx={-36} cy={-308} r={33} />
              <circle cx={36} cy={-308} r={33} />
              <path d="M-3 -312 Q 0 -318 3 -312" />
            </g>
          ) : null}
          <Mouth open={f.mouthOpen} smile={f.smile} round={f.round} p={p} id={id} />
        </g>

        {/* Arms (the red line) and hands */}
        {[left, right].map((a, i) => (
          <g key={i}>
            <path d={`M${a.s.x} ${a.s.y} L ${a.e.x} ${a.e.y} L ${a.h.x} ${a.h.y}`} fill="none" stroke={p.limb} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}
        <Prop prop={pose.prop} x={right.h.x} y={right.h.y} angle={right.handAngle} facing={pose.facing} />
        {[left, right].map((a, i) => (
          <circle key={i} cx={a.h.x} cy={a.h.y} r={16} fill={p.hand} stroke={p.handEdge} strokeWidth={3} />
        ))}
      </g>
    </g>
  );
};
