// Composition registry. Every deliverable is one of these ids.
//
//   npx remotion render Master-16x9 renders/protovinci-off-the-page-16x9.mp4
//
// Props can be overridden at render time, for example a silent version:
//   --props='{"audio":null,"showWork":true,"url":"protovinci.vercel.app"}'

import React from "react";
import { Composition, Folder, Still } from "remotion";
import { LogoSting, STING_FRAMES } from "./compositions/LogoSting";
import { Card, Lockup, Palette, type CardProps, type LockupProps } from "./compositions/Stills";
import { Cutdown } from "./compositions/Cutdown";
import type { FilmProps } from "./compositions/Film";
import { Master } from "./compositions/Master";
import "./fonts";
import { CUT_TOTAL_FRAMES, FPS, TOTAL_FRAMES } from "./timeline";

const base = { showWork: true, url: "protovinci.vercel.app" };
const masterProps: FilmProps = { ...base, audio: "assets/audio/score-master.wav" };
const cutProps: FilmProps = { ...base, audio: "assets/audio/score-cutdown.wav" };

const FORMATS = [
  { suffix: "16x9", width: 1920, height: 1080 },
  { suffix: "9x16", width: 1080, height: 1920 },
  { suffix: "1x1", width: 1080, height: 1080 },
] as const;

const hook: CardProps = {
  theme: "paper",
  headline: ["Some ideas", "shouldn't stay ideas."],
  kicker: "Build. Automate. Scale.",
  url: true,
};
const CARDS: Array<{ id: string; w: number; h: number; props: CardProps }> = [
  { id: "OG", w: 1200, h: 630, props: hook },
  { id: "YouTube-Thumb", w: 1280, h: 720, props: { ...hook, url: false } },
  { id: "Instagram-Portrait", w: 1080, h: 1350, props: hook },
  { id: "Instagram-Square", w: 1080, h: 1080, props: { ...hook, headline: ["Got a vision?", "Let's ship it."] } },
  { id: "Story", w: 1080, h: 1920, props: hook },
  { id: "LinkedIn-Banner", w: 1584, h: 396, props: { theme: "paper", headline: ["Build. Automate. Scale."], kicker: "Creativity, Engineered.", url: false } },
  { id: "X-Header", w: 1500, h: 500, props: { theme: "paper", headline: ["Some ideas shouldn't", "stay ideas."], kicker: "", url: false } },
  { id: "Night-Wide", w: 1920, h: 1080, props: { theme: "night", headline: ["Automate the", "work that repeats."], kicker: "AI agents · workflows · integrations", url: true } },
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {FORMATS.map((f) => (
        <Composition
          key={`master-${f.suffix}`}
          id={`Master-${f.suffix}`}
          component={Master}
          durationInFrames={TOTAL_FRAMES}
          fps={FPS}
          width={f.width}
          height={f.height}
          defaultProps={masterProps}
        />
      ))}
      {FORMATS.map((f) => (
        <Composition
          key={`sting-${f.suffix}`}
          id={`LogoSting-${f.suffix}`}
          component={LogoSting}
          durationInFrames={STING_FRAMES}
          fps={FPS}
          width={f.width}
          height={f.height}
          defaultProps={{ audio: null }}
        />
      ))}
      <Folder name="Stills">
        <Still
          id="Lockup"
          component={Lockup}
          width={1800}
          height={1000}
          defaultProps={{ color: "ink", tagline: true, layout: "stacked" } satisfies LockupProps}
        />
        <Still
          id="Lockup-Horizontal"
          component={Lockup}
          width={2400}
          height={600}
          defaultProps={{ color: "ink", tagline: true, layout: "horizontal" } satisfies LockupProps}
        />
        <Still id="Palette" component={Palette} width={2000} height={800} />
        {CARDS.map((c) => (
          <Still key={c.id} id={`Card-${c.id}`} component={Card} width={c.w} height={c.h} defaultProps={c.props} />
        ))}
      </Folder>
      {FORMATS.filter((f) => f.suffix !== "1x1").map((f) => (
        <Composition
          key={`cut-${f.suffix}`}
          id={`Cutdown-${f.suffix}`}
          component={Cutdown}
          durationInFrames={CUT_TOTAL_FRAMES}
          fps={FPS}
          width={f.width}
          height={f.height}
          defaultProps={cutProps}
        />
      ))}
    </>
  );
};
