// Sliders for every channel of the selected bird (or the camera), built from
// the rig schema. The diamond keys/unkeys the channel at the playhead.

import React, { useState } from "react";
import { GROUPS, type Channel } from "../../src/world3d/rig/schema";
import { channelsFor, currentValue, endEdit, keyAt, setValue, toggleKey, useStore } from "./store";

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
  const [closed, setClosed] = useState<Record<string, boolean>>({ life: true });
  const chans = channelsFor(track);
  const groups = track === "camera" ? (["body"] as const) : GROUPS;
  return (
    <div className="inspector">
      <div className="panel-title">{track === "camera" ? "Camera" : track[0].toUpperCase() + track.slice(1)}</div>
      <div className="hint small">Hover a control for what it does. Double-click a slider to reset it.</div>
      {groups.map((g) => (
        <div key={g} className="group">
          <button className="group-head" onClick={() => setClosed((c) => ({ ...c, [g]: !c[g] }))}>
            {closed[g] ? "▸" : "▾"} {track === "camera" ? "camera" : g}
          </button>
          {closed[g]
            ? null
            : chans
                .filter((c) => (track === "camera" ? true : c.group === g))
                .map((c) => <Row key={c.id} track={track} ch={c} />)}
        </div>
      ))}
    </div>
  );
};
