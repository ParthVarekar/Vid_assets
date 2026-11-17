// Dope sheet and graph editor.
//
// Dope sheet: scrub on the ruler; click, shift-click or drag a box over empty
// space to select keys; drag a key to move it; right-click for interpolation
// and ease presets. An audio waveform lane appears under the ruler when the
// clip has an `audio` file.

import React, { useEffect, useRef, useState } from "react";
import { EASE_DEFAULT, EASE_PRESETS, sampleKeys, setKey, type Key } from "../../src/world3d/anim/clip";
import { useEnvelope } from "./audio";
import { beginEdit, channelDef, channelsFor, deleteSelected, endEdit, getState, isSelected, moveSelected, select, set, setFrame, setInterp, useStore, type KeyRef } from "./store";

const ROW_H = 22;
const AUDIO_H = 36;

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

const sameRef = (a: KeyRef, b: KeyRef) => a.track === b.track && a.channel === b.channel && a.f === b.f;

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

/** Loudness of the clip's audio, one bar per frame. */
const AudioLane: React.FC<{ path: string; fps: number; duration: number; ppf: number; width: number }> = ({ path, fps, duration, ppf, width }) => {
  const env = useEnvelope(path, fps);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    c.width = width;
    c.height = AUDIO_H;
    const g = c.getContext("2d");
    if (!g) return;
    g.clearRect(0, 0, width, AUDIO_H);
    if (!env) return;
    let max = 1e-6;
    for (let i = 0; i < env.length; i++) max = Math.max(max, env[i]);
    g.fillStyle = "#6f8fb8";
    for (let f = 0; f < Math.min(env.length, duration); f++) {
      const h = Math.max(1, (env[f] / max) * (AUDIO_H - 6));
      g.fillRect(f * ppf, (AUDIO_H - h) / 2, Math.max(1, ppf - 0.5), h);
    }
  }, [env, width, ppf, duration]);
  return (
    <div className="audio-lane" style={{ width, height: AUDIO_H }} title={path}>
      <canvas ref={canvas} style={{ width, height: AUDIO_H }} />
      {!env ? <span className="hint small">loading {path}…</span> : null}
    </div>
  );
};

const Diamond: React.FC<{ r: KeyRef; ppf: number; summary?: KeyRef[]; onMenu: (e: React.MouseEvent) => void }> = ({ r, ppf, summary, onMenu }) => {
  const selected = useStore((s) => (summary ? summary.every((k) => isSelected(s, k)) : isSelected(s, r)));
  const interp = useStore((s) => s.clip.tracks[r.track]?.[r.channel]?.find((k) => k.f === r.f)?.i ?? "bezier");
  const drag = useDrag();
  return (
    <div
      className={`diamond ${selected ? "sel" : ""} ${summary ? "summary" : ""} i-${interp}`}
      style={{ left: r.f * ppf }}
      title={`${r.channel} @ ${r.f}`}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const refs = summary ?? [r];
        if (!refs.every((k) => isSelected(getState(), k))) set({ selected: refs });
        onMenu(e);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.button !== 0) return;
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

/** Right-click menu for the selected keys. */
const KeyMenu: React.FC<{ x: number; y: number; onClose: () => void }> = ({ x, y, onClose }) => {
  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };
  const count = useStore((s) => s.selected.length);
  const top = Math.min(y, window.innerHeight - 330);
  return (
    <div className="ctx-menu" style={{ left: x, top }} onPointerDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
      <div className="ctx-title">{count} key{count === 1 ? "" : "s"}</div>
      <button onClick={run(() => setInterp("bezier", EASE_DEFAULT))}>Bezier (ease in-out)</button>
      {Object.keys(EASE_PRESETS).map((n) => (
        <button key={n} onClick={run(() => setInterp("bezier", EASE_PRESETS[n]))}>
          {n}
        </button>
      ))}
      <button onClick={run(() => setInterp("linear"))}>Linear</button>
      <button onClick={run(() => setInterp("step"))}>Step (hold)</button>
      <div className="ctx-sep" />
      <button className="danger" onClick={run(deleteSelected)}>
        Delete
      </button>
    </div>
  );
};

const DopeSheet: React.FC = () => {
  const s = useStore((x) => x);
  const ppf = s.pxPerFrame;
  const width = s.clip.duration * ppf + 40;
  const tracks = [...s.clip.cast.map((m) => m.id as string), "camera", "camera-9x16"];
  const q = s.search.trim().toLowerCase();
  const chans = channelsFor(s.track).filter((c) =>
    q ? `${c.label} ${c.id} ${c.help}`.toLowerCase().includes(q) : s.showAll || (s.clip.tracks[s.track]?.[c.id]?.length ?? 0) > 0,
  );
  const drag = useDrag();
  const rowsRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [box, setBox] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  // Close the menu on any outside press or Escape.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const rowKeys = (track: string, channel: string) => (s.clip.tracks[track]?.[channel] ?? []).map((k) => ({ track, channel, f: k.f }));
  const summaryKeys = (track: string) => {
    const byF = new Map<number, KeyRef[]>();
    for (const [ch, keys] of Object.entries(s.clip.tracks[track] ?? {})) for (const k of keys) byF.set(k.f, [...(byF.get(k.f) ?? []), { track, channel: ch, f: k.f }]);
    return [...byF.entries()];
  };

  // Every diamond's centre, for box-select hit testing (rows are ROW_H apart).
  const items: Array<{ x: number; y: number; refs: KeyRef[] }> = [];
  tracks.forEach((t, ti) => summaryKeys(t).forEach(([f, refs]) => items.push({ x: f * ppf, y: ti * ROW_H + ROW_H / 2, refs })));
  chans.forEach((c, ci) => rowKeys(s.track, c.id).forEach((r) => items.push({ x: r.f * ppf, y: (tracks.length + 1 + ci) * ROW_H + ROW_H / 2, refs: [r] })));

  const startBox = (e: React.PointerEvent) => {
    if (e.button !== 0 || !rowsRef.current) return;
    const rect = rowsRef.current.getBoundingClientRect();
    const x0 = e.clientX - rect.left;
    const y0 = e.clientY - rect.top;
    const base = e.shiftKey ? getState().selected : [];
    if (!e.shiftKey) select(null);
    drag(
      e,
      (_dx, _dy, ev) => {
        const x1 = ev.clientX - rect.left;
        const y1 = ev.clientY - rect.top;
        setBox({ x0, y0, x1, y1 });
        const [xa, xb] = [Math.min(x0, x1), Math.max(x0, x1)];
        const [ya, yb] = [Math.min(y0, y1), Math.max(y0, y1)];
        const picked: KeyRef[] = [...base];
        for (const it of items) {
          if (it.x >= xa - 6 && it.x <= xb + 6 && it.y >= ya - 8 && it.y <= yb + 8) for (const r of it.refs) if (!picked.some((p) => sameRef(p, r))) picked.push(r);
        }
        set({ selected: picked });
      },
      () => setBox(null),
    );
  };

  const audioH = s.clip.audio ? AUDIO_H : 0;
  return (
    <div className="dope">
      <div className="names">
        <div className="name-head">
          <label>
            <input type="checkbox" checked={s.showAll} onChange={(e) => set({ showAll: e.target.checked })} /> all channels
          </label>
        </div>
        {s.clip.audio ? (
          <div className="name audio-name" style={{ height: AUDIO_H, lineHeight: `${AUDIO_H}px` }} title={s.clip.audio}>
            audio
          </div>
        ) : null}
        {tracks.map((t) => (
          <div key={t} className={`name summary ${t === s.track ? "on" : ""}`} onClick={() => set({ track: t })}>
            {t}
          </div>
        ))}
        <div className="name sep">{s.track} channels{q ? ` · “${q}”` : ""}</div>
        {chans.map((c) => (
          <div key={c.id} className="name" title={c.help}>
            {c.label}
          </div>
        ))}
      </div>
      <div className="lanes">
        <div style={{ width, position: "relative" }}>
          <Ruler width={width} />
          {s.clip.audio ? <AudioLane path={s.clip.audio} fps={s.clip.fps} duration={s.clip.duration} ppf={ppf} width={width} /> : null}
          <div className="rows" ref={rowsRef} onPointerDown={startBox}>
            {tracks.map((t) => (
              <div key={t} className={`lane summary ${t === s.track ? "on" : ""}`} style={{ width }}>
                {summaryKeys(t).map(([f, refs]) => (
                  <Diamond key={f} r={refs[0]} summary={refs} ppf={ppf} onMenu={(e) => setMenu({ x: e.clientX, y: e.clientY })} />
                ))}
              </div>
            ))}
            <div className="lane sep" style={{ width }} />
            {chans.map((c) => (
              <div key={c.id} className="lane" style={{ width }}>
                {rowKeys(s.track, c.id).map((r) => (
                  <Diamond key={r.f} r={r} ppf={ppf} onMenu={(e) => setMenu({ x: e.clientX, y: e.clientY })} />
                ))}
              </div>
            ))}
            {box ? <div className="marquee" style={{ left: Math.min(box.x0, box.x1), top: Math.min(box.y0, box.y1), width: Math.abs(box.x1 - box.x0), height: Math.abs(box.y1 - box.y0) }} /> : null}
            <div className="playhead" style={{ left: s.frame * ppf, top: -(26 + audioH), height: (tracks.length + chans.length + 1) * ROW_H + 26 + audioH }} />
          </div>
        </div>
      </div>
      {menu ? <KeyMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} /> : null}
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
  const norm = s.normalise;
  // Channels: those with selected keys, else the selected track's animated channels.
  let chs = [...new Set(s.selected.filter((k) => k.track === s.track).map((k) => k.channel))];
  if (!chs.length) chs = Object.keys(s.clip.tracks[s.track] ?? {});
  chs = chs.slice(0, 6);
  const keysOf = (ch: string) => s.clip.tracks[s.track]?.[ch] ?? [];

  // Value range of each channel over the clip (flat channels get a little room).
  const range: Record<string, { lo: number; hi: number }> = {};
  for (const ch of chs) {
    const def = channelDef(s.track, ch)?.default ?? 0;
    let lo = Infinity;
    let hi = -Infinity;
    for (let f = 0; f < s.clip.duration; f += 2) {
      const v = sampleKeys(keysOf(ch), f, def);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    if (!Number.isFinite(lo)) [lo, hi] = [def - 0.5, def + 0.5];
    if (hi - lo < 1e-3) [lo, hi] = [lo - 0.5, hi + 0.5];
    range[ch] = { lo, hi };
  }
  // The shared axis: real values, or 0..1 per channel when normalised.
  let alo = -1;
  let ahi = 1;
  if (norm) {
    alo = -0.1;
    ahi = 1.1;
  } else if (chs.length) {
    alo = Math.min(...chs.map((c) => range[c].lo));
    ahi = Math.max(...chs.map((c) => range[c].hi));
    const span = ahi - alo;
    alo -= span * 0.12;
    ahi += span * 0.12;
  }
  const toU = (ch: string, v: number) => (norm ? (v - range[ch].lo) / (range[ch].hi - range[ch].lo) : v);
  const fromU = (ch: string, u: number) => (norm ? range[ch].lo + u * (range[ch].hi - range[ch].lo) : u);
  const YU = (u: number) => pad + (1 - (u - alo) / (ahi - alo)) * (H - pad * 2);
  const UY = (py: number) => alo + (1 - (py - pad) / (H - pad * 2)) * (ahi - alo);
  const Yv = (ch: string, v: number) => YU(toU(ch, v));
  const Vy = (ch: string, py: number) => fromU(ch, UY(py));
  const X = (f: number) => f * s.pxPerFrame;

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
        <label title="Scale every channel to the full height, so degrees and 0..1 values can be compared">
          <input type="checkbox" checked={norm} onChange={(e) => set({ normalise: e.target.checked })} /> normalise
        </label>
        <span className="legend">
          {chs.map((c, i) => (
            <b key={c} style={{ color: COLORS[i % COLORS.length] }}>
              {channelDef(s.track, c)?.label ?? c}
              {norm ? ` (${+range[c].lo.toFixed(2)}…${+range[c].hi.toFixed(2)})` : ""}
            </b>
          ))}
        </span>
      </div>
      <div className="graph-scroll">
        <svg ref={svg} width={W} height={H} onPointerDown={() => select(null)}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const u = alo + (ahi - alo) * t;
            return (
              <g key={t}>
                <line x1={0} x2={W} y1={YU(u)} y2={YU(u)} className="grid" />
                <text x={4} y={YU(u) - 3} className="gridlabel">
                  {norm ? `${Math.round(u * 100)}%` : u.toFixed(2)}
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
            for (let f = 0; f <= s.clip.duration; f += 0.5) d += `${f === 0 ? "M" : "L"}${X(f).toFixed(1)},${Yv(ch, sampleKeys(keys, f, def)).toFixed(1)}`;
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
                          const h1 = [X(k.f + e[0] * df), Yv(ch, k.v + e[1] * dv)];
                          const h2 = [X(k.f + e[2] * df), Yv(ch, k.v + e[3] * dv)];
                          const handle = (idx: 0 | 1, p: number[]) => (
                            <g key={idx}>
                              <line x1={idx === 0 ? X(k.f) : X(nx.f)} y1={idx === 0 ? Yv(ch, k.v) : Yv(ch, nx.v)} x2={p[0]} y2={p[1]} stroke={col} strokeOpacity={0.5} />
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
                                      const vy = Vy(ch, pe.clientY - rect.top);
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
                        y={Yv(ch, k.v) - 5}
                        width={10}
                        height={10}
                        transform={`rotate(45 ${X(k.f)} ${Yv(ch, k.v)})`}
                        className={`gkey ${sel ? "sel" : ""}`}
                        stroke={col}
                        onPointerDown={(ev) => {
                          ev.stopPropagation();
                          select({ track: s.track, channel: ch, f: k.f }, ev.shiftKey);
                          const rect = svg.current!.getBoundingClientRect();
                          drag(
                            ev,
                            (_dx, _dy, pe) => {
                              const v = Vy(ch, pe.clientY - rect.top);
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
    <div
      className="timeline"
      onWheel={(e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        set((s) => ({ pxPerFrame: Math.max(2, Math.min(40, s.pxPerFrame * (e.deltaY < 0 ? 1.15 : 1 / 1.15))) }));
      }}
    >
      {panel === "dope" ? <DopeSheet /> : <GraphEditor />}
    </div>
  );
};
