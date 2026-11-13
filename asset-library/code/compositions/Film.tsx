// The master film. Scenes are laid end to end along one line; the camera
// travels between them, so there are no hard cuts.

import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, tween } from "../animations/ease";
import { NotebookHeader, type FolioEntry } from "../components/NotebookHeader";
import { Grain } from "../components/Surface";
import { C } from "../theme";
import { PRE, PUSH } from "../timeline";
import { useLayout } from "../utilities/layout";

/** Direction the picture moves when the camera leaves a scene. */
export type Move = { dx: number; dy: number };
export const LATERAL: Move = { dx: -1, dy: 0 };
/** Used once, when the line climbs out through the top-right corner. */
export const CLIMB: Move = { dx: -1, dy: 1 };

export type Slot = {
  id: string;
  from: number;
  to: number;
  folio: string;
  label: string;
  /** Ground colour of the scene, used to bleed past the frame during moves. */
  ground: string;
  /** How the camera leaves this scene. Omit on the last scene. */
  exit?: Move;
  render: () => React.ReactNode;
};

export type FilmProps = {
  /** Path under public/, or null for a silent render. */
  audio: string | null;
  /** Show real shipped project screens in the proof scene. */
  showWork: boolean;
  /** Address shown on the end card. */
  url: string;
};

const SceneSlot: React.FC<{
  slot: Slot;
  enter?: Move;
  index: number;
  children: React.ReactNode;
}> = ({ slot, enter, index, children }) => {
  const frame = useCurrentFrame() + slot.from - PRE; // global frame
  const { width: w, height: h } = useVideoConfig();

  const tIn = enter ? tween(frame, slot.from - PRE, PUSH, EASE.inOut) : 1;
  const tOut = slot.exit ? tween(frame, slot.to - PRE, PUSH, EASE.inOut) : 0;
  const x = (enter ? -enter.dx * (1 - tIn) : 0) * w + (slot.exit ? slot.exit.dx * tOut : 0) * w;
  const y = (enter ? -enter.dy * (1 - tIn) : 0) * h + (slot.exit ? slot.exit.dy * tOut : 0) * h;

  // Directional blur proportional to camera speed (about a half-open shutter).
  const speedIn = enter
    ? Math.abs(tween(frame + 0.5, slot.from - PRE, PUSH, EASE.inOut) - tween(frame - 0.5, slot.from - PRE, PUSH, EASE.inOut))
    : 0;
  const speedOut = slot.exit
    ? Math.abs(tween(frame + 0.5, slot.to - PRE, PUSH, EASE.inOut) - tween(frame - 0.5, slot.to - PRE, PUSH, EASE.inOut))
    : 0;
  const move = speedIn > speedOut ? enter : slot.exit;
  const speed = Math.max(speedIn, speedOut);
  const blurX = move ? Math.abs(move.dx) * speed * w * 0.13 : 0;
  const blurY = move ? Math.abs(move.dy) * speed * h * 0.13 : 0;
  const blurred = blurX + blurY > 0.6;
  const filterId = `push-${index}`;

  const bleed = 64;
  return (
    <AbsoluteFill
      style={{
        // Whole pixels, so two scenes never leave a hairline between them.
        translate: `${Math.round(x)}px ${Math.round(y)}px`,
        filter: blurred ? `url(#${filterId})` : undefined,
      }}
    >
      {blurred ? (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <defs>
            {/* sRGB, not the default linearRGB: the default posterises dark
                gradients into visible bands while the blur is active. */}
            <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation={`${blurX.toFixed(2)} ${blurY.toFixed(2)}`} />
            </filter>
          </defs>
        </svg>
      ) : null}
      {/* The scene's ground, carried past the frame edge so a blurred edge
          never reveals what is behind it. */}
      <div
        style={{
          position: "absolute",
          left: -bleed,
          top: -bleed,
          width: w + bleed * 2,
          height: h + bleed * 2,
          backgroundColor: slot.ground,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

export const Timeline: React.FC<{
  slots: Slot[];
  total: number;
  audio: string | null;
  /** Frame from which the header gives way to the full logo. */
  headerOutAt?: number;
}> = ({ slots, total, audio, headerOutAt }) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const folios: FolioEntry[] = slots.map((s) => ({ from: s.from, folio: s.folio, label: s.label }));
  const hide = headerOutAt === undefined ? 0 : tween(frame, headerOutAt, 12, EASE.out);

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper }}>
      {slots.map((slot, i) => (
        <Sequence
          key={slot.id}
          name={slot.id}
          from={slot.from - PRE}
          durationInFrames={slot.to - slot.from + PUSH}
          layout="none"
        >
          <SceneSlot slot={slot} enter={i > 0 ? slots[i - 1].exit : undefined} index={i}>
            {slot.render()}
          </SceneSlot>
        </Sequence>
      ))}
      <NotebookHeader frame={frame} layout={layout} folios={folios} total={total} hide={hide} />
      <Grain />
      {audio ? <Audio src={staticFile(audio)} /> : null}
    </AbsoluteFill>
  );
};
