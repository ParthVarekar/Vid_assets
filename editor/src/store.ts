// Puppet Studio state. One store, immutable clip updates, undo/redo by
// keeping previous clip objects.

import { useRef, useSyncExternalStore } from "react";
import { deleteKeys, emptyClip, isCameraTrack, setKey, shiftKeys, type Clip, type Interp, type Key } from "../../src/world3d/anim/clip";
import { evaluateBird } from "../../src/world3d/anim/evaluate";
import { sampleCamera, sampleKeys } from "../../src/world3d/anim/clip";
import { CAMERA_BY_ID, CAMERA_CHANNELS, CHANNEL_BY_ID, CHANNELS, clampChannel, mirrorValues, type RigValues } from "../../src/world3d/rig/schema";

export type KeyRef = { track: string; channel: string; f: number };
export type HandleMode = "move" | "turn" | "eyes" | "none";

export type State = {
  clip: Clip;
  fileName: string;
  frame: number;
  playing: boolean;
  /** "quill" | "ink" | "chalk" | "camera" */
  track: string;
  selected: KeyRef[];
  autoKey: boolean;
  /** Values changed but not keyed yet (shown in the viewport until the frame changes). */
  pending: Record<string, Record<string, number>>;
  cameraMode: "shot" | "free";
  quality: "preview" | "final";
  handle: HandleMode;
  panel: "dope" | "graph";
  dirty: boolean;
  past: Clip[];
  future: Clip[];
  status: string;
  /** Rows shown in the dope sheet: only animated channels, or all. */
  showAll: boolean;
  pxPerFrame: number;
  /** Filter for the inspector and dope sheet channel lists. */
  search: string;
  /** Curves: scale every channel to the full height, so degrees and 0..1 values share the graph. */
  normalise: boolean;
  /** Keyboard shortcut overlay. */
  help: boolean;
};

let state: State = {
  clip: emptyClip("untitled", [{ id: "quill", seed: 1 }]),
  fileName: "untitled",
  frame: 0,
  playing: false,
  track: "quill",
  selected: [],
  autoKey: true,
  pending: {},
  cameraMode: "shot",
  quality: "preview",
  handle: "move",
  panel: "dope",
  dirty: false,
  past: [],
  future: [],
  status: "",
  showAll: false,
  pxPerFrame: 8,
  search: "",
  normalise: false,
  help: false,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const getState = () => state;
export const set = (patch: Partial<State> | ((s: State) => Partial<State>)) => {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  emit();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
/**
 * Subscribe to a slice of the state. The selected value is cached per state
 * object, so selectors may build new objects (React would otherwise see a
 * "change" on every check and loop).
 */
export const useStore = <T,>(sel: (s: State) => T): T => {
  const cache = useRef<{ s: State | null; v: T }>({ s: null, v: undefined as T });
  const selRef = useRef(sel);
  selRef.current = sel;
  return useSyncExternalStore(subscribe, () => {
    if (cache.current.s !== state) cache.current = { s: state, v: selRef.current(state) };
    return cache.current.v;
  });
};

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

const MAX_HISTORY = 200;
/** Replace the clip, recording the old one for undo. */
export const commit = (clip: Clip, status = "") =>
  set((s) => ({ clip, past: [...s.past.slice(-MAX_HISTORY + 1), s.clip], future: [], dirty: true, status }));

/** During a drag: change the clip without a history entry (call beginEdit first). */
let editOpen = false;
export const beginEdit = () => {
  if (editOpen) return;
  editOpen = true;
  set((s) => ({ past: [...s.past.slice(-MAX_HISTORY + 1), s.clip], future: [] }));
};
export const endEdit = () => {
  editOpen = false;
};
const replace = (clip: Clip) => set({ clip, dirty: true });

export const undo = () =>
  set((s) => (s.past.length ? { clip: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.clip, ...s.future], dirty: true, pending: {}, status: "Undo" } : {}));
export const redo = () =>
  set((s) => (s.future.length ? { clip: s.future[0], future: s.future.slice(1), past: [...s.past, s.clip], dirty: true, pending: {}, status: "Redo" } : {}));

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

export const channelsFor = (track: string) => (isCameraTrack(track) ? CAMERA_CHANNELS : CHANNELS);
export const channelDef = (track: string, id: string) => (isCameraTrack(track) ? CAMERA_BY_ID[id] : CHANNEL_BY_ID[id]);

/** Clip with pending (unkeyed) edits inserted as keys at the current frame: what the viewport shows. */
export const displayClip = (s: State): Clip => {
  let c = s.clip;
  for (const [track, chans] of Object.entries(s.pending)) {
    for (const [ch, v] of Object.entries(chans)) c = setKey(c, track, ch, { f: s.frame, v });
  }
  return c;
};

/** Keyed value of a channel at the current frame (before behaviours), including pending edits. */
export const currentValue = (s: State, track: string, ch: string): number => {
  const p = s.pending[track]?.[ch];
  if (p !== undefined) return p;
  const def = channelDef(track, ch);
  return sampleKeys(s.clip.tracks[track]?.[ch], s.frame, def?.default ?? 0);
};

export const keyAt = (s: State, track: string, ch: string, f = s.frame): Key | undefined => s.clip.tracks[track]?.[ch]?.find((k) => k.f === f);

/**
 * Set a channel value from a slider or handle. With auto-key the value is keyed
 * at the playhead; without, it is pending until K or a frame change.
 * Pass `drag` while dragging so a whole drag is one undo step.
 */
export const setValue = (track: string, ch: string, v: number, drag = false) => {
  const s = getState();
  const val = isCameraTrack(track) ? v : clampChannel(ch, v);
  if (s.autoKey) {
    const prev = keyAt(s, track, ch);
    const clip = setKey(s.clip, track, ch, { ...prev, f: s.frame, v: val });
    if (drag) {
      beginEdit();
      replace(clip);
    } else commit(clip);
  } else {
    set((st) => ({ pending: { ...st.pending, [track]: { ...(st.pending[track] ?? {}), [ch]: val } } }));
  }
};

export const setValues = (track: string, values: Record<string, number>, drag = false, status = "") => {
  const s = getState();
  if (s.autoKey) {
    let clip = s.clip;
    for (const [ch, v] of Object.entries(values)) {
      const prev = keyAt(s, track, ch);
      clip = setKey(clip, track, ch, { ...prev, f: s.frame, v: isCameraTrack(track) ? v : clampChannel(ch, v) });
    }
    if (drag) {
      beginEdit();
      replace(clip);
    } else commit(clip, status);
  } else {
    set((st) => ({ pending: { ...st.pending, [track]: { ...(st.pending[track] ?? {}), ...values } }, status }));
  }
};

/** K: key every pending value. Shift+K: key the whole pose of the selected track. */
export const keyPending = (whole = false) => {
  const s = getState();
  let clip = s.clip;
  let n = 0;
  const tracks = whole ? { [s.track]: Object.fromEntries(channelsFor(s.track).filter((c) => c.group !== "life").map((c) => [c.id, currentValue(s, s.track, c.id)])) } : s.pending;
  for (const [track, chans] of Object.entries(tracks)) {
    for (const [ch, v] of Object.entries(chans)) {
      clip = setKey(clip, track, ch, { ...keyAt(s, track, ch), f: s.frame, v });
      n++;
    }
  }
  if (n) {
    commit(clip, `Keyed ${n} channel${n > 1 ? "s" : ""} at frame ${s.frame}`);
    set({ pending: {} });
  } else set({ status: "Nothing to key (change a value first, or Shift+K to key the whole pose)" });
};

export const toggleKey = (track: string, ch: string) => {
  const s = getState();
  if (keyAt(s, track, ch)) commit(deleteKeys(s.clip, [{ track, channel: ch, f: s.frame }]));
  else commit(setKey(s.clip, track, ch, { f: s.frame, v: currentValue(s, track, ch) }));
  set((st) => {
    const p = { ...(st.pending[track] ?? {}) };
    delete p[ch];
    return { pending: { ...st.pending, [track]: p } };
  });
};

export const setFrame = (f: number) => {
  const s = getState();
  const frame = Math.max(0, Math.min(s.clip.duration - 1, Math.round(f)));
  if (frame !== s.frame) set({ frame, pending: {} });
};

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

export const isSelected = (s: State, k: KeyRef) => s.selected.some((x) => x.track === k.track && x.channel === k.channel && x.f === k.f);
export const select = (k: KeyRef | null, add = false) =>
  set((s) => {
    if (!k) return { selected: [] };
    if (add) return { selected: isSelected(s, k) ? s.selected.filter((x) => !(x.track === k.track && x.channel === k.channel && x.f === k.f)) : [...s.selected, k] };
    return { selected: [k] };
  });
export const deleteSelected = () => {
  const s = getState();
  if (!s.selected.length) return;
  commit(deleteKeys(s.clip, s.selected), `Deleted ${s.selected.length} key(s)`);
  set({ selected: [] });
};
export const moveSelected = (df: number, drag = false) => {
  const s = getState();
  if (!s.selected.length || !df) return;
  const clip = shiftKeys(s.clip, s.selected, df);
  const selected = s.selected.map((k) => ({ ...k, f: Math.max(0, k.f + df) }));
  if (drag) {
    beginEdit();
    set({ clip, selected, dirty: true });
  } else {
    commit(clip);
    set({ selected });
  }
};
export const setInterp = (i: Interp, e?: [number, number, number, number]) => {
  const s = getState();
  let clip = s.clip;
  for (const k of s.selected) {
    const key = keyAt({ ...s, clip }, k.track, k.channel, k.f);
    if (key) clip = setKey(clip, k.track, k.channel, { ...key, i, e: i === "bezier" ? (e ?? key.e) : undefined });
  }
  commit(clip, `Interpolation: ${i}`);
};

// Clipboard: copy selected keys, paste at the playhead (relative timing kept).
let clipboard: Array<{ track: string; channel: string; key: Key }> = [];
export const copyKeys = () => {
  const s = getState();
  clipboard = s.selected.map((r) => ({ track: r.track, channel: r.channel, key: keyAt(s, r.track, r.channel, r.f)! })).filter((c) => c.key);
  set({ status: `Copied ${clipboard.length} key(s)` });
};
export const pasteKeys = () => {
  const s = getState();
  if (!clipboard.length) return;
  const f0 = Math.min(...clipboard.map((c) => c.key.f));
  let clip = s.clip;
  for (const c of clipboard) {
    // Paste onto the selected bird when copying between birds.
    const track = isCameraTrack(c.track) || isCameraTrack(s.track) ? c.track : s.track;
    clip = setKey(clip, track, c.channel, { ...c.key, f: s.frame + c.key.f - f0 });
  }
  commit(clip, `Pasted ${clipboard.length} key(s)`);
};

/** Apply a pose (channel values) as keys or pending values; optionally mirrored. */
export const applyPose = (values: RigValues, mirrored = false, name = "pose") => {
  const s = getState();
  if (isCameraTrack(s.track)) return set({ status: "Select a bird first" });
  setValues(s.track, mirrored ? mirrorValues(values) : values, false, `Applied ${name}${mirrored ? " (mirrored)" : ""}`);
};

/** Fully evaluated pose (with behaviours), for handles and readouts. */
export const evaluatedPose = (s: State, track: string) => {
  const c = displayClip(s);
  const m = c.cast.find((x) => x.id === track);
  return evaluateBird(c, track, s.frame, m?.seed ?? 1).values;
};
export const evaluatedCamera = (s: State) => sampleCamera(displayClip(s), s.frame);

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export const loadClip = (clip: Clip, fileName: string) =>
  set({ clip, fileName, frame: 0, past: [], future: [], pending: {}, selected: [], dirty: false, track: clip.cast[0]?.id ?? "camera", status: `Opened ${fileName}` });

export const setClipMeta = (patch: Partial<Clip>) => commit({ ...getState().clip, ...patch });
