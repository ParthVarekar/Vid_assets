// Renders an animation clip from content/episodes.
//
//   npx remotion render Episode-rig-demo out/rig-demo.mp4 --gl=angle
//   npx remotion still  Episode-rig-demo out/f75.png --frame=75 --gl=angle

import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill, Composition, Folder, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { setAssetEnv } from "./set/assets";
import type { Clip } from "./anim/clip";
import { BirdScene, STUDIO_BACKDROP } from "./BirdScene";
import { EPISODES } from "./episodes";

// Remotion: assets come from public/ via staticFile. Loaders suspend, and
// ThreeCanvas waits (delayRender) until everything inside has loaded.
setAssetEnv({ url: (p) => staticFile(p) });

export type EpisodeProps = { clip: Clip; quality: "final" | "preview" };

export const Episode: React.FC<EpisodeProps> = ({ clip, quality }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: clip.set === "desk" ? "#1a1612" : STUDIO_BACKDROP }}>
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} camera={{ fov: 22, position: [0, 1.1, 9] }}>
        <BirdScene clip={clip} frame={frame} quality={quality} />
      </ThreeCanvas>
      <AbsoluteFill style={{ pointerEvents: "none", boxShadow: `inset 0 0 ${Math.min(width, height) * 0.22}px rgba(120,100,70,0.22)` }} />
    </AbsoluteFill>
  );
};

export const EpisodeCompositions: React.FC = () => (
  <Folder name="Episodes">
    {EPISODES.flatMap((clip) => [
      <Composition
        key={`${clip.name}-16x9`}
        id={`Episode-${clip.name}`}
        component={Episode}
        durationInFrames={clip.duration}
        fps={clip.fps}
        width={1920}
        height={1080}
        defaultProps={{ clip, quality: "final" } satisfies EpisodeProps}
      />,
      <Composition
        key={`${clip.name}-9x16`}
        id={`Episode-${clip.name}-9x16`}
        component={Episode}
        durationInFrames={clip.duration}
        fps={clip.fps}
        width={1080}
        height={1920}
        defaultProps={{ clip, quality: "final" } satisfies EpisodeProps}
      />,
    ])}
  </Folder>
);
