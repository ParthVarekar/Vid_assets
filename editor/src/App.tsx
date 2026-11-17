// Puppet Studio layout, top bar, playback and keyboard shortcuts.

import React, { useEffect, useRef, useState } from "react";
import { emptyClip, type CastMember } from "../../src/world3d/anim/clip";
import { RIGS } from "../../src/world3d/lighting";
import type { BirdId } from "../../src/world3d/characters/config";
import { listEpisodes, loadEpisode, saveEpisode } from "./api";
import { setAudioPath, talkFromAudio } from "./audio";
import { Inspector } from "./Inspector";
import { PosePanel } from "./PosePanel";
import {
  copyKeys,
  deleteSelected,
  getState,
  keyPending,
  loadClip,
  pasteKeys,
  redo,
  set,
  setClipMeta,
  setFrame,
  setValues,
  undo,
  useStore,
  type HandleMode,
} from "./store";
import { Timeline } from "./Timeline";
import { viewCamera } from "./viewCamera";
import { Viewport } from "./Viewport";

const BIRD_IDS: BirdId[] = ["quill", "ink", "chalk"];
const HOME_X: Record<BirdId, number> = { ink: -1.35, quill: 0, chalk: 1.3 };

const save = async () => {
  const s = getState();
  const name = s.fileName;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) return set({ status: "Name must be lowercase letters, digits and dashes" });
  try {
    const r = await saveEpisode(name, { ...s.clip, name });
    set({ dirty: false, status: `Saved ${r.saved}` });
  } catch (e) {
    set({ status: `Save failed: ${(e as Error).message}` });
  }
};

const keyCameraFromView = () => {
  const c = viewCamera.camera;
  if (!c) return;
  const t = viewCamera.target;
  const dir = c.getWorldDirection(c.position.clone());
  const tgt = t ?? c.position.clone().addScaledVector(dir, 5);
  set({ track: "camera" });
  setValues("camera", { px: c.position.x, py: c.position.y, pz: c.position.z, tx: tgt.x, ty: tgt.y, tz: tgt.z, fov: c.fov }, false, "Keyed camera from the free view");
};

const TopBar: React.FC = () => {
  const s = useStore((x) => x);
  const [files, setFiles] = useState<string[]>([]);
  const refresh = () => listEpisodes().then(setFiles).catch(() => setFiles([]));
  useEffect(() => {
    refresh();
  }, []);
  const toggleCast = (id: BirdId) => {
    const has = s.clip.cast.some((m) => m.id === id);
    const cast: CastMember[] = has ? s.clip.cast.filter((m) => m.id !== id) : [...s.clip.cast, { id, seed: BIRD_IDS.indexOf(id) + 1 }];
    let tracks = s.clip.tracks;
    if (!has && !tracks[id]?.x) tracks = { ...tracks, [id]: { ...(tracks[id] ?? {}), x: [{ f: 0, v: HOME_X[id] }] } };
    setClipMeta({ cast, tracks });
    if (!has) set({ track: id });
  };
  const handles: Array<[HandleMode, string, string]> = [
    ["move", "Move", "W"],
    ["turn", "Turn", "E"],
    ["eyes", "Eyes", "R"],
    ["none", "Off", "Q"],
  ];
  return (
    <div className="topbar">
      <b className="brand">Puppet Studio</b>
      <select
        value=""
        onFocus={refresh}
        onChange={async (e) => {
          const n = e.target.value;
          if (!n) return;
          if (getState().dirty && !confirm("Discard unsaved changes?")) return;
          try {
            loadClip(await loadEpisode(n), n);
          } catch (err) {
            set({ status: `Open failed: ${(err as Error).message}` });
          }
        }}
      >
        <option value="">Open…</option>
        {files.map((f) => (
          <option key={f}>{f}</option>
        ))}
      </select>
      <button
        onClick={() => {
          if (getState().dirty && !confirm("Discard unsaved changes?")) return;
          loadClip(emptyClip("untitled"), "untitled");
        }}
      >
        New
      </button>
      <input className="name" value={s.fileName} onChange={(e) => set({ fileName: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} title="File name in content/episodes" />
      <button className={s.dirty ? "primary" : ""} onClick={save} title="Ctrl+S">
        Save{s.dirty ? " •" : ""}
      </button>
      <select value={s.clip.set ?? "studio"} onChange={(e) => setClipMeta({ set: e.target.value as "studio" | "desk", rig: e.target.value === "desk" && !(s.clip.rig ?? "").startsWith("desk") ? "desk-day" : e.target.value === "studio" ? "studio" : s.clip.rig })} title="The world the birds are in">
        <option value="studio">Set: studio sweep</option>
        <option value="desk">Set: the Desk</option>
      </select>
      <select value={s.clip.rig ?? "studio"} onChange={(e) => setClipMeta({ rig: e.target.value })} title="Lighting / time of day">
        {Object.keys(RIGS).map((r) => (
          <option key={r} value={r}>
            Light: {r}
          </option>
        ))}
      </select>
      <label title="Length in frames (30 per second)">
        frames <input className="num" type="number" value={s.clip.duration} min={10} max={9000} onChange={(e) => setClipMeta({ duration: Math.max(10, +e.target.value || 10) })} />
      </label>
      <span className="sep" />
      {BIRD_IDS.map((id) => (
        <label key={id} className={`cast ${id}`}>
          <input type="checkbox" checked={s.clip.cast.some((m) => m.id === id)} onChange={() => toggleCast(id)} /> {id}
        </label>
      ))}
      <span className="sep" />
      <div className="seg" title="Drag handles in the viewport">
        {handles.map(([m, l, k]) => (
          <button key={m} className={s.handle === m ? "on" : ""} onClick={() => set({ handle: m })} title={`${l} (${k})`}>
            {l}
          </button>
        ))}
      </div>
      <label title="Every change sets a key at the playhead">
        <input type="checkbox" checked={s.autoKey} onChange={(e) => set({ autoKey: e.target.checked, pending: {} })} /> auto-key
      </label>
      <div className="seg">
        <button className={s.cameraMode === "shot" ? "on" : ""} onClick={() => set({ cameraMode: "shot" })} title="View through the keyed shot camera (C)">
          Shot cam
        </button>
        <button className={s.cameraMode === "free" ? "on" : ""} onClick={() => set({ cameraMode: "free" })} title="Orbit freely (C)">
          Free cam
        </button>
      </div>
      {s.cameraMode === "free" ? <button onClick={keyCameraFromView}>Key camera from view</button> : null}
      <div className="seg">
        <button className={s.quality === "preview" ? "on" : ""} onClick={() => set({ quality: "preview" })}>
          Preview fur
        </button>
        <button className={s.quality === "final" ? "on" : ""} onClick={() => set({ quality: "final" })}>
          Final fur
        </button>
      </div>
    </div>
  );
};

const SHORTCUTS: Array<[string, string]> = [
  ["Space", "Play / pause"],
  ["← / →", "Step one frame (Shift: ten)"],
  ["Home / End", "Jump to the start / end"],
  ["K", "Key the values you just changed"],
  ["Shift+K", "Key the whole pose of the selected bird"],
  ["Delete", "Delete the selected keys"],
  ["Ctrl+Z / Ctrl+Y", "Undo / redo"],
  ["Ctrl+C / Ctrl+V", "Copy keys / paste them at the playhead"],
  ["Ctrl+S", "Save the clip"],
  ["W / E / R / Q", "Move / turn / eye-target handle / no handle"],
  ["C", "Shot camera ↔ free camera"],
  ["1 / 2 / 3 / 0", "Select Quill / Ink / Chalk / the camera"],
  ["Tab", "Dope sheet ↔ curves"],
  ["Ctrl + wheel", "Zoom the timeline"],
  ["Drag empty space", "Box-select keys in the dope sheet"],
  ["Shift + click / drag", "Add to the selection (keys); mirrored pose (poses)"],
  ["Right-click a key", "Interpolation and ease presets, delete"],
  ["Double-click a slider", "Reset it to its default"],
  ["?", "Show / hide this list"],
  ["Esc", "Close this list"],
];

const ShortcutOverlay: React.FC = () => (
  <div className="help-backdrop" onClick={() => set({ help: false })}>
    <div className="help" onClick={(e) => e.stopPropagation()}>
      <div className="panel-title">Keyboard shortcuts</div>
      <table>
        <tbody>
          {SHORTCUTS.map(([k, d]) => (
            <tr key={k}>
              <td>
                <kbd>{k}</kbd>
              </td>
              <td>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const Transport: React.FC = () => {
  const s = useStore((x) => ({ frame: x.frame, playing: x.playing, duration: x.clip.duration, fps: x.clip.fps, panel: x.panel, audio: x.clip.audio ?? "" }));
  return (
    <div className="transport">
      <button onClick={() => setFrame(0)} title="Home">⏮</button>
      <button onClick={() => setFrame(s.frame - 1)} title="← (Shift: 10)">◀</button>
      <button className="play" onClick={() => set((x) => ({ playing: !x.playing }))} title="Space">
        {s.playing ? "❚❚" : "▶"}
      </button>
      <button onClick={() => setFrame(s.frame + 1)} title="→ (Shift: 10)">▶</button>
      <button onClick={() => setFrame(s.duration - 1)} title="End">⏭</button>
      <span className="frame">
        {String(s.frame).padStart(4, "0")} / {s.duration - 1} · {(s.frame / s.fps).toFixed(2)}s
      </span>
      <span className="sep" />
      <div className="seg">
        <button className={s.panel === "dope" ? "on" : ""} onClick={() => set({ panel: "dope" })}>
          Dope sheet
        </button>
        <button className={s.panel === "graph" ? "on" : ""} onClick={() => set({ panel: "graph" })}>
          Curves
        </button>
      </div>
      <button onClick={() => keyPending(false)} title="K: key changed values · Shift+K: key whole pose">
        Set key
      </button>
      <span className="sep" />
      <label title="An audio file under public/ (e.g. assets/audio/line1.wav). Its loudness shows under the ruler.">
        audio{" "}
        <input className="name" style={{ width: 200 }} placeholder="assets/audio/…" value={s.audio} onChange={(e) => setAudioPath(e.target.value)} />
      </label>
      <button onClick={talkFromAudio} title="Key Talk on the selected bird wherever the audio is loud (replaces its Talk keys)">
        Talk from audio
      </button>
      <button onClick={() => set((x) => ({ help: !x.help }))} title="Keyboard shortcuts (?)">
        ?
      </button>
    </div>
  );
};

const usePlayback = () => {
  const playing = useStore((s) => s.playing);
  const raf = useRef(0);
  useEffect(() => {
    if (!playing) return;
    const t0 = performance.now();
    const f0 = getState().frame;
    const tick = (t: number) => {
      const s = getState();
      const f = Math.floor(f0 + ((t - t0) / 1000) * s.clip.fps) % s.clip.duration;
      if (f !== s.frame) set({ frame: f, pending: {} });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);
};

const useShortcuts = () => {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA") && (t as HTMLInputElement).type !== "range" && (t as HTMLInputElement).type !== "checkbox") return;
      const s = getState();
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (ctrl && k === "s") return e.preventDefault(), void save();
      if (ctrl && k === "z" && !e.shiftKey) return e.preventDefault(), undo();
      if ((ctrl && k === "y") || (ctrl && k === "z" && e.shiftKey)) return e.preventDefault(), redo();
      if (ctrl && k === "c") return copyKeys();
      if (ctrl && k === "v") return pasteKeys();
      if (ctrl) return;
      if (k === " ") return e.preventDefault(), set((x) => ({ playing: !x.playing }));
      if (k === "arrowleft") return e.preventDefault(), setFrame(s.frame - (e.shiftKey ? 10 : 1));
      if (k === "arrowright") return e.preventDefault(), setFrame(s.frame + (e.shiftKey ? 10 : 1));
      if (k === "home") return setFrame(0);
      if (k === "end") return setFrame(s.clip.duration - 1);
      if (k === "k") return keyPending(e.shiftKey);
      if (k === "delete" || k === "backspace") return deleteSelected();
      if (k === "w") return set({ handle: "move" });
      if (k === "e") return set({ handle: "turn" });
      if (k === "r") return set({ handle: "eyes" });
      if (k === "q") return set({ handle: "none" });
      if (k === "c") return set((x) => ({ cameraMode: x.cameraMode === "shot" ? "free" : "shot" }));
      if (k === "tab") return e.preventDefault(), set((x) => ({ panel: x.panel === "dope" ? "graph" : "dope" }));
      if (k === "?") return set((x) => ({ help: !x.help }));
      if (k === "escape") return set({ help: false });
      const ids: Record<string, string> = { "1": "quill", "2": "ink", "3": "chalk", "0": "camera" };
      if (ids[k]) return set({ track: ids[k] });
    };
    window.addEventListener("keydown", down);
    const leave = (e: BeforeUnloadEvent) => {
      if (getState().dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", leave);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("beforeunload", leave);
    };
  }, []);
};

export const App: React.FC = () => {
  usePlayback();
  useShortcuts();
  const status = useStore((s) => s.status);
  const help = useStore((s) => s.help);
  useEffect(() => {
    // Open the clip named in the URL (?clip=rig-demo), else the first one.
    const want = new URLSearchParams(location.search).get("clip");
    listEpisodes()
      .then((names) => {
        const n = want && names.includes(want) ? want : names[0];
        return n ? loadEpisode(n).then((c) => loadClip(c, n)) : undefined;
      })
      .catch(() => set({ status: "Could not reach the save API (run the editor with npm run editor)" }));
  }, []);
  return (
    <div className="app">
      <TopBar />
      <div className="main">
        <div className="side">
          <Inspector />
          <PosePanel />
        </div>
        <Viewport />
      </div>
      <Transport />
      <Timeline />
      <div className="status">{status}</div>
      {help ? <ShortcutOverlay /> : null}
    </div>
  );
};
