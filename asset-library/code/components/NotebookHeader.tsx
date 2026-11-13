// The notebook header: mark, name and folio number, present in every frame.
// It is the film's standing brand cue (research: brand early and often).
//
// It is drawn in white with a "difference" blend, so it reads dark on paper
// and light on ink, and stays legible while a scene change sweeps past.

import React from "react";
import { AbsoluteFill } from "remotion";
import { EASE, tween } from "../animations/ease";
import { FONT, TRACK } from "../theme";
import type { Layout } from "../utilities/layout";
import { LogoMark } from "./Quill";
import { Mono } from "./Type";

export type FolioEntry = { from: number; folio: string; label: string };

export const NotebookHeader: React.FC<{
  frame: number;
  layout: Layout;
  folios: FolioEntry[];
  total: number;
  /** 1 hides the header (used once the full logo is on screen). */
  hide?: number;
}> = ({ frame, layout: L, folios, total, hide = 0 }) => {
  const u = L.u;
  const markH = 34 * u;
  const nameSize = 25 * u;
  const monoSize = L.format === "tall" ? 19 * u : 17 * u;

  let index = 0;
  for (let i = 0; i < folios.length; i++) {
    if (frame >= folios[i].from) index = i;
  }
  const current = folios[index];
  const previous = index > 0 ? folios[index - 1] : undefined;
  const roll = tween(frame, current.from - 2, 14, EASE.out);
  const count = String(folios.length).padStart(2, "0");

  const row = (entry: FolioEntry) => (
    <Mono size={monoSize} color="#fff" wide upper>
      folio {entry.folio}
      <span style={{ opacity: 0.45 }}> / {count}</span>
      <span style={{ opacity: 0.45 }}> — </span>
      {entry.label}
    </Mono>
  );

  return (
    <AbsoluteFill style={{ mixBlendMode: "difference", opacity: 1 - hide, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: L.margin,
          right: L.margin,
          top: L.headerY,
          height: markH,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 * u }}>
          <LogoMark height={markH} color="#fff" />
          <div
            style={{
              fontFamily: FONT.sans,
              fontWeight: 600,
              fontSize: nameSize,
              letterSpacing: TRACK.title,
              color: "#fff",
              lineHeight: 1,
            }}
          >
            ProtoVinci
          </div>
        </div>
        <div style={{ position: "relative", height: monoSize * 1.45, overflow: "hidden", textAlign: "right" }}>
          {previous && roll < 1 ? (
            <div style={{ position: "absolute", right: 0, top: 0, translate: `0 ${-roll * 110}%` }}>
              {row(previous)}
            </div>
          ) : null}
          <div style={{ translate: `0 ${(1 - roll) * 110 * (previous ? 1 : 0)}%` }}>{row(current)}</div>
        </div>
      </div>
      {/* Rule with a marker that travels as the film progresses. */}
      <div
        style={{
          position: "absolute",
          left: L.margin,
          right: L.margin,
          top: L.headerY + markH + 16 * u,
          height: Math.max(1, 1.25 * u),
          backgroundColor: "rgba(255,255,255,0.28)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${Math.min(100, (frame / Math.max(1, total - 1)) * 100).toFixed(3)}%`,
            backgroundColor: "#fff",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
