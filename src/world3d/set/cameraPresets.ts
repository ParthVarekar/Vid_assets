// Named camera setups for the Desk. Apply one in Puppet Studio (camera track ->
// preset) or from code with ClipBuilder.camera(f, CAMERA_PRESETS.wide).
// Values are camera-track channels (see CAMERA_CHANNELS in rig/schema.ts).
// Birds stand around x in -1.6..1.6 on y = 0, facing +z.

export type CameraPreset = { label: string; values: Record<string, number> };

export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  wide: { label: "Wide: the trio on the sketchbook, desk and window behind", values: { px: 0.3, py: 1.6, pz: 10.5, tx: 0.2, ty: 1.6, tz: -2, fov: 26, roll: 0, blur: 2.2, focus: 10.2 } },
  establishing: { label: "Establishing: the whole desk, slightly high", values: { px: 2.5, py: 6.5, pz: 17, tx: 0, ty: 1.2, tz: -2.5, fov: 30, roll: 0, blur: 1.2, focus: 17.5 } },
  hero: { label: "Hero: low and close, the window glowing behind", values: { px: -0.6, py: 0.45, pz: 6.2, tx: 0, ty: 1.25, tz: 0, fov: 30, roll: 0, blur: 3.2, focus: 6.2 } },
  closeup: { label: "Close-up: one bird's face (move tx to pick the bird)", values: { px: 0.25, py: 0.8, pz: 3.8, tx: 0, ty: 0.66, tz: 0, fov: 24, roll: 0, blur: 3.6, focus: 3.8 } },
  screen: { label: "Screen side: low 3/4 from the right, laptop glowing behind the birds", values: { px: 4.4, py: 0.9, pz: 6.4, tx: 0.6, ty: 1.1, tz: -1.2, fov: 28, roll: 0, blur: 2.8, focus: 7.4 } },
  reverse: { label: "Reverse: from behind the laptop, the birds' backs and the room (when they turn to the screen)", values: { px: 4.2, py: 2.6, pz: -4.2, tx: 0, ty: 0.6, tz: 0.3, fov: 30, roll: 0, blur: 3, focus: 6.4 } },
  overhead: { label: "Overhead: top-down on the sketchbook", values: { px: 0, py: 11, pz: 1.2, tx: 0, ty: 0, tz: 0, fov: 30, roll: 0, blur: 1.5, focus: 11 } },
  vertical: { label: "Vertical (9:16): trio low in frame, the window and city filling the top", values: { px: 0.1, py: 0.9, pz: 9.0, tx: 0, ty: 2.9, tz: -1, fov: 40, roll: 0, blur: 2.0, focus: 9.0 } },
};
