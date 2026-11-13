// Deterministic randomness. Remotion renders frames in parallel and out of
// order, so nothing may depend on Math.random().

/** Seeded generator (mulberry32). */
export const seeded = (seed: number) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Stable hash of an integer to 0..1. */
export const hash = (n: number, seed = 0): number => {
  let h = (n | 0) * 374761393 + (seed | 0) * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/** Smooth 1D value noise in -1..1. */
export const noise1 = (x: number, seed = 0): number => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash(i, seed) * 2 - 1;
  const b = hash(i + 1, seed) * 2 - 1;
  return a + (b - a) * u;
};
