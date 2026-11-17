// Eyeball and cornea materials.
//
// The eyeball is one sphere whose colour is computed per pixel: sclera, a
// fibrous iris (radial fibres, a wavy collarette, crypts, contraction furrows,
// a dark limbal ring), and a soft-edged pupil that dilates through a uniform.
// The iris sits slightly recessed behind the cornea, so its pattern shifts with
// the view (parallax): the eye reads as a lens, not a printed ball.
//
// It is still MeshPhysicalMaterial (lights, shadows and the HDRI all apply);
// only the albedo and a little emissive are replaced. The lids and the socket
// darken the eyeball where they meet it (contact shadow), from planes updated
// every render in onBeforeRender, so blinks and squints shade correctly.
//
// The cornea is a separate, slightly bulged shell with black albedo drawn
// additively: it contributes only reflections and highlights, which move over
// the iris dome as the eye turns.

import * as THREE from "three";

export type EyeLook = {
  iris: string;
  irisDark: string;
  /** Iris radius as sin(angle) on the eyeball: the old cap's angular size. */
  irisAngle: number;
  pupil: number;
  seed: number;
};

const DECLS = /* glsl */ `
  uniform vec3 uIrisA;
  uniform vec3 uIrisD;
  uniform float uIrisAngle;
  uniform float uPupil;
  uniform float uSeed;
  uniform vec3 uCamL;
  uniform vec3 uCentreW;
  uniform vec3 uLidUN;
  uniform vec3 uLidLN;
  uniform vec3 uSockN;
  uniform float uEyeRW;
  varying vec3 vEyeP;
  varying vec3 vEyeW;

  float eyeHash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float eyeNoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(eyeHash(i), eyeHash(i + vec3(1, 0, 0)), f.x), mix(eyeHash(i + vec3(0, 1, 0)), eyeHash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(eyeHash(i + vec3(0, 0, 1)), eyeHash(i + vec3(1, 0, 1)), f.x), mix(eyeHash(i + vec3(0, 1, 1)), eyeHash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
`;

const IRIS = /* glsl */ `
  vec3 eP = normalize(vEyeP);
  vec3 eV = normalize(uCamL - vEyeP);
  float sinA = sin(uIrisAngle);
  float front = smoothstep(-0.05, 0.05, eP.z);
  float rS = length(eP.xy) / sinA;
  // Recessed iris: shift the lookup along the view ray (deeper at the centre).
  vec2 q = eP.xy - eV.xy / max(eV.z, 0.3) * 0.09 * sinA * (1.0 - min(rS * rS, 1.0));
  float r = length(q) / sinA;
  float phi = atan(q.y, q.x);
  vec2 cs = vec2(cos(phi), sin(phi));
  float P = uPupil;
  float t = clamp((r - P) / max(1e-3, 1.0 - P), 0.0, 1.0);

  // Radial fibres at three scales.
  float f1 = eyeNoise(vec3(cs * 34.0, t * 2.4 + uSeed));
  float f2 = eyeNoise(vec3(cs * 10.0, t * 1.4 + uSeed * 1.7));
  float f3 = eyeNoise(vec3(cs * 85.0, t * 5.0 + uSeed * 0.3));
  // Fade detail that would be smaller than a pixel (wide shots), so it never shimmers.
  float px = fwidth(t);
  float lodFine = smoothstep(0.012, 0.035, px);
  float lodMid = smoothstep(0.03, 0.09, px);
  f3 = mix(f3, 0.5, lodFine);
  f1 = mix(f1, 0.5, lodMid);
  float fib = f1 * 0.5 + f2 * 0.32 + f3 * 0.18;
  // Collarette: a wavy ring between the pupillary and ciliary zones.
  float wav = 0.3 + 0.1 * (eyeNoise(vec3(cs * 5.0, uSeed + 4.0)) - 0.5);
  float inner = smoothstep(wav + 0.05, wav - 0.03, t);
  float collEdge = exp(-pow((t - wav) / 0.03, 2.0));
  // Crypts: dark lacunae in the ciliary zone.
  float crypt = smoothstep(0.6, 0.78, eyeNoise(vec3(cs * 14.0, t * 4.5 + 3.0 + uSeed)))
    * smoothstep(wav, wav + 0.08, t) * smoothstep(0.92, 0.65, t);
  // Concentric contraction furrows toward the edge.
  float furrow = (0.5 + 0.5 * sin(t * 44.0 + (f2 - 0.5) * 4.0)) * smoothstep(0.55, 0.82, t);

  // Tone matches the original eyes: mostly the mid iris colour, the light shade
  // only in the fibres and the pupillary zone.
  float k = mix(0.12, 0.82, fib);
  k = mix(k, k * 1.1 + 0.08, inner);
  k += collEdge * 0.22;
  k -= crypt * 0.4 * (1.0 - lodMid);
  k -= furrow * 0.1 * (1.0 - lodFine);
  // Blending in linear light favours the light colour; bias toward the dark one
  // so the mix reads like the original (perceptual) iris.
  vec3 irisCol = mix(uIrisD, uIrisA, pow(clamp(k, 0.0, 1.25), 1.2));
  float limb = smoothstep(0.74, 1.0, r);
  irisCol = mix(irisCol, uIrisD * 0.3, limb * 0.9);
  // Pupil: soft edge, with a darker ruff just outside it.
  float ruff = exp(-pow((r - P - 0.02) / 0.025, 2.0));
  irisCol *= 1.0 - ruff * 0.5;
  float pup = 1.0 - smoothstep(P - 0.018, P + 0.012, r);
  vec3 eyeCol = mix(irisCol, vec3(0.004), pup);

  // Sclera: warm off-white, a touch greyer and pinker toward the back.
  float sR = length(eP.xy);
  vec3 scl = vec3(0.86, 0.83, 0.78) * mix(1.0, 0.8, smoothstep(0.5, 1.0, sR) * front + (1.0 - front));
  scl = mix(scl, scl * vec3(1.0, 0.88, 0.85), smoothstep(0.7, 1.0, sR) * 0.5);
  float irisMask = (1.0 - smoothstep(0.99, 1.03, r)) * front;
  eyeCol = mix(scl, eyeCol, irisMask);

  // Light pooling in the lower iris (the cornea focuses the key light there).
  float glowMask = irisMask * (1.0 - pup) * smoothstep(0.1, -0.75, q.y / sinA) * smoothstep(P, P + 0.25, r) * (1.0 - limb * 0.6);
  vec3 eyeGlow = uIrisA * glowMask * 0.45;

  // Contact shadows: under the lid edges and in the socket rim.
  vec3 dW = vEyeW - uCentreW;
  float sU = dot(dW, uLidUN) / uEyeRW;
  float sL = dot(dW, uLidLN) / uEyeRW;
  float ao = 1.0 - 0.72 * smoothstep(-0.34, 0.0, sU);
  ao *= 1.0 - 0.45 * smoothstep(-0.22, 0.0, sL);
  ao *= mix(0.45, 1.0, smoothstep(0.3, 0.72, dot(normalize(dW), uSockN)));
  diffuseColor.rgb = eyeCol * ao;
  eyeGlow *= ao * ao;
`;

/**
 * Iris colours as the approved Gate 1 eyes showed them. That build baked linear
 * colour values into an sRGB-tagged texture, so the GPU decoded them twice and
 * the irises read deeper than their config hex. The characters were signed off
 * that way, so the same extra decode is applied here deliberately.
 */
const irisColor = (hex: string) => new THREE.Color(hex).convertSRGBToLinear();

/** The eyeball material. Call `track` once the lid and socket frames exist. */
export const createEyeballMaterial = (look: EyeLook) => {
  const uniforms = {
    uIrisA: { value: irisColor(look.iris) },
    uIrisD: { value: irisColor(look.irisDark) },
    uIrisAngle: { value: look.irisAngle },
    uPupil: { value: look.pupil },
    uSeed: { value: look.seed },
    uCamL: { value: new THREE.Vector3(0, 0, 10) },
    uCentreW: { value: new THREE.Vector3() },
    uLidUN: { value: new THREE.Vector3(0, 1, 0) },
    uLidLN: { value: new THREE.Vector3(0, -1, 0) },
    uSockN: { value: new THREE.Vector3(0, 0, 1) },
    uEyeRW: { value: 1 },
  };
  const mat = new THREE.MeshPhysicalMaterial({ color: "#FFFFFF", roughness: 0.5, specularIntensity: 0.25, sheen: 0.15, sheenColor: new THREE.Color("#FFFFFF") });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vEyeP;\nvarying vec3 vEyeW;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvEyeP = position;\nvEyeW = (modelMatrix * vec4(position, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + DECLS)
      .replace("#include <color_fragment>", "#include <color_fragment>\n" + IRIS)
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += eyeGlow;");
  };
  mat.customProgramCacheKey = () => "protovinci-eyeball-v1";

  const inv = new THREE.Matrix4();
  const tmp = new THREE.Vector3();
  /**
   * Keep the per-frame uniforms current: camera in eye space, lid planes and
   * socket axis in world space. `lidU`/`lidL` are the lid frames (edge plane is
   * their local y = 0; the upper lid covers +y, the lower -y), `socket` faces out.
   */
  const track = (eye: THREE.Mesh, lidU: THREE.Object3D, lidL: THREE.Object3D, socket: THREE.Object3D, eyeR: number) => {
    eye.onBeforeRender = (_r, _s, camera) => {
      inv.copy(eye.matrixWorld).invert();
      uniforms.uCamL.value.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inv);
      uniforms.uCentreW.value.setFromMatrixPosition(eye.matrixWorld);
      uniforms.uLidUN.value.setFromMatrixColumn(lidU.matrixWorld, 1).normalize();
      uniforms.uLidLN.value.setFromMatrixColumn(lidL.matrixWorld, 1).normalize().negate();
      uniforms.uSockN.value.setFromMatrixColumn(socket.matrixWorld, 2).normalize();
      uniforms.uEyeRW.value = eyeR * tmp.setFromMatrixColumn(eye.matrixWorld, 0).length();
    };
  };
  const setPupil = (p: number) => {
    uniforms.uPupil.value = Math.max(0.12, Math.min(0.9, p));
  };
  return { material: mat, track, setPupil };
};

/** A cornea shell bulged over the iris; reflections and highlights only. */
export const createCornea = (eyeR: number, irisAngle: number) => {
  const geo = new THREE.SphereGeometry(eyeR * 1.012, 96, 64);
  const pos = geo.getAttribute("position");
  const v = new THREE.Vector3();
  const cosEdge = Math.cos(irisAngle * 1.15);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const c = v.z / v.length();
    if (c > cosEdge) {
      const k = (c - cosEdge) / (1 - cosEdge); // 0 at the limbus, 1 at the centre
      v.multiplyScalar(1 + 0.022 * Math.sin((k * Math.PI) / 2));
      pos.setXYZ(i, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({
    color: "#000000",
    roughness: 0.03,
    metalness: 0,
    ior: 1.45,
    specularIntensity: 1,
    clearcoat: 0.6,
    clearcoatRoughness: 0.02,
    envMapIntensity: 1.1,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return { geometry: geo, material: mat };
};
