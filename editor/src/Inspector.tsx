// Sliders for every channel of the selected bird (or the camera), built from
// the rig schema. The diamond keys/unkeys the channel at the playhead.

import React, { useState } from "react";
import { isCameraTrack } from "../../src/world3d/anim/clip";
import { GROUPS, type Channel } from "../../src/world3d/rig/schema";
import { CAMERA_PRESETS } from "../../src/world3d/set/cameraPresets";
import { channelsFor, currentValue, endEdit, keyAt, set, setValue, setValues, toggleKey, useStore } from "./store";

const KeyButton: React.FC<{ track: string; ch: Channel }> = ({ track, ch }) => {
  const keyed = useStore((s) => !!keyAt(s, track, ch.id));
  const animated = useStore((s) => (s.clip.tracks[track]?.[ch.id]?.length ?? 0) > 0);
  const pending = useStore((s) => s.pending[track]?.[ch.id] !== undefined);
  return (
    <button
      className={`key ${keyed ? "keyed" : animated ? "animated" : ""} ${pending ? "pending" : ""}`}
      title={keyed ? "Delete key at this frame" : "Set key at this frame"}
      onClick={() => toggleKey(track, ch.id)}
    >
      ◆
    </button>
  );
};

const Row: React.FC<{ track: string; ch: Channel }> = ({ track, ch }) => {
  const value = useStore((s) => currentValue(s, track, ch.id));
  const step = ch.unit === "deg" ? 0.5 : (ch.max - ch.min) / 400;
  return (
    <div className="row" title={ch.help}>
      <KeyButton track={track} ch={ch} />
      <label>{ch.label}</label>
      <input
        type="range"
        min={ch.min}
        max={ch.max}
        step={step}
        value={value}
        onChange={(e) => setValue(track, ch.id, +e.target.value, true)}
        onPointerUp={endEdit}
        onDoubleClick={() => setValue(track, ch.id, ch.default)}
      />
      <input
        className="num"
        type="number"
        step={step}
        value={+value.toFixed(ch.unit === "deg" ? 1 : 3)}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) setValue(track, ch.id, v);
        }}
      />
    </div>
  );
};

export const Inspector: React.FC = () => {
  const track = useStore((s) => s.track);
  const search = useStore((s) => s.search);
  const [closed, setClosed] = useState<Record<string, boolean>>({ life: true });
  const cam = isCameraTrack(track);
  const chans = channelsFor(track);
  const groups = cam ? (["body"] as const) : GROUPS;
  const q = search.trim().toLowerCase();
  const matches = (c: Channel) => !q || `${c.label} ${c.id} ${c.help}`.toLowerCase().includes(q);
  const title = track === "camera-9x16" ? "Camera (9:16)" : cam ? "Camera" : track[0].toUpperCase() + track.slice(1);
  return (
    <div className="inspector">
      <div className="panel-title">{title}</div>
      <input
        className="search"
        placeholder="Search channels (wing, blink, lens…)"
        value={search}
        onChange={(e) => set({ search: e.target.value })}
        onKeyDown={(e) => e.key === "Escape" && set({ search: "" })}
      />
      <div className="hint small">Hover a control for what it does. Double-click a slider to reset it. Press ? for shortcuts.</div>
      {cam ? (
        <select
          value=""
          onChange={(e) => {
            const p = CAMERA_PRESETS[e.target.value];
            if (p) setValues(track, p.values, false, `Camera preset on ${track}: ${e.target.value}`);
          }}
          title="Key a named camera setup at the playhead"
        >
          <option value="">Camera preset…</option>
          {Object.entries(CAMERA_PRESETS).map(([k, p]) => (
            <option key={k} value={k} title={p.label}>
              {k}: {p.label}
            </option>
          ))}
        </select>
      ) : null}
      {groups.map((g) => {
        const list = chans.filter((c) => (cam ? true : c.group === g)).filter(matches);
        if (q && !list.length) return null;
        return (
          <div key={g} className="group">
            <button className="group-head" onClick={() => setClosed((c) => ({ ...c, [g]: !c[g] }))}>
              {closed[g] && !q ? "▸" : "▾"} {cam ? "camera" : g}
            </button>
            {closed[g] && !q ? null : list.map((c) => <Row key={c.id} track={track} ch={c} />)}
          </div>
        );
      })}
      {q && groups.every((g) => !chans.filter((c) => (cam ? true : c.group === g)).some(matches)) ? <div className="hint small">No channel matches “{search}”.</div> : null}
    </div>
  );
};
