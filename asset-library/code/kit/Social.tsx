// Social media templates. Each is a still that adapts to 1080x1350 (feed
// portrait), 1080x1080 (square) and 1080x1920 (story). Content comes from
// src/kit/content.ts, so the copy always matches the website.

import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { LogoMark, Quill } from "../components/Quill";
import { Geometry, Grain, Night, Paper } from "../components/Surface";
import { ThreadStroke, useThread } from "../components/Thread";
import { Mono } from "../components/Type";
import { C, FONT, TRACK } from "../theme";
import type { IconName } from "../three/data/icons";
import { BRAND, PILLARS, PROCESS, PROJECTS, PROMISES, QUOTES, SERVICES, STATS, TESTIMONIALS } from "./content";
import { Icon } from "./VideoKit";

type Tone = "paper" | "night";

const useU = () => {
  const { width: w, height: h } = useVideoConfig();
  return { w, h, u: w / 1080, tall: h / w > 1.6, square: Math.abs(h - w) < 10 };
};

/** Shared frame: ground, header with mark, footer with URL and page. */
const Frame: React.FC<{ tone?: Tone; page?: string; kicker?: string; line?: boolean; children: React.ReactNode }> = ({
  tone = "paper",
  page,
  kicker,
  line = true,
  children,
}) => {
  const { w, h, u, tall } = useU();
  const dark = tone === "night";
  const ink = dark ? C.nightText : C.ink;
  const muted = dark ? C.nightMuted : C.graphite;
  const m = 72 * u;
  const top = tall ? h * 0.12 : m;
  const bottom = tall ? h * 0.15 : m;
  const groundY = h - bottom - 70 * u;
  const thread = useThread([{ x: -40, y: groundY }, { x: w * 0.36, y: groundY }], { wobble: dark ? 0 : 2.6 * u, seed: 12 });
  return (
    <AbsoluteFill style={{ fontFamily: FONT.sans }}>
      {dark ? <Night /> : <Paper />}
      <Geometry draw={1} opacity={dark ? 0.22 : 0.42} color={dark ? "#3A3A44" : C.taupe} />
      <div style={{ position: "absolute", left: m, right: m, top, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 * u }}>
          <LogoMark height={40 * u} color={ink} />
          <div style={{ fontWeight: 600, fontSize: 28 * u, letterSpacing: TRACK.title, color: ink }}>{BRAND.name}</div>
        </div>
        {kicker ? (
          <Mono size={19 * u} color={muted} wide upper>
            {kicker}
          </Mono>
        ) : null}
      </div>
      <div style={{ position: "absolute", left: m, right: m, top: top + 76 * u, bottom: bottom + 110 * u, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
      {line ? (
        <>
          <ThreadStroke d={thread.d} to={1} width={5 * u} color={dark ? C.sanguineBright : C.sanguine} chalk={dark ? 0 : 1} id="social" />
          <Quill x={w * 0.36} y={groundY} size={120 * u} rotate={-5} color={ink} shadow={!dark} />
        </>
      ) : null}
      <div style={{ position: "absolute", left: m, right: m, bottom, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Mono size={20 * u} color={muted}>
          {BRAND.url}
        </Mono>
        {page ? (
          <Mono size={20 * u} color={muted} wide>
            {page}
          </Mono>
        ) : null}
      </div>
      <Grain opacity={0.28} />
    </AbsoluteFill>
  );
};

const H: React.FC<{ size: number; color: string; children: React.ReactNode; weight?: number; style?: React.CSSProperties }> = ({
  size,
  color,
  children,
  weight = 600,
  style,
}) => (
  <div style={{ fontFamily: FONT.sans, fontWeight: weight, fontSize: size, lineHeight: 1.02, letterSpacing: size > 60 ? TRACK.display : TRACK.title, color, ...style }}>
    {children}
  </div>
);

const IconChip: React.FC<{ name: IconName; size: number; tone: Tone }> = ({ name, size, tone }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      backgroundColor: tone === "night" ? C.nightText : C.ink,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Icon name={name} size={size * 0.52} color={tone === "night" ? C.ink : C.white} stroke={1.5} />
  </div>
);

// ---------------------------------------------------------------------------

export const ServicePost: React.FC<{ index: number; tone: Tone }> = ({ index, tone }) => {
  const s = SERVICES[index];
  const { u, square } = useU();
  const dark = tone === "night";
  const ink = dark ? C.nightText : C.ink;
  const muted = dark ? C.nightMuted : C.graphite;
  return (
    <Frame tone={tone} kicker={`${s.pillar} · ${s.no} / 10`} page={`${s.no}/10`}>
      <IconChip name={s.icon} size={(square ? 96 : 120) * u} tone={tone} />
      <H size={(square ? 66 : 78) * u} color={ink} style={{ marginTop: 40 * u, maxWidth: 900 * u }}>
        {s.title}
      </H>
      <div style={{ marginTop: 28 * u, fontSize: 30 * u, lineHeight: 1.4, color: muted, fontWeight: 500, letterSpacing: TRACK.body, maxWidth: 880 * u }}>
        {s.description}
      </div>
      {!square ? (
        <div style={{ marginTop: 36 * u, display: "flex", flexDirection: "column", gap: 14 * u }}>
          {s.items.map((it) => (
            <div key={it} style={{ display: "flex", alignItems: "center", gap: 16 * u }}>
              <Icon name="check" size={28 * u} color={dark ? C.sanguineBright : C.sanguine} />
              <div style={{ fontSize: 28 * u, color: ink, fontWeight: 500, letterSpacing: TRACK.body }}>{it}</div>
            </div>
          ))}
        </div>
      ) : null}
    </Frame>
  );
};

export const CaseStudyPost: React.FC<{ index: number }> = ({ index }) => {
  const p = PROJECTS[index];
  const { u, square, tall } = useU();
  const imgW = 936 * u;
  return (
    <Frame kicker="Selected work" page={`${String(index + 1).padStart(2, "0")}/0${PROJECTS.length}`}>
      <div style={{ borderRadius: 18 * u, overflow: "hidden", boxShadow: `0 ${30 * u}px ${60 * u}px -${26 * u}px rgba(52,38,24,0.5), 0 0 0 1px rgba(9,9,11,0.08)`, width: imgW, height: imgW * (square ? 0.42 : tall ? 0.62 : 0.5), backgroundColor: C.white }}>
        <Img src={staticFile(`assets/brand/work/${p.image}`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top left" }} />
      </div>
      <div style={{ marginTop: 34 * u, display: "flex", gap: 14 * u }}>
        {[p.type, `Shipped in ${p.weeks}`].map((t) => (
          <div key={t} style={{ padding: `${8 * u}px ${16 * u}px`, borderRadius: 99, border: `${1.5 * u}px solid ${C.taupe}` }}>
            <Mono size={19 * u} color={C.ink} wide upper>
              {t}
            </Mono>
          </div>
        ))}
      </div>
      <H size={(square ? 64 : 76) * u} color={C.ink} style={{ marginTop: 24 * u }}>
        {p.name}
      </H>
      <div style={{ marginTop: 18 * u, fontSize: 28 * u, lineHeight: 1.4, color: C.graphite, fontWeight: 500, letterSpacing: TRACK.body, maxWidth: 900 * u }}>
        {p.description}
      </div>
    </Frame>
  );
};

export const ProcessPost: React.FC<{ index: number }> = ({ index }) => {
  const s = PROCESS[index];
  const { u } = useU();
  return (
    <Frame kicker="How we work" page={`${s.no}/04`}>
      <div style={{ display: "flex", gap: 10 * u }}>
        {PROCESS.map((p, i) => (
          <div key={p.no} style={{ flex: 1, height: 8 * u, borderRadius: 99, backgroundColor: i <= index ? C.sanguine : C.taupeLight }} />
        ))}
      </div>
      <div style={{ marginTop: 60 * u }}>
        <Mono size={26 * u} color={C.graphite} wide upper>
          Phase {s.no}
        </Mono>
      </div>
      <H size={Math.min(200, 900 / ((s.name.length + 1) * 0.5)) * u} color={C.ink} style={{ marginTop: 20 * u }}>
        {s.name}.
      </H>
      <div style={{ marginTop: 30 * u, fontSize: 38 * u, color: C.inkSoft, fontWeight: 500, letterSpacing: TRACK.title }}>{s.detail}</div>
    </Frame>
  );
};

export const QuotePost: React.FC<{ index: number; tone: Tone }> = ({ index, tone }) => {
  const q = QUOTES[index];
  const { u } = useU();
  const ink = tone === "night" ? C.nightText : C.ink;
  const words = q.split(" ");
  const fs = Math.min(130, 2200 / Math.max(10, q.length * 0.62)) * u;
  return (
    <Frame tone={tone} kicker={BRAND.motto}>
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        <H size={fs} color={ink}>
          {words.map((wd, i) => (
            <span key={i}>
              {i === words.length - 1 ? (
                <span style={{ boxShadow: `inset 0 ${-0.1 * fs}px 0 ${tone === "night" ? C.sanguineBright : C.sanguine}` }}>{wd}</span>
              ) : (
                wd
              )}{" "}
            </span>
          ))}
        </H>
      </div>
    </Frame>
  );
};

export const TestimonialPost: React.FC<{ index: number }> = ({ index }) => {
  const t = TESTIMONIALS[index];
  const { u } = useU();
  return (
    <Frame kicker="Client words" page={t.project}>
      <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 200 * u, lineHeight: 0.7, color: C.sanguine, height: 110 * u }}>“</div>
      {/* Longer quotes set smaller, but never below 42 px at 1080 wide. */}
      <H size={Math.max(42, Math.min(66, 9000 / t.quote.length)) * u} color={C.ink} weight={500} style={{ lineHeight: 1.18, letterSpacing: TRACK.title }}>
        {t.quote}
      </H>
      <div style={{ marginTop: 44 * u, display: "flex", alignItems: "center", gap: 18 * u }}>
        <div style={{ width: 54 * u, height: 2 * u, backgroundColor: C.ink }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 30 * u, color: C.ink, letterSpacing: TRACK.title }}>{t.name}</div>
          <Mono size={20 * u} color={C.graphite}>
            {t.role}
          </Mono>
        </div>
      </div>
    </Frame>
  );
};

export const StatPost: React.FC<{ index: number }> = ({ index }) => {
  const s = STATS[index];
  const { u } = useU();
  return (
    <Frame tone="night" kicker="Selected work" line>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <H size={300 * u} color={C.nightText}>
          {s.value}
        </H>
        <div style={{ marginTop: 20 * u, fontSize: 52 * u, color: C.nightText, fontWeight: 500, letterSpacing: TRACK.title }}>{s.label}</div>
        <div style={{ marginTop: 18 * u }}>
          <Mono size={22 * u} color={C.nightMuted} wide upper>
            {s.note}
          </Mono>
        </div>
      </div>
    </Frame>
  );
};

/** Carousel: "What we do" in five slides (cover, three pillars, CTA). */
export const CarouselSlide: React.FC<{ slide: number }> = ({ slide }) => {
  const { u } = useU();
  const page = `${slide + 1}/5`;
  if (slide === 0) {
    return (
      <Frame kicker="Swipe →" page={page}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Mono size={24 * u} color={C.graphite} wide upper>
            Technology, automation and design
          </Mono>
          <H size={150 * u} color={C.ink} style={{ marginTop: 24 * u }}>
            Build.
            <br />
            Automate.
            <br />
            <span style={{ boxShadow: `inset 0 ${-14 * u}px 0 ${C.sanguine}` }}>Scale.</span>
          </H>
        </div>
      </Frame>
    );
  }
  if (slide === 4) {
    return (
      <Frame tone="night" kicker="Let's talk" page={page}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <H size={118 * u} color={C.nightText}>
            Got a vision?
            <br />
            Let's ship it.
          </H>
          <div style={{ marginTop: 44 * u, alignSelf: "flex-start", backgroundColor: C.nightText, color: C.ink, borderRadius: 99, padding: `${18 * u}px ${34 * u}px`, fontSize: 32 * u, fontWeight: 500, letterSpacing: TRACK.body }}>
            Book a strategy call →
          </div>
          <div style={{ marginTop: 30 * u, display: "flex", gap: 26 * u }}>
            {["Clear pricing", "Fast turnarounds", "Direct communication"].map((t) => (
              <Mono key={t} size={19 * u} color={C.nightMuted} wide upper>
                ✓ {t}
              </Mono>
            ))}
          </div>
        </div>
      </Frame>
    );
  }
  const p = PILLARS[slide - 1];
  const services = SERVICES.filter((s) => s.pillar === p.name);
  return (
    <Frame kicker={`0${slide} · ${p.label}`} page={page}>
      <IconChip name={p.icon} size={110 * u} tone="paper" />
      <H size={140 * u} color={C.ink} style={{ marginTop: 36 * u }}>
        {p.name}.
      </H>
      <div style={{ marginTop: 22 * u, fontSize: 34 * u, lineHeight: 1.35, color: C.inkSoft, fontWeight: 500, letterSpacing: TRACK.body, maxWidth: 880 * u }}>{p.summary}</div>
      <div style={{ marginTop: 40 * u, display: "flex", flexDirection: "column", gap: 16 * u }}>
        {services.map((s) => (
          <div key={s.no} style={{ display: "flex", alignItems: "center", gap: 18 * u, paddingBottom: 14 * u, borderBottom: `${1.5 * u}px solid ${C.taupeLight}` }}>
            <Mono size={20 * u} color={C.graphite}>
              {s.no}
            </Mono>
            <div style={{ fontSize: 30 * u, color: C.ink, fontWeight: 500, letterSpacing: TRACK.body }}>{s.title}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
};

export const PromisePost: React.FC = () => {
  const { u } = useU();
  return (
    <Frame kicker="Working together">
      <H size={92 * u} color={C.ink}>
        Clear terms,
        <br />
        kickoff to launch.
      </H>
      <div style={{ marginTop: 50 * u, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 * u }}>
        {PROMISES.map((p) => (
          <div key={p.title} style={{ padding: 26 * u, borderRadius: 20 * u, backgroundColor: C.white, boxShadow: `0 0 0 ${1.2 * u}px rgba(9,9,11,0.08)` }}>
            <IconChip name={p.icon} size={56 * u} tone="paper" />
            <div style={{ marginTop: 18 * u, fontSize: 34 * u, fontWeight: 600, color: C.ink, letterSpacing: TRACK.title }}>{p.title}</div>
            <div style={{ marginTop: 10 * u, fontSize: 22 * u, lineHeight: 1.38, color: C.graphite, fontWeight: 500 }}>{p.detail}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
};

export const AnnouncementPost: React.FC<{ kicker: string; headline: string[]; body: string }> = ({ kicker, headline, body }) => {
  const { u } = useU();
  return (
    <Frame tone="night" kicker={kicker}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ alignSelf: "flex-start", padding: `${8 * u}px ${18 * u}px`, borderRadius: 99, backgroundColor: C.sanguineBright }}>
          <Mono size={20 * u} color={C.white} wide upper weight={500}>
            {kicker}
          </Mono>
        </div>
        <H size={120 * u} color={C.nightText} style={{ marginTop: 36 * u }}>
          {headline.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </H>
        <div style={{ marginTop: 30 * u, fontSize: 32 * u, lineHeight: 1.4, color: C.nightMuted, fontWeight: 500, maxWidth: 860 * u }}>{body}</div>
      </div>
    </Frame>
  );
};

/** Story highlight cover: icon on a disc, centred for the circular crop. */
export const HighlightCover: React.FC<{ icon: IconName; tone: Tone }> = ({ icon, tone }) => {
  const { w } = useU();
  const dark = tone === "night";
  return (
    <AbsoluteFill style={{ backgroundColor: dark ? C.ink : C.paper, alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: w * 0.62, height: w * 0.62, borderRadius: 999, backgroundColor: dark ? C.nightRaise : C.paperBright, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: dark ? "inset 0 0 0 3px rgba(255,255,255,0.12)" : `inset 0 0 0 3px ${C.taupeLight}` }}>
        <Icon name={icon} size={w * 0.3} color={dark ? C.nightText : C.ink} stroke={1.4} />
      </div>
    </AbsoluteFill>
  );
};

/** Plain brand background at any size: paper or night, with or without construction lines and the line. */
export const Background: React.FC<{ tone: Tone; geometry: boolean; line: boolean }> = ({ tone, geometry, line }) => {
  const { w, h } = useU();
  const u = Math.min(w, h) / 1080;
  const dark = tone === "night";
  const y = h * 0.82;
  const thread = useThread([{ x: -40, y }, { x: w + 40, y }], { wobble: dark ? 0 : 2.6 * u, seed: 21 });
  return (
    <AbsoluteFill>
      {dark ? <Night /> : <Paper />}
      {geometry ? <Geometry draw={1} opacity={dark ? 0.22 : 0.45} color={dark ? "#3A3A44" : C.taupe} /> : null}
      {line ? <ThreadStroke d={thread.d} to={1} width={5 * u} color={dark ? C.sanguineBright : C.sanguine} chalk={dark ? 0 : 1} id="bg" /> : null}
      <Grain opacity={0.3} />
    </AbsoluteFill>
  );
};

/** Simple profile picture: badge mark on paper, for every platform. */
export const ProfilePicture: React.FC<{ tone: Tone }> = ({ tone }) => {
  const { w } = useU();
  return (
    <AbsoluteFill style={{ backgroundColor: tone === "night" ? C.ink : C.paperBright, alignItems: "center", justifyContent: "center" }}>
      <LogoMark height={w * 0.58} color={tone === "night" ? C.white : C.ink} />
    </AbsoluteFill>
  );
};
