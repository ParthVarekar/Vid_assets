// Light rigs. One description feeds both the standard three.js lights (eyes,
// beak, feet, props) and the fur shaders (which do their own lighting), so the
// fur always sits in the same light as everything else.

import * as THREE from "three";
import { MAX_LIGHTS, type FurLights } from "./fur/furMaterials";

export type RigLight = {
  /** Where the light sits, relative to its target. Only the direction matters. */
  from: [number, number, number];
  color: string;
  intensity: number;
};

export type LightRig = {
  id: string;
  lights: RigLight[];
  sky: string;
  ground: string;
  ambient: number;
  /** Environment (reflections in eyes, beak, glasses). */
  envIntensity: number;
  exposure: number;
  /** "neutral" (Khronos PBR Neutral) keeps brand colours; "agx" is more filmic. */
  toneMapping: "neutral" | "agx";
  /** Which entry of `lights` casts shadows onto the set (props and birds' bodies). */
  shadowLight?: number;
  /** Equirect HDRI (under public/) for reflections, instead of the softbox studio. */
  hdri?: string;
  /** Point lights for the set only (lamp bulb, laptop glow). Fur ignores them. */
  points?: Array<{ position: [number, number, number]; color: string; intensity: number; distance: number }>;
  /** Set state that follows the time of day. */
  set?: { timeOfDay: "day" | "golden" | "night"; lampOn: boolean; screenGlow: number };
};

// The Desk: birds stand on a sketchbook on a big desk; the window is behind
// them (-z). Lamp head sits above-left of the birds; laptop back-right.
export const LAMP_HEAD: [number, number, number] = [-2.3, 7.4, -2.6];
export const SCREEN_CENTRE: [number, number, number] = [3.5, 1.3, -4.5];

export const DESK_DAY: LightRig = {
  id: "desk-day",
  lights: [
    { from: [-0.6, 1.0, -1.2], color: "#EEF4FF", intensity: 2.6 }, // window sky: high, behind-left (rim + top)
    { from: [0.5, 0.55, 1.0], color: "#FFF0DE", intensity: 2.3 }, // room bounce from the front: the face light
    { from: [1.3, 0.5, -0.5], color: "#FFFFFF", intensity: 0.9 }, // second window pane: kicker right
    { from: [0, -0.35, 1.0], color: "#F2E2CA", intensity: 0.3 }, // desk bounce from below
  ],
  sky: "#DCE6F0",
  ground: "#8C7860",
  ambient: 0.7,
  envIntensity: 0.8,
  exposure: 1.02,
  toneMapping: "neutral",
  shadowLight: 0,
  hdri: "3d/hdri/artist_workshop_1k.hdr",
  set: { timeOfDay: "day", lampOn: false, screenGlow: 1 },
};

export const DESK_GOLDEN: LightRig = {
  id: "desk-golden",
  lights: [
    { from: [0.95, 0.32, -1.0], color: "#FFB066", intensity: 4.4 }, // low sun through the window: hot rim
    { from: [-0.35, 0.45, 1.0], color: "#C8D2F2", intensity: 0.75 }, // cool fill from the room
    { from: [LAMP_HEAD[0], LAMP_HEAD[1], LAMP_HEAD[2]], color: "#FFD49A", intensity: 0.9 }, // desk lamp
    { from: [0, -0.4, 1.0], color: "#F7C696", intensity: 0.35 }, // warm desk bounce
  ],
  sky: "#F1C8A2",
  ground: "#6A4A38",
  ambient: 0.42,
  envIntensity: 0.6,
  exposure: 0.95,
  toneMapping: "neutral",
  shadowLight: 0,
  hdri: "3d/hdri/artist_workshop_1k.hdr",
  points: [{ position: [LAMP_HEAD[0], LAMP_HEAD[1] - 0.5, LAMP_HEAD[2]], color: "#FFD49A", intensity: 18, distance: 22 }],
  set: { timeOfDay: "golden", lampOn: true, screenGlow: 1 },
};

export const DESK_NIGHT: LightRig = {
  id: "desk-night",
  lights: [
    { from: [LAMP_HEAD[0], LAMP_HEAD[1], LAMP_HEAD[2] + 1.2], color: "#FFC683", intensity: 3.3 }, // desk lamp: warm key from above
    { from: [0.5, 0.6, -1.0], color: "#8EA6FF", intensity: 1.2 }, // moonlight through the window: cool rim
    { from: [SCREEN_CENTRE[0], SCREEN_CENTRE[1], SCREEN_CENTRE[2]], color: "#A8C8FF", intensity: 0.75 }, // laptop glow
    { from: [0.2, 0.35, 1.0], color: "#5A6696", intensity: 0.65 }, // dim room fill (keeps bellies readable)
  ],
  sky: "#2A3352",
  ground: "#140F0B",
  ambient: 0.3,
  envIntensity: 0.25,
  exposure: 1.0,
  toneMapping: "neutral",
  shadowLight: 0,
  hdri: "3d/hdri/artist_workshop_1k.hdr",
  points: [
    { position: [LAMP_HEAD[0], LAMP_HEAD[1] - 0.5, LAMP_HEAD[2]], color: "#FFC683", intensity: 40, distance: 26 },
    { position: [SCREEN_CENTRE[0], SCREEN_CENTRE[1], SCREEN_CENTRE[2] + 1.2], color: "#A8C8FF", intensity: 8, distance: 14 },
  ],
  set: { timeOfDay: "night", lampOn: true, screenGlow: 1.3 },
};

export const STUDIO: LightRig = {
  id: "studio",
  lights: [
    { from: [2.6, 3.4, 3.0], color: "#FFEFD8", intensity: 2.5 }, // key: warm, high, front-right
    { from: [-3.4, 0.8, 2.4], color: "#D6E0FF", intensity: 0.55 }, // fill: cool, low, front-left
    { from: [-1.8, 2.4, -3.4], color: "#FFD9A8", intensity: 3.6 }, // rim: warm halo from behind-left
    { from: [2.8, 1.2, -2.8], color: "#FFF4E6", intensity: 1.8 }, // kicker: behind-right
  ],
  sky: "#F6F2EA",
  ground: "#7E6E58",
  ambient: 0.5,
  envIntensity: 0.55,
  exposure: 0.92,
  toneMapping: "neutral",
};

export const RIGS: Record<string, LightRig> = { studio: STUDIO, "desk-day": DESK_DAY, "desk-golden": DESK_GOLDEN, "desk-night": DESK_NIGHT };

/** Fur light uniforms. three.js divides light by pi in its BRDF, so we do too. */
export const furLightsFor = (rig: LightRig): FurLights => {
  const dirs: THREE.Vector3[] = [];
  const colors: THREE.Color[] = [];
  for (let i = 0; i < MAX_LIGHTS; i++) {
    const l = rig.lights[i];
    dirs.push(l ? new THREE.Vector3(...l.from).normalize() : new THREE.Vector3(0, 1, 0));
    colors.push(l ? new THREE.Color(l.color).multiplyScalar(l.intensity / Math.PI) : new THREE.Color(0, 0, 0));
  }
  return {
    dirs,
    colors,
    sky: new THREE.Color(rig.sky).multiplyScalar(rig.ambient / Math.PI),
    ground: new THREE.Color(rig.ground).multiplyScalar(rig.ambient / Math.PI),
  };
};
