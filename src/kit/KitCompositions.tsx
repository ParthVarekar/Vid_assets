// Registers the content kit: the video-kit demo and every social template.
// Social ids follow `Social-<template>-<n>-<format>`, e.g. Social-Service-06-Portrait.

import React from "react";
import { AbsoluteFill, Composition, Folder, Sequence, Still, staticFile } from "remotion";
import { Paper } from "../components/Surface";
import { FPS } from "../timeline";
import { PROCESS, PROJECTS, QUOTES, SERVICES, STATS, TESTIMONIALS } from "./content";
import {
  AnnouncementPost,
  Background,
  CarouselSlide,
  CaseStudyPost,
  HighlightCover,
  ProcessPost,
  ProfilePicture,
  PromisePost,
  QuotePost,
  ServicePost,
  StatPost,
  TestimonialPost,
} from "./Social";
import { Callout, Captions, EndCard, evenWords, LineWipe, LogoBug, LowerThird, ScreenFrame, TitleCard } from "./VideoKit";

/** A 14-second reel showing every video-kit piece in use. */
export const KitDemo: React.FC = () => (
  <AbsoluteFill>
    <Sequence durationInFrames={90}>
      <TitleCard index="01 / 03" title="Build." subtitle="websites · web apps · mobile · custom software" duration={90} />
    </Sequence>
    <Sequence from={78} durationInFrames={24}>
      <LineWipe to="paper" />
    </Sequence>
    <Sequence from={90} durationInFrames={210}>
      <AbsoluteFill>
        <Paper />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <ScreenFrame src={staticFile("assets/brand/work/awarddock.webp")} width={1100} url="certify-nu.vercel.app" />
        </AbsoluteFill>
        <Sequence from={20} durationInFrames={170}>
          <LowerThird name="AwardDock" role="Workflow automation · 6 weeks" duration={170} />
        </Sequence>
        <Sequence from={50} durationInFrames={120}>
          <Callout x={1380} y={330} icon="email" label="Emailed automatically" duration={120} />
        </Sequence>
        <Sequence from={70} durationInFrames={100}>
          <Callout x={1300} y={560} icon="check" label="Delivery tracked" duration={100} />
        </Sequence>
        <Sequence from={10}>
          <Captions words={evenWords("Personalised certificates, generated and sent without manual work.", 0, 11)} />
        </Sequence>
      </AbsoluteFill>
    </Sequence>
    <Sequence from={288} durationInFrames={24}>
      <LineWipe to="paper" />
    </Sequence>
    <Sequence from={300}>
      <EndCard />
    </Sequence>
    <Sequence from={0} durationInFrames={300}>
      <LogoBug />
    </Sequence>
  </AbsoluteFill>
);

const FORMATS = [
  { id: "Portrait", w: 1080, h: 1350 },
  { id: "Square", w: 1080, h: 1080 },
  { id: "Story", w: 1080, h: 1920 },
] as const;

const pad = (n: number) => String(n + 1).padStart(2, "0");

export const KitCompositions: React.FC = () => (
  <>
    <Folder name="Kit">
      {[
        { id: "KitDemo", w: 1920, h: 1080 },
        { id: "KitDemo-Vertical", w: 1080, h: 1920 },
      ].map((c) => (
        <Composition key={c.id} id={c.id} component={KitDemo} durationInFrames={420} fps={FPS} width={c.w} height={c.h} />
      ))}
    </Folder>
    <Folder name="Social">
      {FORMATS.map((f) => (
        <React.Fragment key={f.id}>
          {SERVICES.map((s, i) => (
            <Still key={`sv-${i}-${f.id}`} id={`Social-Service-${s.no}-${f.id}`} component={ServicePost} width={f.w} height={f.h} defaultProps={{ index: i, tone: s.pillar === "Automate" ? ("night" as const) : ("paper" as const) }} />
          ))}
          {PROJECTS.map((_, i) => (
            <Still key={`cs-${i}-${f.id}`} id={`Social-Case-${pad(i)}-${f.id}`} component={CaseStudyPost} width={f.w} height={f.h} defaultProps={{ index: i }} />
          ))}
          {PROCESS.map((_, i) => (
            <Still key={`pr-${i}-${f.id}`} id={`Social-Process-${pad(i)}-${f.id}`} component={ProcessPost} width={f.w} height={f.h} defaultProps={{ index: i }} />
          ))}
          {QUOTES.map((_, i) => (
            <Still key={`q-${i}-${f.id}`} id={`Social-Quote-${pad(i)}-${f.id}`} component={QuotePost} width={f.w} height={f.h} defaultProps={{ index: i, tone: i % 2 ? ("night" as const) : ("paper" as const) }} />
          ))}
          {TESTIMONIALS.map((_, i) => (
            <Still key={`t-${i}-${f.id}`} id={`Social-Testimonial-${pad(i)}-${f.id}`} component={TestimonialPost} width={f.w} height={f.h} defaultProps={{ index: i }} />
          ))}
          {STATS.map((_, i) => (
            <Still key={`st-${i}-${f.id}`} id={`Social-Stat-${pad(i)}-${f.id}`} component={StatPost} width={f.w} height={f.h} defaultProps={{ index: i }} />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <Still key={`c-${i}-${f.id}`} id={`Social-Carousel-${pad(i)}-${f.id}`} component={CarouselSlide} width={f.w} height={f.h} defaultProps={{ slide: i }} />
          ))}
          <Still id={`Social-Promise-01-${f.id}`} component={PromisePost} width={f.w} height={f.h} />
          <Still
            id={`Social-Announcement-01-${f.id}`}
            component={AnnouncementPost}
            width={f.w}
            height={f.h}
            defaultProps={{ kicker: "Now booking", headline: ["Bring us the thing", "nobody will build."], body: "Websites, apps, AI and automation. One team, idea to launch." }}
          />
        </React.Fragment>
      ))}
      {(["code", "ai-agent", "layers", "check", "dashboard", "email"] as const).map((icon) => (
        <Still key={`hl-${icon}`} id={`Social-Highlight-${icon}`} component={HighlightCover} width={1080} height={1080} defaultProps={{ icon, tone: "paper" as const }} />
      ))}
      <Still id="Background" component={Background} width={1920} height={1080} defaultProps={{ tone: "paper" as const, geometry: true, line: false }} />
      <Still id="Social-Profile-Paper" component={ProfilePicture} width={1080} height={1080} defaultProps={{ tone: "paper" as const }} />
      <Still id="Social-Profile-Ink" component={ProfilePicture} width={1080} height={1080} defaultProps={{ tone: "night" as const }} />
    </Folder>
  </>
);
