// Renders the film's original score and sound design.
//
//   node scripts/audio/render-score.mjs
//
// Everything is synthesised here: no samples, no third-party recordings.
// Timing comes from src/timeline.ts, the same file the picture uses, so sound
// and picture are in sync by construction.
//
// Writes to public/assets/audio/:
//   score-master.wav            60 s mix for the master film
//   score-master-music.wav      music stem
//   score-master-sfx.wav        sound-effects stem
//   score-cutdown.wav           15 s mix for the cutdown
// and a loudness report to qa/audio-report.json.
//
// Target: -14 LUFS integrated, sample peak at or below -2.2 dBFS, which keeps
// the estimated true peak under -1 dBTP.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as T from "../../src/timeline.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SR = 48000;
const TARGET_LUFS = -14;
const CEILING = 10 ** (-2.2 / 20);

const sec = (frame) => frame / T.FPS;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const TAU = Math.PI * 2;

// --- deterministic noise ----------------------------------------------------
const makeRng = (seed) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
let noiseSeed = 1000;
const noise = (n) => {
  const r = makeRng(noiseSeed++);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = r() * 2 - 1;
  return out;
};

// --- filters ----------------------------------------------------------------
const biquad = (x, type, fc, q) => {
  const w = (TAU * fc) / SR;
  const cs = Math.cos(w);
  const al = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === "lp") { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2; }
  else if (type === "hp") { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; }
  else { b0 = al; b1 = 0; b2 = -al; } // band-pass
  const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
};

/** State-variable band-pass whose centre frequency can move every sample. */
const sweepBand = (x, fcAt, q) => {
  const y = new Float32Array(x.length);
  let low = 0, band = 0;
  for (let i = 0; i < x.length; i++) {
    const f = 2 * Math.sin((Math.PI * Math.min(fcAt(i), SR / 6)) / SR);
    low += f * band;
    const high = x[i] - low - q * band;
    band += f * high;
    y[i] = band;
  }
  return y;
};

// --- instruments (all return mono Float32Array) -----------------------------

/** Warm pad: two detuned voices of soft-rolled partials, slow in and out. */
const pad = (freq, dur, bright0 = 0.35, bright1 = 0.5) => {
  const rel = 1.5;
  const n = Math.floor((dur + rel) * SR);
  const out = new Float32Array(n);
  const att = Math.floor(0.55 * SR);
  const relN = Math.floor(rel * SR);
  for (const det of [-0.0035, 0.0035]) {
    const f = freq * (1 + det);
    for (let p = 1; p <= 9; p++) {
      if (f * p > 9000) break;
      const inc = (TAU * f * p) / SR;
      let ph = (p * 1.7 + det * 900) % TAU;
      for (let i = 0; i < n; i++) {
        const br = bright0 + (bright1 - bright0) * (i / n);
        out[i] += (Math.sin(ph) / p) * Math.exp(-(p - 1) * (0.8 - br));
        ph += inc;
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const a = i < att ? 0.5 - 0.5 * Math.cos((Math.PI * i) / att) : 1;
    const r = i > n - relN ? 0.5 + 0.5 * Math.cos((Math.PI * (i - (n - relN))) / relN) : 1;
    out[i] *= a * r * 0.5;
  }
  return out;
};

/** Plucked FM tone: bright at the attack, mellow as it decays. */
const pluck = (freq, decay = 0.26) => {
  const n = Math.floor(decay * 5 * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const index = 2.1 * Math.exp(-t / 0.05) + 0.25;
    out[i] =
      Math.sin(TAU * freq * t + index * Math.sin(TAU * freq * 2 * t)) *
      Math.exp(-t / decay) *
      (1 - Math.exp(-t / 0.0015));
  }
  return out;
};

/** Soft felt-like note for the quiet passages. */
const felt = (freq, decay = 0.95) => {
  const n = Math.floor(decay * 4.5 * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] =
      (Math.sin(TAU * freq * t) +
        0.34 * Math.sin(TAU * freq * 2 * t) * Math.exp(-t / 0.22) +
        0.1 * Math.sin(TAU * freq * 3.01 * t) * Math.exp(-t / 0.1)) *
      Math.exp(-t / decay) *
      (1 - Math.exp(-t / 0.007));
  }
  return out;
};

const bass = (freq, dur) => {
  const n = Math.floor((dur + 0.12) * SR);
  const out = new Float32Array(n);
  const hold = Math.floor(dur * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const a = 1 - Math.exp(-t / 0.006);
    const r = i > hold ? Math.exp(-(i - hold) / (0.035 * SR)) : 1;
    const v = Math.sin(TAU * freq * t) + 0.32 * Math.sin(TAU * freq * 2 * t) * Math.exp(-t / 0.16);
    out[i] = Math.tanh(v * 1.3) * a * r * (0.75 + 0.25 * Math.exp(-t / 0.25));
  }
  return out;
};

const kick = (weight = 1) => {
  const n = Math.floor(0.42 * SR);
  const out = new Float32Array(n);
  const click = noise(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * (52 + 90 * Math.exp(-t / 0.026))) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t / (0.13 * weight)) + click[i] * Math.exp(-t / 0.0018) * 0.16;
  }
  return out;
};

const hat = () => {
  const n = Math.floor(0.07 * SR);
  const x = biquad(noise(n), "hp", 7200, 0.8);
  for (let i = 0; i < n; i++) x[i] *= Math.exp(-i / (0.014 * SR));
  return x;
};

const clap = () => {
  const n = Math.floor(0.22 * SR);
  const x = biquad(noise(n), "bp", 1500, 1.1);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const burst =
      Math.exp(-t / 0.004) + Math.exp(-Math.abs(t - 0.011) / 0.004) + Math.exp(-Math.abs(t - 0.022) / 0.005);
    x[i] *= burst * 0.5 + (t > 0.022 ? Math.exp(-(t - 0.022) / 0.055) : 0);
  }
  return x;
};

/** Short tuned blip for a component locking into place. */
const tick = (freq, decay = 0.022) => {
  const n = Math.floor(0.16 * SR);
  const out = new Float32Array(n);
  const c = noise(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = Math.sin(TAU * freq * t) * Math.exp(-t / decay) + c[i] * Math.exp(-t / 0.0012) * 0.12;
  }
  return out;
};

/** Small bell for work arriving at a node. */
const ping = (freq, decay = 0.15) => {
  const n = Math.floor(decay * 6 * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] =
      (Math.sin(TAU * freq * t) + 0.38 * Math.sin(TAU * freq * 2.01 * t) * Math.exp(-t / 0.045)) *
      Math.exp(-t / decay) *
      (1 - Math.exp(-t / 0.002));
  }
  return out;
};

/** Chalk dragged over paper: band-limited noise with a stick-slip flutter. */
const scratch = (dur, seed = 1) => {
  const n = Math.floor(dur * SR);
  let x = biquad(noise(n), "bp", 3100, 0.7);
  x = biquad(x, "hp", 900, 0.7);
  const r = makeRng(seed * 7919);
  const fade = Math.floor(0.03 * SR);
  let target = 0.6, level = 0.6;
  const hop = Math.floor(SR / 28);
  for (let i = 0; i < n; i++) {
    if (i % hop === 0) target = 0.25 + r() * 0.75;
    level += (target - level) * 0.004;
    const edge = Math.min(1, i / fade, (n - i) / fade);
    x[i] *= level * edge;
  }
  return x;
};

/** Air moving past as the camera travels. */
const whoosh = (dur) => {
  const n = Math.floor(dur * SR);
  const x = sweepBand(noise(n), (i) => 260 * 11 ** Math.sin((Math.PI * i) / n), 0.9);
  for (let i = 0; i < n; i++) x[i] *= Math.sin((Math.PI * i) / n) ** 1.6;
  return x;
};

/** Rising air and tone into a hit. */
const riser = (dur, f0 = 146.83) => {
  const n = Math.floor(dur * SR);
  const x = sweepBand(noise(n), (i) => 380 * 16 ** (i / n), 0.7);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    ph += (TAU * f0 * 2 ** t) / SR;
    x[i] = (x[i] * 0.55 + Math.sin(ph) * 0.22 + Math.sin(ph * 2) * 0.08) * t * t * Math.min(1, (n - i) / (0.012 * SR));
  }
  return x;
};

/** Tight low impact with a knock on top. `size` scales depth and length. */
const impact = (size = 1) => {
  const n = Math.floor((0.5 + 0.5 * size) * SR);
  const out = new Float32Array(n);
  const knock = biquad(noise(n), "bp", 210, 1.2);
  const click = noise(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * (44 + 60 * Math.exp(-t / 0.045))) / SR;
    out[i] =
      Math.sin(ph) * Math.exp(-t / (0.2 * size)) +
      knock[i] * Math.exp(-t / 0.03) * 0.9 +
      click[i] * Math.exp(-t / 0.0016) * 0.3;
  }
  return out;
};

/** High, slow-blooming cluster for the moment the mark lands. */
const shimmer = (midis, dur) => {
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  midis.forEach((m, k) => {
    const f = mtof(m);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] +=
        Math.sin(TAU * f * t + 0.6 * Math.sin(TAU * (4.1 + k * 0.7) * t)) *
        (1 - Math.exp(-t / 0.18)) *
        Math.exp(-t / (dur * 0.34)) *
        (0.5 / midis.length);
    }
  });
  return out;
};

// --- mixing -----------------------------------------------------------------
class Group {
  constructor(seconds) {
    this.n = Math.ceil(seconds * SR);
    const mk = () => [new Float32Array(this.n), new Float32Array(this.n)];
    this.dry = mk();
    this.room = new Float32Array(this.n);
    this.hall = new Float32Array(this.n);
    this.echo = new Float32Array(this.n);
    this.duckable = mk();
  }
  /** Place a mono sound. `at` in seconds; pan -1..1; sends 0..1. */
  put(mono, at, gain, { pan = 0, room = 0, hall = 0, echo = 0, duck = false } = {}) {
    const start = Math.round(at * SR);
    const a = ((pan + 1) * Math.PI) / 4;
    const gl = Math.cos(a) * gain, gr = Math.sin(a) * gain;
    const [L, R] = duck ? this.duckable : this.dry;
    for (let i = 0; i < mono.length; i++) {
      const j = start + i;
      if (j < 0) continue;
      if (j >= this.n) break;
      const v = mono[i];
      L[j] += v * gl;
      R[j] += v * gr;
      if (room) this.room[j] += v * gain * room;
      if (hall) this.hall[j] += v * gain * hall;
      if (echo) this.echo[j] += v * gain * echo;
    }
  }
}

/** Freeverb-style stereo reverb. */
const reverb = (input, roomSize, damp) => {
  const n = input.length;
  const scale = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const alls = [556, 441, 341, 225];
  const fb = roomSize * 0.28 + 0.7;
  const pre = biquad(biquad(input, "hp", 240, 0.7), "lp", 9000, 0.7);
  const out = [new Float32Array(n), new Float32Array(n)];
  for (let ch = 0; ch < 2; ch++) {
    const spread = ch * 23;
    const acc = new Float32Array(n);
    for (const len0 of combs) {
      const len = Math.floor((len0 + spread) * scale);
      const buf = new Float32Array(len);
      let idx = 0, store = 0;
      for (let i = 0; i < n; i++) {
        const y = buf[idx];
        store = y * (1 - damp) + store * damp;
        buf[idx] = pre[i] * 0.015 + store * fb;
        idx = idx + 1 === len ? 0 : idx + 1;
        acc[i] += y;
      }
    }
    let sig = acc;
    for (const len0 of alls) {
      const len = Math.floor((len0 + spread) * scale);
      const buf = new Float32Array(len);
      let idx = 0;
      const next = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const b = buf[idx];
        next[i] = -sig[i] + b;
        buf[idx] = sig[i] + b * 0.5;
        idx = idx + 1 === len ? 0 : idx + 1;
      }
      sig = next;
    }
    out[ch] = sig;
  }
  return out;
};

/** Ping-pong echo at a dotted eighth. */
const echo = (input, time, feedback) => {
  const n = input.length;
  const d = Math.floor(time * SR);
  const L = new Float32Array(n), R = new Float32Array(n);
  let lpL = 0, lpR = 0;
  for (let i = 0; i < n; i++) {
    const fromR = i >= d ? R[i - d] : 0;
    const fromL = i >= d ? L[i - d] : 0;
    lpL += (input[i] + fromR * feedback - lpL) * 0.35;
    lpR += (fromL * feedback - lpR) * 0.35;
    L[i] = lpL;
    R[i] = lpR;
  }
  // First repeat should not coincide with the dry note.
  const outL = new Float32Array(n), outR = new Float32Array(n);
  for (let i = d; i < n; i++) { outL[i] = L[i - d]; outR[i] = R[i - d]; }
  return [outL, outR];
};

/** Renders a group to stereo, ducking the marked parts under each kick. */
const renderGroup = (g, kickTimes = []) => {
  const duck = new Float32Array(g.n).fill(1);
  for (const t of kickTimes) {
    const s = Math.round(t * SR);
    for (let i = 0; i < 0.5 * SR && s + i < g.n; i++) {
      if (s + i < 0) continue;
      const v = 1 - 0.42 * Math.exp(-i / (0.13 * SR)) * Math.min(1, i / (0.004 * SR));
      if (v < duck[s + i]) duck[s + i] = v;
    }
  }
  const room = reverb(g.room, 0.42, 0.5);
  const hall = reverb(g.hall, 0.88, 0.32);
  const ech = echo(g.echo, 0.45, 0.36);
  const out = [new Float32Array(g.n), new Float32Array(g.n)];
  for (let ch = 0; ch < 2; ch++) {
    for (let i = 0; i < g.n; i++) {
      out[ch][i] = g.dry[ch][i] + g.duckable[ch][i] * duck[i] + room[ch][i] * 1.0 + hall[ch][i] * 1.1 + ech[ch][i] * 0.55;
    }
  }
  return out;
};

// --- loudness (ITU-R BS.1770-4) ---------------------------------------------
const kWeight = (x) => {
  const stage = (inp, b, a) => {
    const y = new Float64Array(inp.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < inp.length; i++) {
      const v = b[0] * inp[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
      x2 = x1; x1 = inp[i]; y2 = y1; y1 = v; y[i] = v;
    }
    return y;
  };
  const s1 = stage(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]);
  return stage(s1, [1, -2, 1], [1, -1.99004745483398, 0.99007225036621]);
};
const integratedLufs = ([L, R]) => {
  const kl = kWeight(L), kr = kWeight(R);
  const block = Math.floor(0.4 * SR), hop = Math.floor(0.1 * SR);
  const powers = [];
  for (let s = 0; s + block <= kl.length; s += hop) {
    let sum = 0;
    for (let i = s; i < s + block; i++) sum += kl[i] * kl[i] + kr[i] * kr[i];
    powers.push(sum / block);
  }
  const lk = (p) => -0.691 + 10 * Math.log10(p);
  const abs = powers.filter((p) => p > 0 && lk(p) > -70);
  if (!abs.length) return -Infinity;
  const rel = lk(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const gated = abs.filter((p) => lk(p) > rel);
  return lk(gated.reduce((a, b) => a + b, 0) / gated.length);
};

/** Look-ahead peak limiter. Never lets a sample past the ceiling. */
const limit = ([L, R], ceiling) => {
  const n = L.length;
  const look = Math.floor(0.005 * SR);
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = Math.max(Math.abs(L[i]), Math.abs(R[i]));
    need[i] = p > ceiling ? ceiling / p : 1;
  }
  const held = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 1;
    const end = Math.min(n, i + look);
    for (let j = i; j < end; j++) if (need[j] < m) m = need[j];
    held[i] = m;
  }
  const rel = 1 - Math.exp(-1 / (0.09 * SR));
  let s = 1, reduced = 0;
  const gain = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    s = Math.min(held[i], s + (1 - s) * rel);
    gain[i] = s;
    if (s < 0.999) reduced++;
  }
  // Smooth the onset of each reduction across the look-ahead window.
  let acc = 0;
  const outL = new Float32Array(n), outR = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    acc += gain[i];
    if (i >= look) acc -= gain[i - look];
    const gsm = Math.min(gain[i], acc / Math.min(i + 1, look));
    outL[i] = L[i] * gsm;
    outR[i] = R[i] * gsm;
  }
  return { out: [outL, outR], reducedFraction: reduced / n };
};

const peakOf = ([L, R]) => {
  let p = 0;
  for (let i = 0; i < L.length; i++) p = Math.max(p, Math.abs(L[i]), Math.abs(R[i]));
  return p;
};
const scaleBy = ([L, R], k) => [L.map((v) => v * k), R.map((v) => v * k)];
const sum2 = (a, b) => [a[0].map((v, i) => v + b[0][i]), a[1].map((v, i) => v + b[1][i])];
const fadeEnds = ([L, R], inSec, outSec) => {
  const n = L.length, a = Math.floor(inSec * SR), b = Math.floor(outSec * SR);
  for (let i = 0; i < n; i++) {
    const k = Math.min(1, i / Math.max(1, a), (n - 1 - i) / Math.max(1, b));
    const e = k * k * (3 - 2 * k);
    L[i] *= e; R[i] *= e;
  }
  return [L, R];
};
const highpass = ([L, R], fc) => [biquad(L, "hp", fc, 0.707), biquad(R, "hp", fc, 0.707)];

const writeWav = (file, [L, R]) => {
  const n = L.length;
  const data = Buffer.alloc(n * 6);
  for (let i = 0; i < n; i++) {
    for (let ch = 0; ch < 2; ch++) {
      const v = Math.max(-1, Math.min(1, ch ? R[i] : L[i]));
      data.writeIntLE(Math.round(v * 8388607), i * 6 + ch * 3, 3);
    }
  }
  const head = Buffer.alloc(44);
  head.write("RIFF", 0); head.writeUInt32LE(36 + data.length, 4); head.write("WAVE", 8);
  head.write("fmt ", 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22);
  head.writeUInt32LE(SR, 24); head.writeUInt32LE(SR * 6, 28); head.writeUInt16LE(6, 32); head.writeUInt16LE(24, 34);
  head.write("data", 36); head.writeUInt32LE(data.length, 40);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([head, data]));
};

// --- harmony ----------------------------------------------------------------
// D minor moving to its relatives: Dm9, B-flat major 7, F major 9, C 6/9.
const CHORD = {
  Dm: { bass: 38, pad: [53, 57, 60, 64] },
  Bb: { bass: 34, pad: [50, 53, 57, 62] },
  F: { bass: 41, pad: [57, 60, 64, 67] },
  C: { bass: 36, pad: [55, 57, 62, 64] },
};
const BEAT_S = T.BEAT / T.FPS;
const BAR_S = T.BAR / T.FPS;

/** Musical building blocks, all placed in seconds. */
const kit = (music, sfx, kicks) => ({
  padChord(t, bars, name, level = 1, b0 = 0.35, b1 = 0.5) {
    CHORD[name].pad.forEach((m, i) =>
      music.put(pad(mtof(m), bars * BAR_S, b0, b1), t, 0.062 * level, { pan: [-0.5, 0.35, -0.2, 0.55][i], hall: 0.5, duck: true }),
    );
  },
  bassBar(t, name, level = 1, pattern = [[0, 1.4], [2.5, 0.45]]) {
    for (const [beat, len] of pattern) {
      music.put(bass(mtof(CHORD[name].bass), len * BEAT_S), t + beat * BEAT_S, 0.165 * level, { duck: true });
    }
  },
  arpBar(t, name, perBeat, octave, level = 1, fromBeat = 0) {
    const order = [0, 2, 1, 3, 2, 3, 1, 2];
    const notes = CHORD[name].pad;
    const steps = 4 * perBeat;
    for (let s = Math.round(fromBeat * perBeat); s < steps; s++) {
      const m = notes[order[s % order.length]] + 12 * octave;
      const accent = s % perBeat === 0 ? 1 : 0.72;
      music.put(pluck(mtof(m), perBeat > 2 ? 0.16 : 0.24), t + (s / perBeat) * BEAT_S, 0.2 * level * accent, {
        pan: s % 2 ? 0.4 : -0.4,
        room: 0.25,
        hall: 0.3,
        echo: 0.45,
      });
    }
  },
  drumBar(t, { kickBeats = [], hatPerBeat = 0, clapBeats = [], level = 1, fromBeat = 0 }) {
    for (const b of kickBeats) {
      if (b < fromBeat) continue;
      music.put(kick(1), t + b * BEAT_S, 0.3 * level, { room: 0.06 });
      kicks.push(t + b * BEAT_S);
    }
    for (let s = Math.round(fromBeat * hatPerBeat); s < 4 * hatPerBeat; s++) {
      const off = s % hatPerBeat !== 0;
      music.put(hat(), t + (s / hatPerBeat) * BEAT_S, (off ? 0.125 : 0.08) * level, { pan: 0.25, room: 0.2 });
    }
    for (const b of clapBeats) {
      if (b < fromBeat) continue;
      music.put(clap(), t + b * BEAT_S, 0.15 * level, { pan: -0.1, room: 0.5, hall: 0.2 });
    }
  },
  feltNote(t, midi, level = 1, pan = 0) {
    music.put(felt(mtof(midi)), t, 0.13 * level, { pan, hall: 0.75, room: 0.2 });
  },
  tickAt(t, midi, level = 1, pan = 0) {
    sfx.put(tick(mtof(midi)), t, 0.13 * level, { pan, room: 0.4 });
  },
  pingAt(t, midi, level = 1, pan = 0) {
    sfx.put(ping(mtof(midi)), t, 0.11 * level, { pan, room: 0.3, hall: 0.35, echo: 0.2 });
  },
  scratchSpan(t0, t1, level = 1, seed = 1) {
    if (t1 - t0 < 0.05) return;
    sfx.put(scratch(t1 - t0, seed), t0, 0.07 * level, { pan: -0.15, room: 0.35 });
  },
  whooshAt(tCentre, dur = 0.95, level = 1) {
    const x = whoosh(dur);
    // The picture moves right to left, so the air does too.
    sfx.put(x, tCentre - dur * 0.55, 0.1 * level, { pan: 0.45, room: 0.3 });
    sfx.put(x, tCentre - dur * 0.45, 0.1 * level, { pan: -0.45, room: 0.3 });
  },
  riserInto(tHit, dur, level = 1) {
    sfx.put(riser(dur), tHit - dur, 0.16 * level, { hall: 0.35 });
  },
  impactAt(t, size = 1, level = 1) {
    sfx.put(impact(size), t, 0.42 * level, { room: 0.18, hall: 0.12 * size });
    kicks.push(t);
  },
});

// --- arrangements -----------------------------------------------------------
const arrangeMaster = () => {
  const total = sec(T.TOTAL_FRAMES);
  const music = new Group(total + 0.2), sfx = new Group(total + 0.2);
  const kicks = [];
  const K = kit(music, sfx, kicks);
  const bar = (n, beat = 1, f = 0) => sec(T.at(n, beat, f));
  const S = T.SCENES;

  // Bars 1-3. Paper: a held fifth, three soft notes as the words land, chalk.
  music.put(pad(mtof(50), 6.4, 0.1, 0.25), 0.1, 0.028, { pan: -0.3, hall: 0.6 });
  music.put(pad(mtof(57), 6.4, 0.1, 0.25), 0.1, 0.024, { pan: 0.3, hall: 0.6 });
  const H = T.HOOK;
  K.tickAt(sec(H.touch), 86, 0.5);
  [62, 65, 69].forEach((m, i) => K.feltNote(sec(H.line1 + i * H.lineStagger), m, 0.7, [-0.2, 0.1, 0.25][i]));
  K.scratchSpan(sec(H.underlineFrom), sec(H.underlineTo), 1, 2);
  K.scratchSpan(sec(H.runFrom), sec(H.runTo), 0.9, 3);
  K.feltNote(sec(H.note), 74, 0.5, 0.3);

  // Bars 4-5. The sketch: chalk strokes, a rising figure, a swell, then a held breath.
  const B = T.BUILD, b0 = S.build.from;
  K.whooshAt(sec(b0));
  K.padChord(bar(4), 2, "Dm", 0.5, 0.2, 0.42);
  K.scratchSpan(sec(b0 + B.reachWindow), sec(b0 + B.reachWindow + 34), 1, 4);
  K.scratchSpan(sec(b0 + B.reachWindow + 40), sec(b0 + B.reachWindow + 80), 1, 5);
  K.scratchSpan(sec(b0 + B.reachWindow + 86), sec(b0 + B.sketchDone), 1, 6);
  [[4, 1, 62], [4, 3, 65], [5, 1, 69], [5, 3, 72]].forEach(([n, bt, m], i) => K.feltNote(bar(n, bt), m, 0.85, i % 2 ? 0.25 : -0.25));
  K.riserInto(sec(b0 + B.hush), 1.9, 0.6);

  // Bar 6. The snap, then Build: the pulse arrives.
  const snap = sec(b0 + B.snap);
  K.impactAt(snap, 1, 1);
  K.tickAt(snap, 86, 1.1);
  const build = ["Dm", "Bb", "F", "C", "Dm"];
  build.forEach((name, i) => {
    const t = bar(6 + i);
    K.padChord(t, 1, name, 1, 0.38, 0.55);
    K.bassBar(t, name, 1);
    K.drumBar(t, { kickBeats: i === 0 ? [2] : [0, 2], hatPerBeat: 2, level: 0.9, fromBeat: i === 0 ? 1 : 0 });
    K.arpBar(t, name, 2, 1, 0.9, i === 0 ? 2 : 0);
  });
  [[B.nav, 74], [B.headline, 77], [B.subcopy, 81], [B.button, 84], [B.image, 86]].forEach(([f, m], i) =>
    K.tickAt(sec(b0 + f), m, 0.9, -0.3 + i * 0.12),
  );
  K.tickAt(sec(b0 + B.click), 93, 0.8, -0.2);
  K.pingAt(sec(b0 + B.click), 89, 1.2, -0.2);
  for (const f of [B.phone, B.dashboard]) {
    K.whooshAt(sec(b0 + f + 6), 0.45, 0.45);
    K.tickAt(sec(b0 + f + 12), 81, 0.7, 0.35);
  }

  // Bars 11-15. Automate: drier and sequenced. Work arriving at nodes plays the figure.
  const A = T.AUTOMATE, a0 = S.automate.from;
  K.whooshAt(sec(a0));
  const auto = ["Bb", "C", "Dm", "Bb", "C"];
  auto.forEach((name, i) => {
    const t = bar(11 + i);
    K.padChord(t, 1, name, 0.72, 0.3, 0.44);
    K.bassBar(t, name, 0.95, [[0, 0.9], [1.5, 0.4], [2, 0.9], [3.5, 0.4]]);
    K.drumBar(t, { kickBeats: [0, 1, 2, 3], hatPerBeat: 4, clapBeats: i > 0 ? [1, 3] : [], level: 0.78 });
  });
  A.nodes.forEach((f, i) => K.tickAt(sec(a0 + f), [74, 77, 81, 84][i], 1, -0.45 + i * 0.3));
  A.branches.forEach((f, i) => K.tickAt(sec(a0 + f + 6), 88 + i * 2, 0.6, i ? 0.3 : -0.3));
  const half = T.BEAT / 2;
  for (let f = a0 + A.packetsFrom, n = 0; f < S.automate.to - 6; f += half, n++) {
    const pair = n % 2 === 0 ? [74, 81] : [77, 84];
    K.pingAt(sec(f), pair[0], 1, -0.5);
    K.pingAt(sec(f), pair[1], 0.8, 0.5);
  }
  K.whooshAt(sec(a0 + A.agentOpen + 4), 0.4, 0.4);
  A.agentLines.forEach((f, i) => {
    K.tickAt(sec(a0 + f), 86, 0.5, -0.1);
    K.tickAt(sec(a0 + f + 13), 93, 0.75, -0.1);
    void i;
  });
  A.tasks.forEach((f, i) => K.tickAt(sec(a0 + f), [81, 84, 86, 89][i], 0.95, -0.45 + i * 0.3));

  // Bars 16-19. Scale: layers stack, the figure doubles, rise into the turn.
  const C2 = T.SCALE, s0 = S.scale.from;
  K.whooshAt(sec(s0));
  const scale = ["Dm", "F", "Bb", "C"];
  scale.forEach((name, i) => {
    const t = bar(16 + i);
    K.padChord(t, 1, name, 0.95 + i * 0.05, 0.4 + i * 0.05, 0.56 + i * 0.05);
    K.bassBar(t, name, 1, [[0, 0.9], [1.5, 0.4], [2, 0.9], [3.5, 0.4]]);
    K.drumBar(t, { kickBeats: [0, 1, 2, 3], hatPerBeat: 4, clapBeats: [1, 3], level: 0.86 + i * 0.03 });
    K.arpBar(t, name, 4, 1, 0.72 + i * 0.06);
    if (i >= 2) K.arpBar(t, name, 4, 2, 0.4 + (i - 2) * 0.12);
  });
  C2.steps.slice(1).forEach((f, i) => {
    const t = sec(s0 + f);
    K.impactAt(t, 0.6, 0.55);
    const count = [4, 8, 14][i];
    for (let n = 0; n < count; n++) {
      const dt = 0.42 * (n / count) ** 0.7;
      K.tickAt(t + dt, 86 + ((n * 5) % 12), 0.34, (n % 5) / 2.5 - 0.8);
    }
  });
  K.riserInto(bar(20) - 0.05, 2.2, 0.75);

  // Bars 20-21. Proof: drums out. Pad and a short melody.
  const p0 = S.proof.from;
  K.whooshAt(sec(p0), 1.1, 0.75);
  K.impactAt(bar(20), 0.5, 0.2);
  K.padChord(bar(20), 1, "F", 0.44, 0.42, 0.55);
  K.padChord(bar(21), 1, "C", 0.4, 0.42, 0.5);
  music.put(bass(mtof(41), 2.0), bar(20), 0.09);
  music.put(bass(mtof(36), 2.0), bar(21), 0.09);
  [[20, 1, 69], [20, 2.5, 72], [20, 4, 76], [21, 1, 74], [21, 3, 72], [21, 4, 67]].forEach(([n, bt, m], i) =>
    K.feltNote(bar(n) + (bt - 1) * BEAT_S, m, 0.6, i % 2 ? 0.2 : -0.2),
  );

  // Bar 22. The line comes home: thin harmony, chalk, a held breath.
  const R = T.REVEAL, r0 = S.reveal.from;
  K.whooshAt(sec(r0));
  K.padChord(bar(22), 0.86, "Bb", 0.55, 0.25, 0.4);
  K.scratchSpan(sec(r0 + 2), sec(r0 + R.reachTip - 2), 0.8, 8);
  K.scratchSpan(sec(r0 + R.reachTip), sec(r0 + R.cradleTo), 1.25, 9);
  K.riserInto(sec(r0 + R.land) - 0.16, 1.5, 0.75);

  // Bar 23. The mark lands: the fullest chord of the film.
  const land = sec(r0 + R.land);
  K.impactAt(land, 1.5, 1.05);
  sfx.put(shimmer([81, 84, 88, 91, 96], 5.5), land, 0.2, { hall: 0.9, pan: 0 });
  K.padChord(land, 1, "F", 1.25, 0.5, 0.62);
  K.padChord(bar(24), 1, "C", 0.72, 0.48, 0.5);
  K.padChord(bar(25), 0.9, "F", 0.5, 0.45, 0.35);
  music.put(bass(mtof(29), 2.1), land, 0.18);
  music.put(bass(mtof(41), 2.1), land, 0.2);
  music.put(bass(mtof(36), 2.1), bar(24), 0.14);
  music.put(bass(mtof(41), 1.9), bar(25), 0.1);
  K.arpBar(land, "F", 2, 1, 0.75);
  K.arpBar(bar(24), "C", 2, 1, 0.38);
  [[R.wordmark, 77, 0.6], [R.tagline, 81, 0.7]].forEach(([f, m, lv]) => K.feltNote(sec(r0 + f), m, lv));
  K.tickAt(sec(r0 + R.cta), 84, 0.6);
  K.scratchSpan(sec(r0 + R.underline), sec(r0 + R.underline + 16), 1, 11);
  K.pingAt(sec(r0 + R.url), 89, 1.6);
  K.feltNote(sec(r0 + R.foot), 84, 0.5);
  K.feltNote(bar(25), 77, 0.8);

  return { music, sfx, kicks, total };
};

const arrangeCutdown = () => {
  const total = sec(T.CUT_TOTAL_FRAMES);
  const music = new Group(total + 0.2), sfx = new Group(total + 0.2);
  const kicks = [];
  const K = kit(music, sfx, kicks);
  const bar = (n, beat = 1, f = 0) => sec(T.at(n, beat, f));
  const S = T.CUT_SCENES;

  // Bar 1. The statement.
  const H = T.CUT_HOOK;
  music.put(pad(mtof(50), 2.0, 0.12, 0.3), 0, 0.05, { pan: -0.3, hall: 0.6 });
  music.put(pad(mtof(57), 2.0, 0.12, 0.3), 0, 0.04, { pan: 0.3, hall: 0.6 });
  [62, 65, 69].forEach((m, i) => K.feltNote(sec(H.line1 + i * H.lineStagger), m, 0.7, [-0.2, 0.1, 0.25][i]));
  K.scratchSpan(sec(H.underlineFrom), sec(H.underlineTo), 1, 2);
  K.scratchSpan(sec(H.runFrom), sec(S.hook.to), 0.9, 3);
  K.riserInto(sec(S.build.from + T.CUT_BUILD.snap) - 0.1, 1.3, 0.7);

  // Bar 2. Sketch, snap, build.
  const B = T.CUT_BUILD, b0 = S.build.from;
  K.whooshAt(sec(b0), 0.8);
  K.scratchSpan(sec(b0 - 6), sec(b0 + B.sketchDone), 1.1, 4);
  const snap = sec(b0 + B.snap);
  K.impactAt(snap, 1, 1);
  K.padChord(snap, 0.75, "Dm", 1, 0.4, 0.55);
  K.bassBar(bar(2), "Dm", 1, [[1, 0.9], [2.5, 0.45]]);
  K.drumBar(bar(2), { kickBeats: [2, 3], hatPerBeat: 2, level: 0.9, fromBeat: 1 });
  K.arpBar(bar(2), "Dm", 2, 1, 0.9, 1.5);
  [[B.nav, 74], [B.headline, 77], [B.subcopy, 81], [B.button, 84], [B.image, 86]].forEach(([f, m], i) =>
    K.tickAt(sec(b0 + f), m, 0.9, -0.3 + i * 0.12),
  );
  K.pingAt(sec(b0 + B.click), 89, 1.2);

  // Bar 3. Automate.
  const A = T.CUT_AUTOMATE, a0 = S.automate.from;
  K.whooshAt(sec(a0), 0.8);
  K.padChord(bar(3), 1, "Bb", 0.8, 0.34, 0.48);
  K.bassBar(bar(3), "Bb", 0.95, [[0, 0.9], [1.5, 0.4], [2, 0.9], [3.5, 0.4]]);
  K.drumBar(bar(3), { kickBeats: [0, 1, 2, 3], hatPerBeat: 4, clapBeats: [1, 3], level: 0.8 });
  A.nodes.forEach((f, i) => K.tickAt(sec(a0 + f), [74, 77, 81, 84][i], 1, -0.45 + i * 0.3));
  const half = T.BEAT / 2;
  for (let f = a0 + A.packetsFrom, n = 0; f < S.automate.to - 4; f += half, n++) {
    const pair = n % 2 === 0 ? [74, 81] : [77, 84];
    K.pingAt(sec(f), pair[0], 1, -0.5);
    K.pingAt(sec(f), pair[1], 0.8, 0.5);
  }

  // Bar 4. Scale.
  const C2 = T.CUT_SCALE, s0 = S.scale.from;
  K.whooshAt(sec(s0), 0.8);
  K.padChord(bar(4), 1, "C", 1, 0.45, 0.62);
  K.bassBar(bar(4), "C", 1, [[0, 0.9], [1.5, 0.4], [2, 0.9], [3.5, 0.4]]);
  K.drumBar(bar(4), { kickBeats: [0, 1, 2, 3], hatPerBeat: 4, clapBeats: [1, 3], level: 0.9 });
  K.arpBar(bar(4), "C", 4, 1, 0.8);
  K.arpBar(bar(4), "C", 4, 2, 0.45);
  C2.steps.slice(1).forEach((f, i) => {
    const t = sec(s0 + f);
    const count = [4, 7, 11][i];
    for (let n = 0; n < count; n++) K.tickAt(t + 0.3 * (n / count) ** 0.7, 86 + ((n * 5) % 12), 0.34, (n % 5) / 2.5 - 0.8);
  });

  // Bars 5 onward. The line comes home; the mark lands; the invitation.
  const R = T.CUT_REVEAL, r0 = S.reveal.from;
  const land = sec(r0 + R.land);
  K.whooshAt(sec(r0), 0.95, 1.1);
  K.padChord(bar(5), 0.42, "Bb", 0.55, 0.25, 0.4);
  K.scratchSpan(sec(r0 + R.reachTip), sec(r0 + R.cradleTo), 1.25, 9);
  K.riserInto(land - 0.12, 1.0, 0.7);
  K.impactAt(land, 1.5, 1.05);
  sfx.put(shimmer([81, 84, 88, 91, 96], 4.2), land, 0.2, { hall: 0.9 });
  K.padChord(land, 1.5, "F", 1.25, 0.5, 0.5);
  music.put(bass(mtof(29), 2.4), land, 0.18);
  music.put(bass(mtof(41), 2.4), land, 0.2);
  K.arpBar(land, "F", 2, 1, 0.7);
  K.feltNote(sec(r0 + R.tagline), 81, 0.7);
  K.tickAt(sec(r0 + R.cta), 84, 0.6);
  K.scratchSpan(sec(r0 + R.underline), sec(r0 + R.underline + 16), 1, 11);
  K.pingAt(sec(r0 + R.url), 89, 1.6);

  return { music, sfx, kicks, total };
};

// --- master and write -------------------------------------------------------
const db = (v) => (20 * Math.log10(v)).toFixed(2);

const finish = (name, arrangement, withStems) => {
  const { music, sfx, kicks, total } = arrangement;
  const n = Math.round(total * SR);
  const trim = (st) => [st[0].subarray(0, n), st[1].subarray(0, n)];
  let m = trim(highpass(renderGroup(music, kicks), 38));
  let s = trim(highpass(renderGroup(sfx, []), 38));
  // A gentle tilt toward the top: small speakers reproduce little below 250 Hz,
  // so the mix must not depend on its low end to be heard.
  const tilt = (st) => sum2(st, scaleBy(highpass(st, 2600), 0.9));
  m = tilt(m);
  s = tilt(s);
  let mix = sum2(m, s);

  // Bring the mix to target loudness, then catch peaks, and correct once more.
  let gain = 10 ** ((TARGET_LUFS - integratedLufs(mix)) / 20);
  let result = limit(scaleBy(mix, gain), CEILING);
  for (let pass = 0; pass < 3; pass++) {
    const err = TARGET_LUFS - integratedLufs(result.out);
    if (Math.abs(err) < 0.1) break;
    gain *= 10 ** (err / 20);
    result = limit(scaleBy(mix, gain), CEILING);
  }
  const out = fadeEnds(result.out, 0.01, name === "master" ? 0.5 : 0.35);
  const dir = path.join(root, "public/assets/audio");
  writeWav(path.join(dir, `score-${name}.wav`), out);
  if (withStems) {
    writeWav(path.join(dir, `score-${name}-music.wav`), fadeEnds(scaleBy(m, gain), 0.01, 0.5));
    writeWav(path.join(dir, `score-${name}-sfx.wav`), fadeEnds(scaleBy(s, gain), 0.01, 0.5));
  }
  const report = {
    file: `public/assets/audio/score-${name}.wav`,
    seconds: +total.toFixed(3),
    integratedLufs: +integratedLufs(out).toFixed(2),
    samplePeakDbfs: +db(peakOf(out)),
    preLimiterPeakDbfs: +db(peakOf(scaleBy(mix, gain))),
    limiterActiveFraction: +result.reducedFraction.toFixed(4),
    appliedGainDb: +db(gain),
  };
  console.log(report);
  return report;
};

const started = Date.now();
const reports = [finish("master", arrangeMaster(), true), finish("cutdown", arrangeCutdown(), false)];
fs.mkdirSync(path.join(root, "qa"), { recursive: true });
fs.writeFileSync(path.join(root, "qa/audio-report.json"), JSON.stringify(reports, null, 2));
console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
