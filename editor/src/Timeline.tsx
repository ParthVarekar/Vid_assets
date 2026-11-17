// Dope sheet and graph editor.

import React, { useRef } from "react";
import { EASE_DEFAULT, EASE_PRESETS, sampleKeys, setKey, type Key } from "../../src/world3d/anim/clip";
import { beginEdit, channelDef, channelsFor, endEdit, getState, isSelected, moveSelected, select, set, setFrame, setInterp, useStore, type KeyRef } from "./store";

const ROW_H = 22;

/** Drag helper: calls onMove with the pixel delta from the press point. */
const useDrag = () => {
  const ref = useRef<{ x: number; y: number } | null>(null);
  return (e: React.PointerEvent, onMove: (dx: number, dy: number, ev: PointerEvent) => void, onUp?: () => void) => {
    ref.current = { x: e.clientX, y: e.clientY };
    const move = (ev: PointerEvent) => ref.current && onMove(ev.clientX - ref.current.x, ev.clientY - ref.current.y, ev);
    const up = () => {
      ref.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onUp?.();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
};

const Ruler: React.FC<{ width: number }> = ({ width }) => {
  const ppf = useStore((s) => s.pxPerFrame);
  const duration = useStore((s) => s.clip.duration);
  const fps = useStore((s) => s.clip.fps);
  const drag = useDrag();
  const ticks: React.ReactNode[] = [];
  const every = ppf >= 10 ? 5 : ppf >= 5 ? 10 : 30;
  for (let f = 0; f <= duration; f += every) {
    ticks.push(
      <div key={f} className={`tick ${f % fps === 0 ? "major" : ""}`} style={{ left: f * ppf }}>
        <span>{f % fps === 0 ? `${f / fps}s` : f}</span>
      </div>,
    );
  }
  const scrub = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const at = (x: number) => setFrame((x - rect.left) / ppf);
    at(e.clientX);
    drag(e, (_dx, _dy, ev) => at(ev.clientX));
  };
  return (
    <div className="ruler" style={{ width }} onPointerDown={scrub}>
      {ticks}
    </div>
  );
};

const Diamond: React.FC<{ r: KeyRef; ppf: number; summary?: KeyRef[] }> = ({ r, ppf, summary }) => {
  const selected = useStore((s) => (summary ? summary.every((k) => isSelected(s, k)) : isSelected(s, r)));
  const interp = useStore((s) => s.clip.tracks[r.track]?.[r.channel]?.find((k) => k.f === r.f)?.i ?? "bezier");
  const drag = useDrag();
  return (
    <div
      className={`diamond ${selected ? "sel" : ""} ${summary ? "summary" : ""} i-${interp}`}
      style={{ left: r.f * ppf }}
      title={`${r.channel} @ ${r.f}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        const s = getState();
        const refs = summary ?? [r];
        if (e.shiftKey) refs.forEach((k) => select(k, true));
        else if (!refs.every((k) => isSelected(s, k))) set({ selected: refs });
        let applied = 0;
        drag(
          e,
          (dx) => {
            const df = Math.round(dx / ppf);
            if (df !== applied) {
              moveSelected(df - applied, true);
              applied = df;
            }
          },
          endEdit,
        );
      }}
    />
  );
};

const DopeSheet: React.FC = () => {
  const s = useStore((x) => x);
  const ppf = s.pxPerFrame;
  const width = s.clip.duration * ppf + 40;
  const tracks = [...s.clip.cast.map((m) => m.id as string), "camera"];
  const chans = channelsFor(s.track).filter((c) => s.showAll || (s.clip.tracks[s.track]?.[c.id]?.length ?? 0) > 0);

  const rowKeys = (track: string, channel: string) => (s.clip.tracks[track]?.[channel] ?? []).map((k) => ({ track, channel, f: k.f }));
  const summaryKeys = (track: string) => {
    const byF = new Map<number, KeyRef[]>();
    for (const [ch, keys] of Object.entries(s.clip.tracks[track] ?? {})) for (const k of keys) byF.set(k.f, [...(byF.get(k.f) ?? []), { track, channel: ch, f: k.f }]);
    return [...byF.entries()];
  };

  return (
    <div className="dope">
      <div className="names">
        <div className="name-head">
          <label>
            <input type="checkbox" checked={s.showAll} onChange={(e) => set({ showAll: e.target.checked })} /> all channels
          </label>
        </div>
        {tracks.map((t) => (
          <div key={t} className={`name summary ${t === s.track ? "on" : ""}`} onClick={() => set({ track: t })}>
            {t}
          </div>
        ))}
        <div className="name sep">{s.track} channels</div>
        {chans.map((c) => (
          <div key={c.id} className="name" title={c.help}>
            {c.label}
          </div>
        ))}
      </div>
      <div className="lanes">
        <div style={{ width, position: "relative" }}>
          <Ruler width={width} />
          <div className="rows" onPointerDown={() => select(null)}>
            {tracks.map((t) => (
              <div key={t} className={`lane summary ${t === s.track ? "on" : ""}`} style={{ width }}>
                {summaryKeys(t).map(([f, refs]) => (
                  <Diamond key={f} r={refs[0]} summary={refs} ppf={ppf} />
                ))}
              </div>
            ))}
            <div className="lane sep" style={{ width }} />
            {chans.map((c) => (
              <div key={c.id} className="lane" style={{ width }}>
                {rowKeys(s.track, c.id).map((r) => (
                  <Diamond key={r.f} r={r} ppf={ppf} />
                ))}
              </div>
            ))}
            <div className="playhead" style={{ left: s.frame * ppf, height: (tracks.length + chans.length + 1) * ROW_H + 26 }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Graph editor
// ---------------------------------------------------------------------------

const COLORS = ["#E2553B", "#3B82C4", "#3FA34D", "#B85FD0", "#D9A21B", "#2BA6A6"];

const GraphEditor: React.FC = () => {
  const s = useStore((x) => x);
  const drag = useDrag();
  const svg = useRef<SVGSVGElement>(null);
  const W = Math.max(600, s.clip.duration * s.pxPerFrame + 40);
  const H = 230;
  const pad = 18;
  // Channels: those with selected keys, else the selected track's animated channels.
  let chs = [...new Set(s.selected.filter((k) => k.track === s.track).map((k) => k.channel))];
  if (!chs.length) chs = Object.keys(s.clip.tracks[s.track] ?? {});
  chs = chs.slice(0, 6);
  const keysOf = (ch: string) => s.clip.tracks[s.track]?.[ch] ?? [];
  let lo = Infinity;
  let hi = -Infinity;
  for (const ch of chs) {
    const def = channelDef(s.track, ch)?.default ?? 0;
    for (let f = 0; f < s.clip.duration; f += 2) {
      const v = sampleKeys(keysOf(ch), f, def);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  if (!Number.isFinite(lo)) {
    lo = -1;
    hi = 1;
  }
  if (hi - lo < 1e-3) {
    lo -= 0.5;
    hi += 0.5;
  }
  const span = hi - lo;
  lo -= span * 0.12;
  hi += span * 0.12;
  const X = (f: number) => f * s.pxPerFrame;
  const Y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (H - pad * 2);
  const V = (py: number) => lo + (1 - (py - pad) / (H - pad * 2)) * (hi - lo);

  const editKey = (ch: string, f: number, patch: (k: Key, next?: Key) => Key) => {
    const st = getState();
    const keys = st.clip.tracks[st.track]?.[ch] ?? [];
    const i = keys.findIndex((k) => k.f === f);
    if (i < 0) return;
    beginEdit();
    set({ clip: setKey(st.clip, st.track, ch, patch(keys[i], keys[i + 1])), dirty: true });
  };

  return (
    <div className="graph">
      <div className="graph-bar">
        <span className="hint">{chs.length ? "Drag points to change values, handles to shape the ease." : "Select keys (or a bird with animation) to see curves."}</span>
        <button onClick={() => setInterp("bezier")}>Bezier</button>
        <button onClick={() => setInterp("linear")}>Linear</button>
        <button onClick={() => setInterp("step")}>Step</button>
        <select value="" onChange={(e) => e.target.value && setInterp("bezier", EASE_PRESETS[e.target.value])}>
          <option value="">Ease preset…</option>
          {Object.keys(EASE_PRESETS).map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <span className="legend">
          {chs.map((c, i) => (
            <b key={c} style={{ color: COLORS[i % COLORS.length] }}>
              {channelDef(s.track, c)?.label ?? c}
            </b>
          ))}
        </span>
      </div>
      <div className="graph-scroll">
        <svg ref={svg} width={W} height={H} onPointerDown={() => select(null)}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const v = lo + (hi - lo) * t;
            return (
              <g key={t}>
                <line x1={0} x2={W} y1={Y(v)} y2={Y(v)} className="grid" />
                <text x={4} y={Y(v) - 3} className="gridlabel">
                  {v.toFixed(2)}
                </text>
              </g>
            );
          })}
          <line x1={X(s.frame)} x2={X(s.frame)} y1={0} y2={H} className="playhead-line" />
          {chs.map((ch, ci) => {
            const col = COLORS[ci % COLORS.length];
            const keys = keysOf(ch);
            const def = channelDef(s.track, ch)?.default ?? 0;
            let d = "";
            for (let f = 0; f <= s.clip.duration; f += 0.5) d += `${f === 0 ? "M" : "L"}${X(f).toFixed(1)},${Y(sampleKeys(keys, f, def)).toFixed(1)}`;
            return (
              <g key={ch}>
                <path d={d} fill="none" stroke={col} strokeWidth={1.6} />
                {keys.map((k, i) => {
                  const nx = keys[i + 1];
                  const handles =
                    nx && (k.i ?? "bezier") === "bezier" && Math.abs(nx.v - k.v) > 1e-6
                      ? (() => {
                          const e = k.e ?? EASE_DEFAULT;
                          const df = nx.f - k.f;
                          const dv = nx.v - k.v;
                          const h1 = [X(k.f + e[0] * df), Y(k.v + e[1] * dv)];
                          const h2 = [X(k.f + e[2] * df), Y(k.v + e[3] * dv)];
                          const handle = (idx: 0 | 1, p: number[]) => (
                            <g key={idx}>
                              <line x1={idx === 0 ? X(k.f) : X(nx.f)} y1={idx === 0 ? Y(k.v) : Y(nx.v)} x2={p[0]} y2={p[1]} stroke={col} strokeOpacity={0.5} />
                              <circle
                                cx={p[0]}
                                cy={p[1]}
                                r={4.5}
                                className="handle"
                                stroke={col}
                                onPointerDown={(ev) => {
                                  ev.stopPropagation();
                                  const rect = svg.current!.getBoundingClientRect();
                                  drag(
                                    ev,
                                    (_dx, _dy, pe) => {
                                      const fx = (pe.clientX - rect.left) / s.pxPerFrame;
                                      const vy = V(pe.clientY - rect.top);
                                      const ex = Math.max(0, Math.min(1, (fx - k.f) / df));
                                      const ey = (vy - k.v) / dv;
                                      editKey(ch, k.f, (kk) => {
                                        const ee = [...(kk.e ?? EASE_DEFAULT)] as [number, number, number, number];
                                        ee[idx * 2] = +ex.toFixed(3);
                                        ee[idx * 2 + 1] = +ey.toFixed(3);
                                        return { ...kk, i: "bezier", e: ee };
                                      });
                                    },
                                    endEdit,
                                  );
                                }}
                              />
                            </g>
                          );
                          return [handle(0, h1), handle(1, h2)];
                        })()
                      : null;
                  const sel = isSelected(s, { track: s.track, channel: ch, f: k.f });
                  return (
                    <g key={k.f}>
                      {handles}
                      <rect
                        x={X(k.f) - 5}
                        y={Y(k.v) - 5}
                        width={10}
                        height={10}
                        transform={`rotate(45 ${X(k.f)} ${Y(k.v)})`}
                        className={`gkey ${sel ? "sel" : ""}`}
                        stroke={col}
                        onPointerDown={(ev) => {
                          ev.stopPropagation();
                          select({ track: s.track, channel: ch, f: k.f }, ev.shiftKey);
                          const rect = svg.current!.getBoundingClientRect();
                          drag(
                            ev,
                            (_dx, _dy, pe) => {
                              const v = V(pe.clientY - rect.top);
                              editKey(ch, k.f, (kk) => ({ ...kk, v: +v.toFixed(4) }));
                            },
                            endEdit,
                          );
                        }}
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export const Timeline: React.FC = () => {
  const panel = useStore((s) => s.panel);
  return (
    <div className="timeline" onWheel={(e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      set((s) => ({ pxPerFrame: Math.max(2, Math.min(40, s.pxPerFrame * (e.deltaY < 0 ? 1.15 : 1 / 1.15))) }));
    }}>
      {panel === "dope" ? <DopeSheet /> : <GraphEditor />}
    </div>
  );
};
