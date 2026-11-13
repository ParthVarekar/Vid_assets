// The text block for Build / Automate / Scale: a small index, the word, and a
// mono caption naming what is being made. Capabilities are captions on things
// being built, never a list by themselves.

import React from "react";
import { EASE, tween } from "../animations/ease";
import { C } from "../theme";
import type { Layout } from "../utilities/layout";
import { Headline, Mono, Rise } from "./Type";

export const TitleBlock: React.FC<{
  f: number;
  L: Layout;
  at: number;
  captionAt: number;
  index: string;
  word: string;
  /** Caption as set in the wide layout, one entry per line. */
  caption: string[];
  /** The same caption on one line, for the tall and square layouts. */
  captionOneLine: string;
  dark?: boolean;
}> = ({ f, L, at, captionAt, index, word, caption, captionOneLine, dark = false }) => {
  const u = L.u;
  const wide = L.format === "wide";
  const ink = dark ? C.nightText : C.ink;
  const muted = dark ? C.nightMuted : C.graphite;
  const lines = wide ? caption : [captionOneLine];
  const shown = tween(f, at, 12, EASE.out);
  return (
    <div
      style={{
        position: "absolute",
        left: L.text.x,
        top: L.text.y + (wide ? 44 * u : 0),
        width: L.text.w,
      }}
    >
      <div style={{ opacity: shown, translate: `0 ${(1 - shown) * 8 * u}px` }}>
        <Mono size={L.type.mono} color={muted} wide upper>
          <span style={{ color: ink, fontWeight: 500 }}>{index}</span>
          <span style={{ opacity: 0.55 }}> / 03</span>
        </Mono>
      </div>
      <div style={{ marginTop: (wide ? 16 : 8) * u }}>
        <Headline lines={[word]} f={f} at={at} size={L.type.title} color={ink} />
      </div>
      <div style={{ marginTop: (wide ? 30 : 18) * u }}>
        {lines.map((line, i) => (
          <Rise key={line} f={f} at={captionAt + i * 4} duration={15}>
            <Mono size={L.type.mono * (wide ? 1.08 : 1)} color={muted}>
              {line}
            </Mono>
          </Rise>
        ))}
      </div>
    </div>
  );
};
