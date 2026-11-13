// Composites an optional generated plate (see src/plates.ts). Renders nothing
// when no plate is registered, which is the case in the delivered film.
//
// Note: this path has not been exercised with real generated media, because
// the Higgsfield account had no credits during production.

import React from "react";
import { Video } from "@remotion/media";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { PLATES } from "../plates";

export const Plate: React.FC<{
  id: keyof typeof PLATES;
  opacity?: number;
  blend?: React.CSSProperties["mixBlendMode"];
}> = ({ id, opacity = 0.6, blend = "multiply" }) => {
  const file = PLATES[id];
  if (!file) return null;
  const src = staticFile(file);
  const style: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: blend, pointerEvents: "none" }}>
      {/\.(mp4|webm|mov)$/i.test(file) ? <Video src={src} style={style} muted loop /> : <Img src={src} style={style} />}
    </AbsoluteFill>
  );
};
