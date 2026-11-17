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

export const RIGS: Record<string, LightRig> = { studio: STUDIO };

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
