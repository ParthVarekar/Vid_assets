// Motion vocabulary for writing bird animation as code (by hand or by an LLM).
// Produces clips in the content/episodes format; open the result in Puppet
// Studio to refine it by hand.
//
//   import { ClipBuilder, EASE } from "./authoring.mjs";
//   const c = new ClipBuilder({ name: "my-scene", duration: 180, cast: ["quill"] });
//   c.hop("quill", 20, { height: 0.6 });
//   c.pose("quill", 60, { lookX: 0.6, tilt: 12 }, EASE.inOut);
//   c.write();                       // -> content/episodes/my-scene.anim.json
//
// Channel ids and ranges: src/world3d/rig/schema.ts. Units: 1 u = Quill's body
// height; degrees for turns; 30 fps.

import fs from "node:fs";
import path from "node:path";

/** cubic-bezier easings for the segment that starts at a key. */
export const EASE = {
  inOut: [0.33, 0, 0.67, 1],
  out: [0.1, 0.6, 0.3, 1], // decelerate: launches, arrivals
  in: [0.6, 0, 0.9, 0.4], // accelerate: falls, wind-ups
  snap: [0.05, 0.9, 0.2, 1], // fast out, long settle: takes, hits
  overshoot: [0.3, 0, 0.3, 1.35],
  anticipate: [0.4, -0.35, 0.6, 1],
  linear: "linear",
  step: "step",
};

const HOME_X = { ink: -1.5, quill: 0, chalk: 1.5 };
const BODY_H = { quill: 1.0, ink: 1.16, chalk: 0.84 };

export class ClipBuilder {
  constructor({ name, duration, fps = 30, cast, rig = "studio", notes }) {
    this.clip = {
      version: 1,
      name,
      fps,
      duration,
      rig,
      ...(notes ? { notes } : {}),
      cast: cast.map((id, i) => ({ id, seed: i + 1 })),
      tracks: {},
    };
  }

  /** Set one key. ease: an EASE value (array = bezier, "linear", "step"). Later calls win at the same frame. */
  key(track, ch, f, v, ease) {
    const t = (this.clip.tracks[track] ??= {});
    const list = (t[ch] ??= []).filter((k) => k.f !== Math.round(f));
    const k = { f: Math.round(f), v: +(+v).toFixed(4) };
    if (Array.isArray(ease)) k.e = ease;
    else if (ease === "linear" || ease === "step") k.i = ease;
    list.push(k);
    list.sort((a, b) => a.f - b.f);
    t[ch] = list;
    return this;
  }

  /** Remove keys of a channel in [fa, fb]. */
  clear(track, ch, fa, fb) {
    const t = this.clip.tracks[track];
    if (t?.[ch]) t[ch] = t[ch].filter((k) => k.f < fa || k.f > fb);
    return this;
  }

  /** Several keys on one channel: [[f, v, ease?], ...]. */
  keys(track, ch, list) {
    for (const [f, v, e] of list) this.key(track, ch, f, v, e);
    return this;
  }

  /** Key many channels at one frame. */
  pose(track, f, values, ease) {
    for (const [ch, v] of Object.entries(values)) this.key(track, ch, f, v, ease);
    return this;
  }

  /** Hold: key the given channels at f with their values at an earlier pose (call after pose()). */
  hold(track, f, values) {
    return this.pose(track, f, values, EASE.inOut);
  }

  /** Put each cast member at its home spot (keys x at frame 0). */
  home() {
    for (const m of this.clip.cast) this.key(m.id, "x", 0, HOME_X[m.id] ?? 0);
    return this;
  }

  /**
   * A hop: anticipation squash, launch stretch, airtime, landing squash, settle.
   * f = the takeoff frame. Keys start 8 frames before and end ~12 after landing.
   */
  hop(track, f, { height = 0.5, air = Math.round(10 + height * 12), wings = 0.7, squash = 0.28 } = {}) {
    const land = f + air;
    // A hop owns its stretch/lift/wing keys: clear anything already in its window.
    for (const ch of ["stretch", "y", ...(wings > 0 ? ["wingL", "wingR"] : [])]) this.clear(track, ch, f - 8, land + 12);
    this.keys(track, "stretch", [
      [f - 8, 0, EASE.inOut],
      [f - 2, -squash, EASE.snap],
      [f + 2, squash * 0.75, EASE.inOut],
      [f + air * 0.5, 0.03, EASE.in],
      [land - 1, squash * 0.3, EASE.snap],
      [land + 2, -squash * 1.05, EASE.out],
      [land + 7, squash * 0.18, EASE.inOut],
      [land + 12, 0, EASE.inOut],
    ]);
    this.keys(track, "y", [
      [f, 0, EASE.out],
      [f + air * 0.5, height, EASE.in],
      [land, 0, EASE.inOut],
    ]);
    if (wings > 0) {
      for (const w of ["wingL", "wingR"])
        this.keys(track, w, [
          [f - 3, 0, EASE.snap],
          [f + 3, wings, EASE.inOut],
          [land, wings * 0.25, EASE.snap],
          [land + 9, 0, EASE.inOut],
        ]);
    }
    return this;
  }

  /**
   * Walk from x0 to x1 (z optional) between f0 and f1 with alternating steps and
   * planted feet. `yaw` is the facing during the walk in degrees (key it
   * yourself before and after); feet stay planted when facing the direction of
   * travel (|yaw| near 90 for sideways walks).
   */
  walk(track, { f0, f1, x0, x1, z0 = 0, z1 = 0, yaw = 0, stride = 0.22, bob = 0.025, waddle = 5 }) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const dist = Math.hypot(dx, dz);
    const n = Math.max(2, Math.round(dist / stride));
    const d = (f1 - f0) / n;
    const H = BODY_H[track] ?? 1;
    const r = (yaw * Math.PI) / 180;
    // Distance travelled along the body's own forward axis, per step.
    const fwd = (dx * Math.sin(r) + dz * Math.cos(r)) / n;
    const amp = Math.max(-0.95, Math.min(0.95, fwd / (0.22 * H) / 2));
    this.keys(track, "x", [[f0, x0, "linear"], [f1, x1, EASE.inOut]]);
    if (dz) this.keys(track, "z", [[f0, z0, "linear"], [f1, z1, EASE.inOut]]);
    for (let i = 0; i < n; i++) {
      const a = f0 + i * d;
      const b = a + d;
      const swing = i % 2 === 0 ? "L" : "R";
      const stance = swing === "L" ? "R" : "L";
      // Swing foot travels back -> front with a lift; stance foot slides front -> back.
      this.key(track, `step${swing}`, a, -amp, EASE.inOut).key(track, `step${swing}`, b, amp, EASE.inOut);
      this.key(track, `step${stance}`, a, amp, "linear").key(track, `step${stance}`, b, -amp, "linear");
      this.keys(track, `lift${swing}`, [[a, 0, EASE.out], [a + d * 0.45, 1, EASE.in], [b, 0, EASE.inOut]]);
      // Body dips on contact and rises mid-step; waddle side to side.
      this.keys(track, "stretch", [[a, -bob * 2, EASE.out], [a + d * 0.5, bob, EASE.in]]);
      this.key(track, "tilt", a + d * 0.5, swing === "L" ? waddle : -waddle, EASE.inOut);
    }
    // Feet together and body settled at the end.
    this.keys(track, "stepL", [[f1 + 4, 0, EASE.inOut]]);
    this.keys(track, "stepR", [[f1 + 4, 0, EASE.inOut]]);
    this.keys(track, "stretch", [[f1, -bob * 2, EASE.out], [f1 + 6, 0, EASE.inOut]]);
    this.keys(track, "tilt", [[f1 + 4, 0, EASE.inOut]]);
    return this;
  }

  /** Quick oscillation (head shake, shiver): n half-cycles of +/-amp around the current value v0. */
  shake(track, ch, f, { amp = 10, n = 4, every = 3, v0 = 0 } = {}) {
    for (let i = 0; i < n; i++) this.key(track, ch, f + i * every, v0 + (i % 2 ? -amp : amp) * (1 - i / (n + 1)), EASE.inOut);
    return this.key(track, ch, f + n * every, v0, EASE.inOut);
  }

  /** Talk: beak flapping on for the duration of a line. */
  say(track, f0, f1, amount = 1) {
    return this.keys(track, "talk", [[f0 - 1, 0, "step"], [f0, amount, "step"], [f1, 0, "step"]]);
  }

  /** Camera keys: { px, py, pz, tx, ty, tz, fov, roll, shake }. */
  camera(f, values, ease = EASE.inOut) {
    return this.pose("camera", f, values, ease);
  }

  toJSON() {
    return this.clip;
  }

  /** Write to content/episodes/<name>.anim.json (one key per line). */
  write(root = process.cwd()) {
    const file = path.join(root, "content", "episodes", `${this.clip.name}.anim.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, format(this.clip));
    return file;
  }
}

const format = (clip) => {
  const lines = ["{"];
  for (const k of ["version", "name", "fps", "duration", "rig", "notes"]) if (clip[k] !== undefined) lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(clip[k])},`);
  lines.push(`  "cast": ${JSON.stringify(clip.cast)},`);
  lines.push('  "tracks": {');
  const tracks = Object.entries(clip.tracks);
  tracks.forEach(([tn, t], ti) => {
    lines.push(`    ${JSON.stringify(tn)}: {`);
    const chans = Object.entries(t);
    chans.forEach(([c, keys], ci) => {
      lines.push(`      ${JSON.stringify(c)}: [`);
      keys.forEach((k, i) => lines.push(`        ${JSON.stringify(k)}${i < keys.length - 1 ? "," : ""}`));
      lines.push(`      ]${ci < chans.length - 1 ? "," : ""}`);
    });
    lines.push(`    }${ti < tracks.length - 1 ? "," : ""}`);
  });
  lines.push("  }", "}", "");
  return lines.join("\n");
};
