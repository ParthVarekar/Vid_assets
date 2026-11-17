// The Studio: ProtoVinci's build-in-public workshop in Mumbai. The set for
// every Nib episode.
//
// Designed on a 1920 x 1080 stage, floor at y = 930. Layers, back to front:
//   back   wall, window (with the Bandra-Worli Sea Link), pinboard, shelf, neon sign
//   mid    desk with monitor, lamp, inkpot and quill, mug
//   actors whatever you pass as children (Nib, props)
//   front  plant, rug edge
//   light  time-of-day tint, lamp pool, sign glow
//
// <Studio time="night" monitor="code" camera={{ x: 960, y: 540, zoom: 1 }}>
//   <Actor script={...} />
// </Studio>
//
// Any frame size works: the camera window is fitted with "slice", so 9:16 and
// 1:1 crop around camera.x.

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { LogoMark } from "../components/Quill";
import { C, FONT } from "../theme";
import { hash, noise1 } from "../utilities/rng";

export const STAGE_W = 1920;
export const STAGE_H = 1080;
export const FLOOR_Y = 948;

/** Named spots on the floor. Use as Pose.x (and y = FLOOR_Y). */
export const MARKS = {
  board: 400,
  centre: 820,
  shelf: 930,
  desk: 1180,
  window: 1520,
} as const;

export type TimeOfDay = "day" | "golden" | "night";
export type MonitorShows = "site" | "code" | "chart" | "logo" | "off";
export type Camera = { x: number; y: number; zoom: number };

export type StudioProps = {
  time?: TimeOfDay;
  monitor?: MonitorShows;
  sign?: boolean;
  lamp?: boolean;
  camera?: Camera;
  children?: React.ReactNode;
};

// ---------------------------------------------------------------------------
// Sky and window
// ---------------------------------------------------------------------------

const SKY: Record<TimeOfDay, [string, string, string]> = {
  day: ["#C9DAE3", "#E6EEF0", "#F2F1EA"],
  golden: ["#E8B78E", "#F3D3AE", "#F8E9D3"],
  night: ["#0E1324", "#1C2238", "#2C3047"],
};

const Window: React.FC<{ time: TimeOfDay; f: number }> = ({ time, f }) => {
  const x = 1250, y = 140, w = 540, h = 520;
  const [top, mid, low] = SKY[time];
  const night = time === "night";
  const sil = night ? "#1A1F33" : time === "golden" ? "#B08A72" : "#A9B4BA";
  const sea = night ? "#151A2C" : time === "golden" ? "#E4BE98" : "#BFCDD3";
  const drift = (f * 0.25) % 700;
  return (
    <g>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="0.6" stopColor={mid} />
          <stop offset="1" stopColor={low} />
        </linearGradient>
        <clipPath id="win">
          <rect x={x} y={y} width={w} height={h} />
        </clipPath>
      </defs>
      <g clipPath="url(#win)">
        <rect x={x} y={y} width={w} height={h} fill="url(#sky)" />
        {/* Sun or moon */}
        {night ? (
          <g>
            <circle cx={x + 420} cy={y + 110} r={30} fill="#F3ECDF" />
            <circle cx={x + 432} cy={y + 102} r={26} fill={top} />
            {[...Array(14)].map((_, i) => (
              <circle key={i} cx={x + hash(i, 4) * w} cy={y + hash(i, 5) * 240} r={1.6} fill="#FFFFFF" opacity={0.4 + 0.5 * Math.abs(Math.sin(f * 0.05 + i))} />
            ))}
          </g>
        ) : (
          <circle cx={x + (time === "golden" ? 150 : 400)} cy={y + (time === "golden" ? 300 : 120)} r={time === "golden" ? 46 : 36} fill={time === "golden" ? "#F7C77E" : "#FFFBEF"} opacity={0.95} />
        )}
        {/* Clouds drifting */}
        {!night
          ? [0, 1].map((i) => (
              <g key={i} transform={`translate(${x - 200 + ((drift + i * 360) % 900)} ${y + 70 + i * 60})`} opacity={0.7}>
                <ellipse cx={0} cy={0} rx={70} ry={16} fill="#FFFFFF" />
                <ellipse cx={30} cy={-10} rx={40} ry={16} fill="#FFFFFF" />
              </g>
            ))
          : null}
        {/* Skyline */}
        <path
          fill={sil}
          d={`M${x} ${y + 380} V ${y + 330} H ${x + 40} V ${y + 280} H ${x + 70} V ${y + 300} H ${x + 96} V ${y + 240} H ${x + 120} V ${y + 225} H ${x + 132} V ${y + 240} H ${x + 150} V ${y + 310} H ${x + 190} V ${y + 270} H ${x + 230} V ${y + 330} H ${x + 300} V ${y + 260} H ${x + 318} V ${y + 200} H ${x + 330} V ${y + 260} H ${x + 350} V ${y + 340} H ${x + 420} V ${y + 300} H ${x + 470} V ${y + 330} H ${x + w} V ${y + 380} Z`}
        />
        {/* Sea */}
        <rect x={x} y={y + 380} width={w} height={h - 380} fill={sea} />
        {/* Bandra-Worli Sea Link: deck, pylon, cables */}
        <g stroke={night ? "#C9CCD6" : "#5E6670"} fill="none" strokeWidth={2.4} opacity={0.9}>
          <path d={`M${x} ${y + 400} Q ${x + w / 2} ${y + 392} ${x + w} ${y + 404}`} strokeWidth={5} />
          <path d={`M${x + 300} ${y + 400} V ${y + 250} M${x + 312} ${y + 400} V ${y + 250}`} strokeWidth={6} />
          {[...Array(7)].map((_, i) => (
            <g key={i}>
              <path d={`M${x + 306} ${y + 258 + i * 6} L ${x + 300 - 40 - i * 34} ${y + 398}`} strokeWidth={1.4} />
              <path d={`M${x + 306} ${y + 258 + i * 6} L ${x + 312 + 40 + i * 34} ${y + 398}`} strokeWidth={1.4} />
            </g>
          ))}
        </g>
        {night
          ? [...Array(9)].map((_, i) => (
              <circle key={i} cx={x + 30 + i * 60} cy={y + 396} r={2.6} fill="#FFD9A0" opacity={0.6 + 0.4 * Math.sin(f * 0.15 + i)} />
            ))
          : null}
      </g>
      {/* Frame */}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={C.inkSoft} strokeWidth={14} />
      <path d={`M${x + w / 2} ${y} V ${y + h} M${x} ${y + h * 0.55} H ${x + w}`} stroke={C.inkSoft} strokeWidth={8} />
      <rect x={x - 24} y={y + h} width={w + 48} height={18} rx={4} fill={C.paperBright} stroke={C.taupe} strokeWidth={2} />
    </g>
  );
};

// ---------------------------------------------------------------------------
// Wall pieces
// ---------------------------------------------------------------------------

const Card: React.FC<{ x: number; y: number; w: number; h: number; rot: number; children?: React.ReactNode; fill?: string }> = ({ x, y, w, h, rot, children, fill = C.paperBright }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <rect x={3} y={5} width={w} height={h} fill="rgba(52,38,24,0.12)" />
    <rect x={0} y={0} width={w} height={h} fill={fill} stroke={C.taupeLight} strokeWidth={1.5} />
    {children}
    <circle cx={w / 2} cy={8} r={6} fill={C.sanguine} />
  </g>
);

const Pinboard: React.FC = () => (
  <g>
    <rect x={150} y={190} width={500} height={380} rx={6} fill="#E3DACB" stroke={C.taupe} strokeWidth={3} />
    {/* Wireframe sketch, red chalk */}
    <Card x={180} y={220} w={190} h={140} rot={-3}>
      <g fill="none" stroke={C.sanguine} strokeWidth={3} strokeLinecap="round">
        <rect x={16} y={22} width={158} height={104} rx={4} />
        <path d="M16 40 H 174 M 28 58 H 92 M 28 70 H 80 M 28 96 H 60" />
        <rect x={104} y={52} width={56} height={60} />
        <path d="M104 52 L 160 112 M160 52 L 104 112" />
      </g>
    </Card>
    {/* The mark */}
    <Card x={400} y={210} w={110} h={130} rot={4}>
      <g transform="translate(27 26)">
        <LogoMark height={92} color={C.ink} />
      </g>
    </Card>
    {/* Sticky notes */}
    <Card x={530} y={240} w={92} h={92} rot={-6} fill="#F1E5C8">
      <text x={46} y={52} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={20} fill={C.ink}>ship</text>
      <text x={46} y={74} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={20} fill={C.ink}>it!</text>
    </Card>
    <Card x={200} y={400} w={150} h={120} rot={2}>
      <text x={14} y={32} fontFamily={FONT.mono} fontSize={14} fill={C.graphite}>fig. 01</text>
      <path d="M14 50 C 50 40, 70 90, 110 60 S 140 90, 136 100" fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
    </Card>
    <Card x={380} y={380} w={130} h={150} rot={-2}>
      {/* Mini bar chart */}
      {[30, 50, 44, 76, 96].map((v, i) => (
        <rect key={i} x={18 + i * 20} y={128 - v} width={14} height={v} fill={i === 4 ? C.sanguine : C.taupe} />
      ))}
    </Card>
    <Card x={530} y={380} w={96} h={130} rot={5} fill="#E9EEF0">
      <rect x={16} y={24} width={64} height={86} rx={10} fill="none" stroke={C.ink} strokeWidth={3} />
      <rect x={30} y={36} width={36} height={8} fill={C.ink} />
      <rect x={30} y={88} width={36} height={10} rx={5} fill={C.sanguine} />
    </Card>
    {/* The red line, connecting the ideas */}
    <path d="M275 300 C 330 340, 360 280, 455 300 C 520 312, 540 300, 575 300 M455 300 C 460 360, 330 380, 275 455 M455 300 C 450 360, 470 400, 445 455" fill="none" stroke={C.sanguine} strokeWidth={2.5} opacity={0.85} />
  </g>
);

const Shelf: React.FC<{ f: number }> = ({ f }) => (
  <g>
    <rect x={700} y={520} width={460} height={14} rx={3} fill={C.inkSoft} />
    <path d="M730 534 L 744 570 M1130 534 L 1116 570" stroke={C.inkSoft} strokeWidth={8} strokeLinecap="round" />
    {/* Books */}
    {[[712, 70, C.ink], [736, 84, C.taupe], [760, 64, C.sanguine], [782, 78, "#D7CFC2"]].map(([x, h, c], i) => (
      <rect key={i} x={x as number} y={520 - (h as number)} width={22} height={h as number} rx={2} fill={c as string} />
    ))}
    {/* Check badge trophy */}
    <g transform="translate(860 470)">
      <circle r={36} fill={C.sanguine} />
      <path d="M-14 0 L -4 11 L 15 -12" fill="none" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      <rect x={-18} y={34} width={36} height={16} rx={3} fill={C.inkSoft} />
    </g>
    {/* Cloud on a stand */}
    <g transform="translate(965 488)">
      <ellipse cx={-22} cy={0} rx={24} ry={18} fill="#FFFFFF" />
      <ellipse cx={8} cy={-10} rx={30} ry={24} fill="#FFFFFF" />
      <ellipse cx={34} cy={2} rx={22} ry={16} fill="#FFFFFF" />
      <rect x={-46} y={6} width={102} height={18} rx={9} fill="#FFFFFF" />
    </g>
    {/* Icon tile */}
    <g transform="translate(1060 470)">
      <rect x={-34} y={-34} width={68} height={68} rx={16} fill={C.paperBright} stroke={C.taupeLight} strokeWidth={2} />
      <path d="M0 -18 L 5 -5 L 18 0 L 5 5 L 0 18 L -5 5 L -18 0 L -5 -5 Z" fill="none" stroke={C.sanguine} strokeWidth={4} strokeLinejoin="round" />
    </g>
    {/* Tiny plant */}
    <g transform={`translate(1128 520)`}>
      <path d="M-14 0 L -10 -26 H 10 L 14 0 Z" fill={C.taupe} />
      <g transform={`rotate(${Math.sin(f * 0.05) * 3} 0 -26)`}>
        <path d="M0 -26 C -20 -44 -24 -60 -10 -70 C 0 -56 2 -40 0 -26 Z M 0 -26 C 16 -46 26 -54 30 -66 C 14 -66 4 -48 0 -26 Z" fill="#5E7D63" />
      </g>
    </g>
  </g>
);

const Sign: React.FC<{ on: boolean; f: number }> = ({ on, f }) => {
  const flicker = on ? 0.85 + 0.15 * (noise1(f * 0.4, 3) > -0.8 ? 1 : 0.2) : 0;
  return (
    <g>
      <defs>
        <filter id="neon" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x={690} y={110} width={480} height={86} rx={12} fill="#1B1B20" opacity={0.92} />
      <text
        x={930}
        y={166}
        textAnchor="middle"
        fontFamily={FONT.sans}
        fontWeight={600}
        fontSize={40}
        letterSpacing="-0.5"
        fill={on ? "#FF8A6E" : "#5A2E26"}
        stroke={on ? C.sanguineBright : "none"}
        strokeWidth={1.2}
        filter={on ? "url(#neon)" : undefined}
        opacity={on ? flicker : 1}
      >
        Building in public
      </text>
      <path d="M790 110 L 760 40 M1070 110 L 1100 40" stroke={C.inkSoft} strokeWidth={3} />
    </g>
  );
};

// ---------------------------------------------------------------------------
// Desk
// ---------------------------------------------------------------------------

const MonitorScreen: React.FC<{ shows: MonitorShows; f: number }> = ({ shows, f }) => {
  const x = 1330, y = 482, w = 300, h = 186;
  if (shows === "off") return <rect x={x} y={y} width={w} height={h} fill="#16161B" />;
  if (shows === "code") {
    const lines: Array<[number, number, string]> = [[0, 140, C.sanguineBright], [20, 190, "#8B8B95"], [20, 120, "#C9C9D1"], [40, 160, "#8B8B95"], [20, 90, C.sanguineBright], [0, 60, "#C9C9D1"], [0, 150, "#8B8B95"]];
    const shown = Math.min(lines.length, Math.floor(f / 10) % (lines.length + 4));
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill="#16161B" />
        {lines.slice(0, Math.max(1, shown)).map(([ind, len, c], i) => (
          <rect key={i} x={x + 18 + ind} y={y + 18 + i * 22} width={len} height={9} rx={3} fill={c} />
        ))}
        {Math.floor(f / 15) % 2 === 0 ? <rect x={x + 18} y={y + 18 + Math.max(1, shown) * 22} width={10} height={14} fill={C.sanguineBright} /> : null}
      </g>
    );
  }
  if (shows === "chart") {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill="#FFFFFF" />
        <rect x={x + 16} y={y + 16} width={110} height={12} rx={3} fill={C.ink} />
        {[40, 62, 56, 92, 120].map((v, i) => (
          <rect key={i} x={x + 30 + i * 52} y={y + h - 18 - v * Math.min(1, (f % 120) / 40 + 0.2)} width={30} height={v * Math.min(1, (f % 120) / 40 + 0.2)} fill={i === 4 ? C.sanguine : C.taupe} />
        ))}
      </g>
    );
  }
  if (shows === "logo") {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={C.paperBright} />
        <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={38} letterSpacing="-1.5" fill={C.ink}>ProtoVinci</text>
        <rect x={x + 70} y={y + h / 2 + 30} width={160} height={4} rx={2} fill={C.sanguine} />
      </g>
    );
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#FFFFFF" />
      <rect x={x} y={y} width={w} height={20} fill="#F0F0F2" />
      <rect x={x + 16} y={y + 40} width={130} height={18} rx={2} fill={C.ink} />
      <rect x={x + 16} y={y + 64} width={100} height={18} rx={2} fill={C.ink} />
      <rect x={x + 16} y={y + 96} width={120} height={7} rx={3} fill={C.zinc} />
      <rect x={x + 16} y={y + 136} width={70} height={20} rx={10} fill={C.sanguine} />
      <rect x={x + 170} y={y + 36} width={112} height={128} rx={6} fill={C.taupe} />
    </g>
  );
};

const Desk: React.FC<{ monitor: MonitorShows; lampOn: boolean; f: number }> = ({ monitor, lampOn, f }) => (
  <g>
    {/* Monitor */}
    <rect x={1316} y={468} width={328} height={214} rx={10} fill={C.inkSoft} />
    <MonitorScreen shows={monitor} f={f} />
    <rect x={1466} y={682} width={28} height={36} fill={C.zinc} />
    <rect x={1420} y={714} width={120} height={10} rx={5} fill={C.zinc} />
    {/* Lamp */}
    <g>
      <path d="M1760 718 L 1740 600 L 1690 520" fill="none" stroke={C.inkSoft} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx={1760} cy={720} rx={34} ry={8} fill={C.inkSoft} />
      <g transform="translate(1690 520) rotate(28)">
        <path d="M-34 0 L -24 -36 H 24 L 34 0 Z" fill={C.sanguine} />
        <ellipse cx={0} cy={0} rx={34} ry={7} fill={lampOn ? "#FFF3D2" : "#8C3A2A"} />
      </g>
    </g>
    {/* Inkpot and quill: the logo, on the desk */}
    <g transform="translate(1250 720)">
      <path d="M-26 0 C -30 -30, -18 -40, 0 -40 C 18 -40, 30 -30, 26 0 Z" fill={C.ink} />
      <rect x={-12} y={-50} width={24} height={12} rx={3} fill={C.inkSoft} />
      <path d="M4 -46 C 10 -90, 30 -130, 70 -160 C 60 -120, 40 -80, 10 -44 Z" fill="#F3ECDF" stroke={C.taupe} strokeWidth={2} />
      <path d="M4 -46 Q 30 -100 68 -156" fill="none" stroke={C.taupe} strokeWidth={2} />
    </g>
    {/* Mug with steam */}
    <g transform="translate(1600 720)">
      <rect x={-24} y={-52} width={44} height={52} rx={6} fill={C.paperBright} stroke={C.inkSoft} strokeWidth={3} />
      <rect x={-24} y={-34} width={44} height={10} fill={C.sanguine} />
      <path d="M20 -42 a 12 12 0 0 1 0 24" fill="none" stroke={C.inkSoft} strokeWidth={4} />
      {[0, 1].map((i) => (
        <path
          key={i}
          d={`M${-8 + i * 14} -60 c 8 -10, -8 -18, 0 -30 c 8 -10, -6 -18, 0 -26`}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.5 + 0.3 * Math.sin(f * 0.1 + i * 2)}
          transform={`translate(${Math.sin(f * 0.08 + i) * 3} ${-((f * 0.6 + i * 20) % 20)})`}
        />
      ))}
    </g>
    {/* Desk top and legs */}
    <rect x={1190} y={718} width={620} height={26} rx={6} fill="#CDBFAA" />
    <rect x={1190} y={736} width={620} height={8} fill="#B7A991" />
    <rect x={1220} y={744} width={18} height={196} fill="#B7A991" />
    <rect x={1762} y={744} width={18} height={196} fill="#B7A991" />
    <rect x={1560} y={744} width={170} height={110} rx={6} fill="#C3B49C" />
    <rect x={1630} y={792} width={30} height={6} rx={3} fill={C.inkSoft} />
  </g>
);

// ---------------------------------------------------------------------------
// Foreground
// ---------------------------------------------------------------------------

const Plant: React.FC<{ f: number }> = ({ f }) => {
  const leaf = (rot: number, len: number, i: number) => (
    <g key={i} transform={`rotate(${rot + Math.sin(f * 0.04 + i) * 2} 0 0)`}>
      <path d={`M0 0 C ${len * 0.2} ${-len * 0.4}, ${len * 0.45} ${-len * 0.8}, 0 ${-len} C ${-len * 0.45} ${-len * 0.8}, ${-len * 0.2} ${-len * 0.4}, 0 0 Z`} fill={i % 2 ? "#5E7D63" : "#4D6B53"} />
      <path d={`M0 0 Q 4 ${-len * 0.5} 0 ${-len * 0.95}`} fill="none" stroke="#3F5A45" strokeWidth={2} />
    </g>
  );
  return (
    <g transform="translate(120 1020)">
      {[-38, -18, 2, 22, 40, -55, 55].map((r, i) => leaf(r, 230 + (i % 3) * 50, i))}
      <path d="M-80 -40 L -64 70 H 64 L 80 -40 Z" fill={C.paperBright} stroke={C.taupe} strokeWidth={3} />
      <rect x={-86} y={-52} width={172} height={18} rx={4} fill={C.taupeLight} stroke={C.taupe} strokeWidth={3} />
    </g>
  );
};

// ---------------------------------------------------------------------------
// The set
// ---------------------------------------------------------------------------

export const Studio: React.FC<StudioProps> = ({
  time = "day",
  monitor = "site",
  sign = true,
  lamp,
  camera = { x: STAGE_W / 2, y: STAGE_H / 2, zoom: 1 },
  children,
}) => {
  const f = useCurrentFrame();
  const night = time === "night";
  const lampOn = lamp ?? night;
  const vw = STAGE_W / camera.zoom;
  const vh = STAGE_H / camera.zoom;
  const viewBox = `${camera.x - vw / 2} ${camera.y - vh / 2} ${vw} ${vh}`;
  const wall = time === "golden" ? "#EFE6D8" : C.paper;
  return (
    <AbsoluteFill style={{ backgroundColor: "#1B1B20" }}>
      <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid slice" style={{ fontFamily: FONT.sans }}>
        <defs>
          <radialGradient id="lampPool" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFE2A8" stopOpacity={0.55} />
            <stop offset="1" stopColor="#FFE2A8" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="signGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={C.sanguineBright} stopOpacity={0.35} />
            <stop offset="1" stopColor={C.sanguineBright} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="sunbeam" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF4DD" stopOpacity={time === "golden" ? 0.45 : 0.25} />
            <stop offset="1" stopColor="#FFF4DD" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* ---------- back ---------- */}
        <rect x={-400} y={-400} width={STAGE_W + 800} height={FLOOR_Y + 400} fill={wall} />
        {/* Construction geometry on the wall, as on the brand's cover */}
        <circle cx={260} cy={1120} r={760} fill="none" stroke={C.taupe} strokeWidth={2} opacity={0.35} />
        <path d="M1180 -400 V 948" stroke={C.taupe} strokeWidth={2} opacity={0.3} />
        <rect x={-400} y={FLOOR_Y - 34} width={STAGE_W + 800} height={34} fill={C.taupeLight} />
        <Window time={time} f={f} />
        <Pinboard />
        <Shelf f={f} />
        <Sign on={sign} f={f} />
        {/* Floor */}
        <rect x={-400} y={FLOOR_Y} width={STAGE_W + 800} height={STAGE_H - FLOOR_Y + 400} fill="#CDBFAA" />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M-400 ${FLOOR_Y + 30 + i * 40} H ${STAGE_W + 400}`} stroke="#BBAC94" strokeWidth={2} />
        ))}
        {/* Rug: the stage mark */}
        <ellipse cx={820} cy={FLOOR_Y + 42} rx={330} ry={46} fill={C.paperBright} />
        <ellipse cx={820} cy={FLOOR_Y + 42} rx={300} ry={36} fill="none" stroke={C.sanguine} strokeWidth={4} />
        {/* Daylight through the window */}
        {!night ? <path d="M1250 660 L 1790 660 L 1400 1080 L 760 1080 Z" fill="url(#sunbeam)" /> : null}

        {/* ---------- mid ---------- */}
        <Desk monitor={monitor} lampOn={lampOn} f={f} />

        {/* ---------- actors ---------- */}
        {children}

        {/* ---------- front ---------- */}
        <Plant f={f} />

        {/* ---------- light ---------- */}
        {night ? <rect x={-400} y={-400} width={STAGE_W + 800} height={STAGE_H + 800} fill="#1A2140" opacity={0.42} style={{ mixBlendMode: "multiply" }} /> : null}
        {time === "golden" ? <rect x={-400} y={-400} width={STAGE_W + 800} height={STAGE_H + 800} fill="#F2B37A" opacity={0.14} style={{ mixBlendMode: "multiply" }} /> : null}
        {lampOn ? <ellipse cx={1660} cy={700} rx={380} ry={260} fill="url(#lampPool)" style={{ mixBlendMode: "screen" }} /> : null}
        {sign ? <ellipse cx={930} cy={160} rx={420} ry={200} fill="url(#signGlow)" style={{ mixBlendMode: "screen" }} opacity={night ? 1 : 0.5} /> : null}
      </svg>
    </AbsoluteFill>
  );
};
