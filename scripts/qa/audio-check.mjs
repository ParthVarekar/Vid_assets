// Independent check of a rendered score, for an author who cannot listen.
//
//   node scripts/qa/audio-check.mjs public/assets/audio/score-master.wav [outPrefix]
//
// Reports integrated loudness (ITU-R BS.1770), an estimated true peak
// (4x oversampled), a loudness figure for every bar, and writes a spectrogram
// with a waveform strip so the structure of the piece can be read by eye.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [file, prefixArg] = process.argv.slice(2);
if (!file) {
  console.error("usage: audio-check.mjs <file.wav> [outPrefix]");
  process.exit(1);
}
const prefix = prefixArg ?? path.join("qa/audio", path.basename(file, ".wav"));

// --- read 24-bit or 16-bit PCM WAV -------------------------------------------
const buf = fs.readFileSync(file);
const channels = buf.readUInt16LE(22);
const SR = buf.readUInt32LE(24);
const bits = buf.readUInt16LE(34);
let off = 12;
while (buf.toString("ascii", off, off + 4) !== "data") off += 8 + buf.readUInt32LE(off + 4);
const bytes = buf.readUInt32LE(off + 4);
off += 8;
const step = bits / 8;
const n = Math.floor(bytes / (step * channels));
const L = new Float32Array(n), R = new Float32Array(n);
for (let i = 0; i < n; i++) {
  for (let ch = 0; ch < Math.min(2, channels); ch++) {
    const p = off + (i * channels + ch) * step;
    const v = bits === 24 ? buf.readIntLE(p, 3) / 8388608 : buf.readInt16LE(p) / 32768;
    if (ch === 0) L[i] = v;
    else R[i] = v;
  }
}
if (channels === 1) R.set(L);

// --- loudness ----------------------------------------------------------------
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
  return stage(
    stage(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]),
    [1, -2, 1],
    [1, -1.99004745483398, 0.99007225036621],
  );
};
const kl = kWeight(L), kr = kWeight(R);
const lk = (p) => -0.691 + 10 * Math.log10(p);
const meanSquare = (a, b) => {
  let s = 0;
  for (let i = a; i < b; i++) s += kl[i] * kl[i] + kr[i] * kr[i];
  return s / Math.max(1, b - a);
};
const block = Math.floor(0.4 * SR), hop = Math.floor(0.1 * SR);
const powers = [];
for (let s = 0; s + block <= n; s += hop) powers.push(meanSquare(s, s + block));
const abs = powers.filter((p) => p > 0 && lk(p) > -70);
const rel = lk(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
const gated = abs.filter((p) => lk(p) > rel);
const integrated = lk(gated.reduce((a, b) => a + b, 0) / gated.length);

// Loudness range, roughly: spread of 3-second windows between the 10th and 95th percentile.
const st = [];
for (let s = 0; s + 3 * SR <= n; s += SR) st.push(lk(meanSquare(s, s + 3 * SR)));
const sorted = st.filter((v) => v > -70 && v > integrated - 20).sort((a, b) => a - b);
const lra = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] - sorted[Math.floor(sorted.length * 0.1)] : 0;

// --- true peak estimate (4x, windowed sinc) ------------------------------------
const truePeak = (x) => {
  const taps = 12;
  let peak = 0;
  for (let i = taps; i < x.length - taps; i++) {
    const a = Math.abs(x[i]);
    if (a > peak) peak = a;
    if (a < 0.5) continue; // only worth interpolating near loud samples
    for (const frac of [0.25, 0.5, 0.75]) {
      let v = 0;
      for (let k = -taps + 1; k <= taps; k++) {
        const t = k - frac;
        const w = 0.5 + 0.5 * Math.cos((Math.PI * t) / taps);
        v += x[i + k] * (t === 0 ? 1 : Math.sin(Math.PI * t) / (Math.PI * t)) * w;
      }
      if (Math.abs(v) > peak) peak = Math.abs(v);
    }
  }
  return peak;
};
const tp = Math.max(truePeak(L), truePeak(R));
let sp = 0;
for (let i = 0; i < n; i++) sp = Math.max(sp, Math.abs(L[i]), Math.abs(R[i]));

// --- per-bar profile (100 BPM: 2.4 s bars) --------------------------------------
const BAR = 2.4;
const bars = [];
for (let b = 0; (b + 1) * BAR * SR <= n + 1; b++) {
  const a = Math.floor(b * BAR * SR), e = Math.min(n, Math.floor((b + 1) * BAR * SR));
  let pk = 0;
  for (let i = a; i < e; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  bars.push({ bar: b + 1, lufs: +lk(meanSquare(a, e)).toFixed(1), peakDb: +(20 * Math.log10(pk || 1e-9)).toFixed(1) });
}

// --- spectrum balance ----------------------------------------------------------
const FFT = 4096;
const fft = (re, im) => {
  const N = re.length;
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < N; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi;
        const vi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
      }
    }
  }
};
const W = 1800, H = 460, WAVE = 120;
const cols = W;
const hopS = Math.max(1, Math.floor((n - FFT) / cols));
const img = Buffer.alloc(W * (H + WAVE) * 3, 14);
const fMin = 30, fMax = 18000;
const bandEnergy = { "sub <60": 0, "bass 60-250": 0, "low-mid 250-1k": 0, "mid 1-4k": 0, "high 4-10k": 0, "air >10k": 0 };
const win = new Float32Array(FFT).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FFT));
for (let c = 0; c < cols; c++) {
  const s = c * hopS;
  const re = new Float64Array(FFT), im = new Float64Array(FFT);
  for (let i = 0; i < FFT; i++) re[i] = ((L[s + i] ?? 0) + (R[s + i] ?? 0)) * 0.5 * win[i];
  fft(re, im);
  const mag = new Float64Array(FFT / 2);
  for (let k = 1; k < FFT / 2; k++) {
    mag[k] = Math.hypot(re[k], im[k]) / (FFT / 4);
    const f = (k * SR) / FFT, p = mag[k] * mag[k];
    if (f < 60) bandEnergy["sub <60"] += p;
    else if (f < 250) bandEnergy["bass 60-250"] += p;
    else if (f < 1000) bandEnergy["low-mid 250-1k"] += p;
    else if (f < 4000) bandEnergy["mid 1-4k"] += p;
    else if (f < 10000) bandEnergy["high 4-10k"] += p;
    else bandEnergy["air >10k"] += p;
  }
  for (let y = 0; y < H; y++) {
    const f = fMin * (fMax / fMin) ** (1 - y / (H - 1));
    const k = Math.min(FFT / 2 - 1, Math.max(1, Math.round((f * FFT) / SR)));
    const dbv = 20 * Math.log10(mag[k] + 1e-9);
    const v = Math.max(0, Math.min(1, (dbv + 90) / 78));
    const p = (y * W + c) * 3;
    img[p] = Math.round(20 + 235 * Math.min(1, v * 1.5));
    img[p + 1] = Math.round(18 + 200 * v * v);
    img[p + 2] = Math.round(26 + 120 * Math.max(0, v - 0.6) * 2.5);
  }
  // Waveform strip: peak within this column.
  let pk = 0;
  for (let i = s; i < s + hopS && i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  const half = Math.round((pk * WAVE) / 2);
  for (let y = WAVE / 2 - half; y <= WAVE / 2 + half; y++) {
    const p = ((H + y) * W + c) * 3;
    img[p] = 232; img[p + 1] = 88; img[p + 2] = 60;
  }
}
// Bar lines.
for (let b = 1; b * BAR * SR < n; b++) {
  const c = Math.round((b * BAR * SR) / hopS);
  if (c >= W) break;
  for (let y = 0; y < H + WAVE; y += 3) {
    const p = (y * W + c) * 3;
    img[p] = 120; img[p + 1] = 120; img[p + 2] = 130;
  }
}
fs.mkdirSync(path.dirname(prefix), { recursive: true });
await sharp(img, { raw: { width: W, height: H + WAVE, channels: 3 } }).png().toFile(`${prefix}-spectrogram.png`);

const totalE = Object.values(bandEnergy).reduce((a, b) => a + b, 0);
const balance = Object.fromEntries(Object.entries(bandEnergy).map(([k, v]) => [k, `${((v / totalE) * 100).toFixed(1)}%`]));
const report = {
  file,
  seconds: +(n / SR).toFixed(3),
  sampleRate: SR,
  bits,
  integratedLufs: +integrated.toFixed(2),
  loudnessRangeLu: +lra.toFixed(1),
  samplePeakDbfs: +(20 * Math.log10(sp)).toFixed(2),
  truePeakDbtpEstimate: +(20 * Math.log10(tp)).toFixed(2),
  spectralBalance: balance,
  bars,
};
fs.writeFileSync(`${prefix}-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, bars: undefined }, null, 1));
console.log("bar: LUFS / peak dB");
console.log(bars.map((b) => `${String(b.bar).padStart(2)}: ${String(b.lufs).padStart(6)} / ${String(b.peakDb).padStart(6)}`).join("\n"));
