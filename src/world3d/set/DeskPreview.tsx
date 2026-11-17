// A still of the Desk with the trio, for any light rig and camera preset.
//   npx remotion still DeskPreview out/desk.png --props='{"rig":"desk-golden","preset":"hero"}' --gl=angle
// scripts/set/render-set-sheet.mjs renders every combination into one sheet.

import React, { useMemo } from "react";
import type { Clip } from "../anim/clip";
import { Episode } from "../Episode";
import { CAMERA_PRESETS } from "./cameraPresets";

export type DeskPreviewProps = { rig: string; preset: string; quality: "final" | "preview"; /** Set false to skip depth of field (faster). */ lens?: boolean };

export const deskPreviewClip = (rig: string, preset: string, lens = true): Clip => {
  const cam = { ...(CAMERA_PRESETS[preset]?.values ?? CAMERA_PRESETS.wide.values), ...(lens ? {} : { blur: 0 }) };
  return {
    version: 1,
    name: `desk-${rig}-${preset}`,
    fps: 30,
    duration: 1,
    set: "desk",
    rig,
    cast: [
      { id: "ink", seed: 2 },
      { id: "quill", seed: 1 },
      { id: "chalk", seed: 3 },
    ],
    tracks: {
      camera: Object.fromEntries(Object.entries(cam).map(([k, v]) => [k, [{ f: 0, v }]])),
      ink: { x: [{ f: 0, v: -1.5 }], yaw: [{ f: 0, v: 12 }], lookX: [{ f: 0, v: 0.4 }], lidTiltL: [{ f: 0, v: -0.35 }], lidTiltR: [{ f: 0, v: 0.15 }] },
      quill: { x: [{ f: 0, v: 0 }], lookY: [{ f: 0, v: 0.1 }], squint: [{ f: 0, v: 0.3 }], tilt: [{ f: 0, v: 6 }] },
      chalk: { x: [{ f: 0, v: 1.45 }], yaw: [{ f: 0, v: -14 }], lookX: [{ f: 0, v: -0.45 }], pupil: [{ f: 0, v: 1.2 }], lidOpen: [{ f: 0, v: 0.3 }] },
    },
  };
};

export const DeskPreview: React.FC<DeskPreviewProps> = ({ rig, preset, quality, lens = true }) => {
  const clip = useMemo(() => deskPreviewClip(rig, preset, lens), [rig, preset, lens]);
  return <Episode clip={clip} quality={quality} />;
};
