// Reframing a 16:9 clip for tall formats (9:16 and friends).
//
// A clip can carry its own "camera-9x16" track, and that always wins. For clips
// that don't, deriveVerticalCamera() builds one from the main camera:
//
//  - Wide shots (the 16:9 frame shows the whole cast): widen the lens, then pull
//    the camera back, until the cast's x-span fits the narrow frame; and pan
//    with the cast (its average x, smoothed over +/-10 frames).
//  - Close-ups (the 16:9 frame already crops the cast on purpose): left alone.
//
// Everything is sampled from the clip, so it is a pure function of the clip.

import { CAMERA_CHANNELS } from "../rig/schema";
import { sampleCamera, sampleKeys, type Clip, type Key, type Track } from "./clip";

/** Half-width of a bird with wings, squash and a little air, in set units. */
const MARGIN = 1.15;
/** Widen the lens up to this before pulling the camera back. */
const MAX_WIDE_FOV = 38;

/** Cast centre and half-width (with margin) at a frame, smoothed over +/-10 frames. */
const castFraming = (clip: Clip, frame: number) => {
  let c = 0;
  let h = 0;
  const offsets = [-10, -5, 0, 5, 10];
  for (const o of offsets) {
    const f = Math.max(0, Math.min(clip.duration - 1, frame + o));
    const xs = clip.cast.map((m) => sampleKeys(clip.tracks[m.id]?.x, f, 0));
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    c += (lo + hi) / 2;
    h += (hi - lo) / 2;
  }
  return { cx: c / offsets.length, half: h / offsets.length + MARGIN };
};

/** A camera track for a frame of the given aspect (width / height, below 1), keyed every frame. */
export const deriveVerticalCamera = (clip: Clip, aspect: number): Track => {
  const keys: Record<string, Key[]> = Object.fromEntries(CAMERA_CHANNELS.map((c) => [c.id, [] as Key[]]));
  const cx0 = castFraming(clip, 0).cx;
  for (let f = 0; f < clip.duration; f++) {
    const c = { ...sampleCamera(clip, f) };
    const { cx, half } = castFraming(clip, f);
    const dir = [c.px - c.tx, c.py - c.ty, c.pz - c.tz];
    const d0 = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    // Does the original 16:9 frame show the whole cast? Then it is a wide shot.
    const wide = half <= d0 * Math.tan((c.fov * Math.PI) / 360) * (16 / 9);
    if (wide) {
      // The lens that would just fit the cast at the current distance.
      const fovExact = (2 * Math.atan(half / (d0 * aspect)) * 180) / Math.PI;
      let scale = 1;
      if (fovExact > c.fov) {
        const fov = Math.min(MAX_WIDE_FOV, fovExact);
        // Still too tight at the widest lens: pull the camera back along its view line.
        if (fov < fovExact) scale = half / (Math.tan((fov * Math.PI) / 360) * aspect) / d0;
        c.fov = fov;
      }
      const pan = cx - cx0;
      c.px = c.tx + dir[0] * scale + pan;
      c.py = c.ty + dir[1] * scale;
      c.pz = c.tz + dir[2] * scale;
      c.tx += pan;
      if (c.focus > 0) c.focus *= scale;
    }
    for (const ch of CAMERA_CHANNELS) keys[ch.id].push({ f, v: +c[ch.id].toFixed(4), i: "linear" });
  }
  return keys;
};

/** The clip as seen by a composition of this aspect: tall formats get their own camera. */
export const framedClip = (clip: Clip, aspect: number): Clip => {
  if (aspect >= 1) return clip;
  const camera = clip.tracks["camera-9x16"] ?? deriveVerticalCamera(clip, aspect);
  return { ...clip, tracks: { ...clip.tracks, camera } };
};
