// Audio in Puppet Studio: loudness envelope (for the waveform lane) and
// "Talk from audio", which keys a bird's Talk channel wherever the audio is loud.
//
// The clip's `audio` is a path under public/ (e.g. "assets/audio/line1.wav").
// Nothing is played in the editor; the file is only decoded and measured.

import { useEffect, useState } from "react";
import { isCameraTrack, type Key } from "../../src/world3d/anim/clip";
import { commit, getState, set } from "./store";

const cache = new Map<string, Promise<Float32Array>>();

/** Loudness (RMS, mono mix) of each animation frame of the file. */
export const loadEnvelope = (path: string, fps: number): Promise<Float32Array> => {
  const key = `${path}@${fps}`;
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      const res = await fetch(`/${path.replace(/^\/+/, "")}`);
      if (!res.ok) throw new Error(`${path}: ${res.status}`);
      // OfflineAudioContext decodes without a user gesture and without playing.
      const buf = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(await res.arrayBuffer());
      const per = buf.sampleRate / fps;
      const n = Math.ceil(buf.length / per);
      const channels = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
      const env = new Float32Array(n);
      for (let f = 0; f < n; f++) {
        const a = Math.floor(f * per);
        const b = Math.min(buf.length, Math.floor((f + 1) * per));
        let sum = 0;
        for (let i = a; i < b; i++) {
          let v = 0;
          for (const c of channels) v += c[i];
          v /= channels.length;
          sum += v * v;
        }
        env[f] = Math.sqrt(sum / Math.max(1, b - a));
      }
      return env;
    })();
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
};

export const useEnvelope = (path: string | null | undefined, fps: number): Float32Array | null => {
  const [env, setEnv] = useState<Float32Array | null>(null);
  useEffect(() => {
    setEnv(null);
    if (!path) return;
    let live = true;
    loadEnvelope(path, fps)
      .then((e) => live && setEnv(e))
      .catch((err) => live && set({ status: `Audio: ${(err as Error).message}` }));
    return () => {
      live = false;
    };
  }, [path, fps]);
  return env;
};

/** Set (or clear) the clip's audio path. Not an undo step: it is typed key by key. */
export const setAudioPath = (path: string) => set((s) => ({ clip: { ...s.clip, audio: path.trim() || null }, dirty: true }));

export type Phrase = { f0: number; f1: number; level: number };

/** Loud stretches of an envelope: smoothed, thresholded, short gaps merged, blips dropped. */
export const phrasesFromEnvelope = (env: Float32Array): Phrase[] => {
  const n = env.length;
  const sm = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let c = 0;
    for (let k = -1; k <= 1; k++) {
      const j = i + k;
      if (j >= 0 && j < n) {
        sum += env[j];
        c++;
      }
    }
    sm[i] = sum / c;
  }
  let max = 0;
  for (const v of sm) max = Math.max(max, v);
  if (max <= 0) return [];
  const threshold = max * 0.18;
  const raw: Array<{ f0: number; f1: number }> = [];
  let start = -1;
  for (let i = 0; i <= n; i++) {
    const on = i < n && sm[i] > threshold;
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      raw.push({ f0: start, f1: i });
      start = -1;
    }
  }
  const merged: Array<{ f0: number; f1: number }> = [];
  for (const s of raw) {
    const last = merged[merged.length - 1];
    if (last && s.f0 - last.f1 < 5) last.f1 = s.f1;
    else merged.push({ ...s });
  }
  return merged
    .filter((s) => s.f1 - s.f0 >= 3)
    .map((s) => {
      let sum = 0;
      for (let i = s.f0; i < s.f1; i++) sum += sm[i];
      return { ...s, level: sum / (s.f1 - s.f0) / max };
    });
};

/** Key the selected bird's Talk channel from the audio: on (step) for each phrase, off between. */
export const talkFromAudio = async () => {
  const s = getState();
  if (isCameraTrack(s.track)) return set({ status: "Select a bird first (keys 1 / 2 / 3)" });
  if (!s.clip.audio) return set({ status: "Type an audio path first (under public/, e.g. assets/audio/line1.wav)" });
  try {
    const env = await loadEnvelope(s.clip.audio, s.clip.fps);
    const last = s.clip.duration - 1;
    const phrases = phrasesFromEnvelope(env).filter((p) => p.f0 < last);
    if (!phrases.length) return set({ status: "No speech-level audio found in that file" });
    const keys: Key[] = [];
    if (phrases[0].f0 > 0) keys.push({ f: 0, v: 0, i: "step" });
    for (const p of phrases) {
      keys.push({ f: p.f0, v: +Math.min(1.3, 0.6 + 0.7 * p.level).toFixed(2), i: "step" });
      keys.push({ f: Math.min(p.f1, last), v: 0, i: "step" });
    }
    // Frames must strictly increase (a phrase ending at the last frame could repeat it).
    const clean = keys.filter((k, i) => i === 0 || k.f > keys[i - 1].f);
    const track = { ...(s.clip.tracks[s.track] ?? {}), talk: clean };
    commit({ ...s.clip, tracks: { ...s.clip.tracks, [s.track]: track } }, `Keyed Talk on ${s.track}: ${phrases.length} phrase${phrases.length > 1 ? "s" : ""} from ${s.clip.audio}`);
  } catch (e) {
    set({ status: `Talk from audio failed: ${(e as Error).message}` });
  }
};
