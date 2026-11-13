// Composition registry. Every deliverable is one of these ids.
//
//   npx remotion render Master-16x9 renders/protovinci-off-the-page-16x9.mp4
//
// Props can be overridden at render time, for example a silent version:
//   --props='{"audio":null,"showWork":true,"url":"protovinci.vercel.app"}'

import React from "react";
import { Composition } from "remotion";
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
