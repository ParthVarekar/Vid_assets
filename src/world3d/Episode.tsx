// Renders an animation clip from content/episodes.
//
//   npx remotion render Episode-rig-demo out/rig-demo.mp4 --gl=angle
//   npx remotion still  Episode-rig-demo out/f75.png --frame=75 --gl=angle

import { ThreeCanvas } from "@remotion/three";
import React, { useMemo } from "react";
import { AbsoluteFill, Composition, Folder, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, EndCard, evenWords, LineWipe, LogoBug } from "../kit/VideoKit";
import { setAssetEnv } from "./set/assets";
import type { Clip } from "./anim/clip";
import { BirdScene, STUDIO_BACKDROP } from "./BirdScene";
import { EPISODES } from "./episodes";

// Remotion: assets come from public/ via staticFile. Loaders suspend, and
// ThreeCanvas waits (delayRender) until everything inside has loaded.
setAssetEnv({ url: (p) => staticFile(p) });

export type EpisodeProps = { clip: Clip; quality: "final" | "preview" };

/** Tall formats use the clip's "camera-9x16" track when it has one. */
export const framedClip = (clip: Clip, tall: boolean): Clip =>
  tall && clip.tracks["camera-9x16"] ? { ...clip, tracks: { ...clip.tracks, camera: clip.tracks["camera-9x16"] } } : clip;

/** Captions, wipe, logo bug and end card from the clip's `overlays`. */
const Overlays: React.FC<{ o: NonNullable<Clip["overlays"]>; tall: boolean; height: number }> = ({ o, tall, height }) => (
  <>
    {(o.captions ?? []).map((c, i) => {
      const words = evenWords(c.text, 0, c.framesPerWord ?? 8);
      return (
        <Sequence key={i} from={c.from} durationInFrames={words[words.length - 1].to + 14} layout="none">
          {/* Vertical shots keep the birds low in frame, so lift captions into the sky. */}
          <AbsoluteFill style={{ translate: tall ? `0 ${-height * 0.36}px` : undefined }}>
            <Captions words={words} tone={c.tone ?? "paper"} perPage={8} />
          </AbsoluteFill>
        </Sequence>
      );
    })}
    {o.logoBug ? (
      <Sequence from={o.logoBug.from} durationInFrames={o.logoBug.to - o.logoBug.from} layout="none">
        <LogoBug corner={o.logoBug.corner ?? "tr"} tone={o.logoBug.tone ?? "night"} />
      </Sequence>
    ) : null}
    {o.endCard ? (
      <Sequence from={o.endCard.from} layout="none">
        <EndCard cta={o.endCard.cta} url={o.endCard.url} tone={o.endCard.tone ?? "paper"} />
      </Sequence>
    ) : null}
    {o.wipe ? (
      <Sequence from={o.wipe.at - 12} durationInFrames={24} layout="none">
        <LineWipe duration={24} to={o.wipe.to ?? "paper"} />
      </Sequence>
    ) : null}
  </>
);

export const Episode: React.FC<EpisodeProps> = ({ clip, quality }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const framed = useMemo(() => framedClip(clip, height > width), [clip, height, width]);
  // Once the end card covers the frame, skip the 3D scene entirely.
  const show3d = !clip.overlays?.endCard || frame < clip.overlays.endCard.from;
  return (
    <AbsoluteFill style={{ background: clip.set === "desk" ? "#1a1612" : STUDIO_BACKDROP }}>
      {show3d ? (
        <ThreeCanvas width={width} height={height} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} camera={{ fov: 22, position: [0, 1.1, 9] }}>
          <BirdScene clip={framed} frame={frame} quality={quality} />
        </ThreeCanvas>
      ) : null}
      <AbsoluteFill style={{ pointerEvents: "none", boxShadow: `inset 0 0 ${Math.min(width, height) * 0.22}px rgba(120,100,70,0.22)` }} />
      {clip.overlays ? <Overlays o={clip.overlays} tall={height > width} height={height} /> : null}
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
