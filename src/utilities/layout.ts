// Format-aware layout. The same scenes render as 16:9, 9:16 and 1:1; each
// format gets its own arrangement rather than a crop.
//
// Every scene has two regions: a text block and a stage. The stage is drawn
// in a fixed virtual space (STAGE) and scaled to fit, so scene artwork is
// authored once. `threadY` is the height at which the line enters and leaves
// every scene, which is what lets the camera travel along it between scenes.

import { useMemo } from "react";
import { useVideoConfig } from "remotion";

export type Format = "wide" | "tall" | "square";
export type Rect = { x: number; y: number; w: number; h: number };

export const STAGE = { w: 1000, h: 640 } as const;

export type Layout = {
  w: number;
  h: number;
  format: Format;
  /** Scale relative to a 1080-pixel short side. */
  u: number;
  margin: number;
  headerY: number;
  text: Rect;
  stageBox: Rect;
  stage: { x: number; y: number; scale: number };
  threadY: number;
  /** Stage virtual coordinates to frame coordinates. */
  S: (x: number, y: number) => { x: number; y: number };
  type: {
    /** Hook and call-to-action statements. */
    hero: number;
    /** Build / Automate / Scale. */
    title: number;
    /** Supporting sentence. */
    lead: number;
    /** Mono labels. */
    mono: number;
  };
  /** Line breaks for the opening statement. */
  hookLines: string[];
  threadWidth: number;
  quillSize: number;
};

export const computeLayout = (w: number, h: number): Layout => {
  const ratio = w / h;
  const format: Format = ratio > 1.2 ? "wide" : ratio < 0.8 ? "tall" : "square";
  const u = Math.min(w, h) / 1080;

  let margin: number;
  let headerY: number;
  let text: Rect;
  let stageBox: Rect;
  let threadY: number;
  let type: Layout["type"];
  let hookLines: string[];

  if (format === "wide") {
    margin = 96 * u;
    headerY = 52 * u;
    text = { x: 96 * u, y: 286 * u, w: 620 * u, h: 460 * u };
    stageBox = { x: 740 * u, y: 140 * u, w: 1130 * u, h: 724 * u };
    threadY = 912 * u;
    type = { hero: 150 * u, title: 124 * u, lead: 40 * u, mono: 21 * u };
    hookLines = ["Some ideas", "shouldn't stay ideas."];
  } else if (format === "tall") {
    // Keep clear of platform chrome: roughly the top 14% and bottom 20%.
    margin = 72 * u;
    headerY = h * 0.142;
    text = { x: 72 * u, y: h * 0.2, w: w - 144 * u, h: h * 0.16 };
    stageBox = { x: 40 * u, y: h * 0.385, w: w - 80 * u, h: h * 0.365 };
    threadY = h * 0.775;
    type = { hero: 150 * u, title: 148 * u, lead: 44 * u, mono: 25 * u };
    hookLines = ["Some ideas", "shouldn't", "stay ideas."];
  } else {
    margin = 64 * u;
    headerY = 46 * u;
    text = { x: 64 * u, y: 124 * u, w: w - 128 * u, h: 210 * u };
    stageBox = { x: 64 * u, y: 348 * u, w: w - 128 * u, h: 556 * u };
    threadY = 962 * u;
    type = { hero: 128 * u, title: 112 * u, lead: 36 * u, mono: 21 * u };
    hookLines = ["Some ideas", "shouldn't", "stay ideas."];
  }

  const scale = Math.min(stageBox.w / STAGE.w, stageBox.h / STAGE.h);
  const stage = {
    x: stageBox.x + (stageBox.w - STAGE.w * scale) / 2,
    y: stageBox.y + (stageBox.h - STAGE.h * scale) / 2,
    scale,
  };

  return {
    w,
    h,
    format,
    u,
    margin,
    headerY,
    text,
    stageBox,
    stage,
    threadY,
    S: (x, y) => ({ x: stage.x + x * scale, y: stage.y + y * scale }),
    type,
    hookLines,
    threadWidth: 5 * u,
    quillSize: 168 * u,
  };
};

export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  return useMemo(() => computeLayout(width, height), [width, height]);
};
