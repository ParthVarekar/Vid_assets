// Fur materials: shells (dense plush undercoat) and strands (fluffy halo).
//
// Shells: the body is drawn N times (instancing), each copy pushed out along
// the normal. A fragment shader keeps only tiny strand cross-sections in each
// layer, so the stack reads as a pile of fibres. Strands converge toward clump
// centres as they rise, which turns hair into soft feather tufts (the trick
// Sony used on the Angry Birds characters).
//
// Strands: tapered ribbons, each facing the camera, grown from roots on the
// skin. They give the soft, see-through silhouette that shells cannot.
//
// Both are pure functions of the rest-pose surface and uniforms, so Remotion
// can render any frame in any order and get identical pixels. Both read the
// skeleton, so the fur follows the rig.

import * as THREE from "three";

export const MAX_LIGHTS = 4;

/** Light rig shared by the fur and the scene (world space). */
export type FurLights = {
  dirs: THREE.Vector3[];
  colors: THREE.Color[];
  sky: THREE.Color;
  ground: THREE.Color;
};

const COMMON = /* glsl */ `
  uniform vec3 uLightDir[${MAX_LIGHTS}];
  uniform vec3 uLightCol[${MAX_LIGHTS}];
  uniform vec3 uSky;
  uniform vec3 uGround;
  uniform float uSheen;

  vec3 hash33(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.xxy + p.yxx) * p.zyx);
  }
  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }

  // Worley F1: distance to the nearest feature point, its id, and the offset to it.
  void worley(vec3 p, out float dist, out float id, out vec3 toCenter) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    float best = 9.0;
    vec3 bestCell = vec3(0.0);
    vec3 bestR = vec3(0.0);
    for (int z = -1; z <= 1; z++)
    for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      vec3 g = vec3(float(x), float(y), float(z));
      vec3 r = g + hash33(i + g) - f;
      float d = dot(r, r);
      if (d < best) { best = d; bestCell = i + g; bestR = r; }
    }
    dist = sqrt(best);
    id = hash13(bestCell * 1.37 + 0.71);
    toCenter = bestR;
  }

  float kk(vec3 T, vec3 H, float e) {
    float th = dot(T, H);
    return pow(sqrt(max(0.0, 1.0 - th * th)), e);
  }

  // Kajiya-Kay hair lighting with wrap diffuse, two shifted specular lobes
  // (white primary, tinted secondary) and transmission when back-lit.
  vec3 furShade(vec3 base, vec3 N, vec3 T, vec3 V, float h) {
    vec3 c = vec3(0.0);
    for (int i = 0; i < ${MAX_LIGHTS}; i++) {
      vec3 L = uLightDir[i];
      vec3 C = uLightCol[i];
      float ndl = dot(N, L);
      // Soft wrap so light bleeds a little past the terminator, as in dense fur.
      float wrap = clamp((ndl + 0.3) / 1.3, 0.0, 1.0);
      wrap *= wrap * (3.0 - 2.0 * wrap) * 0.55 + wrap * 0.45;
      vec3 H = normalize(L + V);
      // Broad, soft lobes: plush sheen rather than glossy hair streaks.
      float s1 = kk(normalize(T + N * 0.15), H, 48.0) * 0.32;
      float s2 = kk(normalize(T - N * 0.22), H, 12.0) * 0.28;
      float back = pow(clamp(dot(-L, V), 0.0, 1.0), 5.0) * (0.25 + 0.75 * h) * smoothstep(-0.6, 0.3, -ndl + 0.2);
      c += C * (base * wrap + uSheen * (s1 + s2 * base) * smoothstep(-0.2, 0.5, ndl) + base * back * 1.1);
    }
    float up = N.y * 0.5 + 0.5;
    c += base * mix(uGround, uSky, up);
    return c;
  }
`;

const SKIN = /* glsl */ `
  #ifdef USE_SKINNING
  vec3 skinP(vec3 p, mat4 bx, mat4 by, mat4 bz, mat4 bw) {
    vec4 sv = bindMatrix * vec4(p, 1.0);
    vec4 r = bx * sv * skinWeight.x + by * sv * skinWeight.y + bz * sv * skinWeight.z + bw * sv * skinWeight.w;
    return (bindMatrixInverse * r).xyz;
  }
  vec3 skinD(vec3 d, mat4 bx, mat4 by, mat4 bz, mat4 bw) {
    mat4 m = skinWeight.x * bx + skinWeight.y * by + skinWeight.z * bz + skinWeight.w * bw;
    m = bindMatrixInverse * m * bindMatrix;
    return (m * vec4(d, 0.0)).xyz;
  }
  #endif
`;

// ---------------------------------------------------------------------------
// Shells
// ---------------------------------------------------------------------------

const SHELL_VERT = /* glsl */ `
  #include <common>
  #include <skinning_pars_vertex>
  ${SKIN}
  attribute vec3 aComb;   // fur flow direction (rest space, tangent)
  attribute vec4 aGroom;  // x length factor, y density mask, z clump factor, w comb multiplier
  attribute vec3 aTint;   // fur colour for this patch of skin (linear)
  uniform float uShells;
  uniform float uLength;
  uniform float uComb;
  uniform float uGravity;
  uniform float uFluff;
  uniform vec3 uWind;
  uniform float uScale;
  varying vec3 vRest;
  varying float vH;
  varying vec3 vN;
  varying vec3 vT;
  varying vec3 vW;
  varying vec3 vTint;
  varying vec4 vGroom;

  void main() {
    float h = float(gl_InstanceID) / uShells;
    float L = uLength * aGroom.x * uFluff;
    vec3 n = normalize(normal);
    vec3 t = normalize(aComb);
    // Fur grows out, then lies along its flow the further out it gets.
    vec3 p = position + n * (L * h) + t * (L * uComb * aGroom.w * h * h);
    vec3 nn = n;
    vec3 tt = t;
    #ifdef USE_SKINNING
      #include <skinbase_vertex>
      p = skinP(p, boneMatX, boneMatY, boneMatZ, boneMatW);
      nn = normalize(skinD(n, boneMatX, boneMatY, boneMatZ, boneMatW));
      tt = normalize(skinD(t, boneMatX, boneMatY, boneMatZ, boneMatW));
    #endif
    vec4 world = modelMatrix * vec4(p, 1.0);
    // Gravity and wind act on the tips, in world space.
    world.y -= L * uScale * uGravity * h * h;
    world.xyz += uWind * L * uScale * h * h;
    vRest = position;
    vH = h;
    vN = normalize((modelMatrix * vec4(nn, 0.0)).xyz);
    vT = normalize((modelMatrix * vec4(tt, 0.0)).xyz);
    vW = world.xyz;
    vTint = aTint;
    vGroom = aGroom;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const SHELL_FRAG = /* glsl */ `
  ${COMMON}
  uniform float uDensity;
  uniform float uClumpFreq;
  uniform float uClump;
  uniform float uRadius;
  uniform vec3 uTipLift;
  uniform float uRootAO;
  varying vec3 vRest;
  varying float vH;
  varying vec3 vN;
  varying vec3 vT;
  varying vec3 vW;
  varying vec3 vTint;
  varying vec4 vGroom;

  void main() {
    float h = vH;
    float alpha = 1.0;
    float strandId = 0.5;
    float clumpId = 0.5;
    float clumpDist = 0.0;
    if (h > 0.0) {
      if (vGroom.x < 0.03 || vGroom.y < 0.05) discard;
      // Clumps: strands lean toward a clump centre as they rise.
      vec3 cTo;
      worley(vRest * uClumpFreq, clumpDist, clumpId, cTo);
      vec3 q = vRest * uDensity;
      vec3 centre = (vRest * uClumpFreq + cTo) / uClumpFreq * uDensity;
      q = mix(q, centre, uClump * vGroom.z * pow(h, 1.4));
      float d; vec3 sTo;
      worley(q, d, strandId, sTo);
      float len = mix(0.55, 1.0, strandId) * mix(0.75, 1.0, clumpId);
      if (h > len) discard;
      float rel = h / len;
      // Thick at the root (dense undercoat hides the skin), fine at the tip.
      // Short fur (face) gets fatter roots so it reads as velvet, not dots.
      float r = mix(uRadius * 1.45 * mix(1.4, 1.0, clamp(vGroom.x, 0.0, 1.0)), uRadius * 0.35, pow(rel, 0.8));
      float fw = max(fwidth(d), 1e-4);
      alpha = 1.0 - smoothstep(r - fw, r + fw, d);
      if (alpha < 0.02) discard;
    }
    vec3 V = normalize(cameraPosition - vW);
    vec3 N = normalize(vN);
    // Fibre direction: up near the root, along the flow toward the tip.
    vec3 T = normalize(mix(N, vT, 0.35 + 0.65 * h));
    // Short fur has shallow roots: less occlusion, so the skin never reads as a grey gap.
    float rootAO = mix(1.0, uRootAO, clamp(vGroom.x, 0.0, 1.0));
    float ao = mix(rootAO, 1.0, pow(h, 0.7));
    vec3 base = vTint * mix(0.9, 1.08, clumpId) * mix(0.94, 1.04, strandId);
    // Soft shading between tufts, so the coat breaks into feathery clumps.
    if (h > 0.0) base *= mix(1.0, 0.8, smoothstep(0.3, 0.8, clumpDist) * (1.0 - 0.5 * h));
    base = mix(base, base * uTipLift, h * h);
    vec3 col = furShade(base, N, T, V, h) * ao;
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export type FurParams = {
  shells: number;
  length: number;
  density: number;
  clumpFreq: number;
  clump: number;
  radius: number;
  comb: number;
  gravity: number;
  sheen: number;
  /** Tip colour multiplier (linear), applied toward the fibre tips. */
  tipLift: THREE.Color;
  rootAO: number;
};

const lightUniforms = (lights: FurLights) => ({
  uLightDir: { value: lights.dirs },
  uLightCol: { value: lights.colors },
  uSky: { value: lights.sky },
  uGround: { value: lights.ground },
});

export const createShellMaterial = (p: FurParams, lights: FurLights): THREE.ShaderMaterial =>
  new THREE.ShaderMaterial({
    vertexShader: SHELL_VERT,
    fragmentShader: SHELL_FRAG,
    uniforms: {
      ...lightUniforms(lights),
      uShells: { value: p.shells },
      uLength: { value: p.length },
      uComb: { value: p.comb },
      uGravity: { value: p.gravity },
      uFluff: { value: 1 },
      uWind: { value: new THREE.Vector3() },
      uScale: { value: 1 },
      uDensity: { value: p.density },
      uClumpFreq: { value: p.clumpFreq },
      uClump: { value: p.clump },
      uRadius: { value: p.radius },
      uSheen: { value: p.sheen },
      uTipLift: { value: p.tipLift },
      uRootAO: { value: p.rootAO },
    },
    alphaToCoverage: true,
    side: THREE.FrontSide,
  });

// ---------------------------------------------------------------------------
// Strands
// ---------------------------------------------------------------------------

const STRAND_VERT = /* glsl */ `
  #include <common>
  #include <skinning_pars_vertex>
  ${SKIN}
  attribute float aT;       // 0 root .. 1 tip
  attribute float aSide;    // -1 / +1 across the ribbon
  attribute vec3 iRoot;
  attribute vec3 iNormal;
  attribute vec3 iComb;
  attribute vec4 iParams;   // x length, y random, z curl, w width factor
  attribute vec3 iTint;
  uniform float uSegments;
  uniform float uComb;
  uniform float uFrizz;
  uniform float uGravity;
  uniform float uFluff;
  uniform float uWidth;
  uniform float uPixel;     // world size of one pixel at distance 1
  uniform vec3 uWind;
  uniform float uScale;
  varying float vT;
  varying float vSide;
  varying vec3 vN;
  varying vec3 vTan;
  varying vec3 vW;
  varying vec3 vTint;
  varying float vAlpha;
  varying float vRand;

  vec3 strandPoint(float t) {
    float L = iParams.x * uFluff;
    vec3 up = iNormal;
    vec3 comb = iComb;
    vec3 side = normalize(cross(up, comb));
    // Rise from the skin, curve into the flow.
    vec3 p = iRoot + L * (up * t * (1.0 - 0.45 * uComb * t) + comb * (0.55 * uComb * t * t));
    // Frizz: gentle side-to-side wave, unique per strand.
    float ph = iParams.y * 40.0;
    p += side * (L * uFrizz * 0.22 * t * sin(t * (3.0 + iParams.z * 5.0) + ph));
    p += up * (L * uFrizz * 0.08 * t * cos(t * 4.0 + ph * 1.3));
    return p;
  }

  void main() {
    float t0 = aT;
    float t1 = min(aT + 1.0 / uSegments, 1.0);
    float t2 = max(aT - 1.0 / uSegments, 0.0);
    vec3 a = strandPoint(t0);
    vec3 b = strandPoint(t1 > t0 ? t1 : t0);
    vec3 c = strandPoint(t2);
    vec3 n = iNormal;
    #ifdef USE_SKINNING
      #include <skinbase_vertex>
      a = skinP(a, boneMatX, boneMatY, boneMatZ, boneMatW);
      b = skinP(b, boneMatX, boneMatY, boneMatZ, boneMatW);
      c = skinP(c, boneMatX, boneMatY, boneMatZ, boneMatW);
      n = normalize(skinD(n, boneMatX, boneMatY, boneMatZ, boneMatW));
    #endif
    float L = iParams.x * uFluff * uScale;
    vec4 wa = modelMatrix * vec4(a, 1.0);
    vec4 wb = modelMatrix * vec4(b, 1.0);
    vec4 wc = modelMatrix * vec4(c, 1.0);
    float tb = t1 > t0 ? t1 : t0;
    wa.y -= L * uGravity * t0 * t0;  wa.xyz += uWind * L * t0 * t0;
    wb.y -= L * uGravity * tb * tb;  wb.xyz += uWind * L * tb * tb;
    wc.y -= L * uGravity * t2 * t2;  wc.xyz += uWind * L * t2 * t2;
    vec3 tang = t1 > t0 ? normalize(wb.xyz - wa.xyz) : normalize(wa.xyz - wc.xyz);
    vec3 view = normalize(cameraPosition - wa.xyz);
    vec3 across = normalize(cross(tang, view));
    // Taper toward the tip; never thinner than a pixel (fade instead).
    float width = uWidth * iParams.w * uScale * pow(1.0 - t0, 0.7) + 1e-5;
    float minW = distance(cameraPosition, wa.xyz) * uPixel * 0.9;
    float alpha = 1.0;
    if (width < minW) { alpha = width / minW; width = minW; }
    vec3 world = wa.xyz + across * (width * 0.5 * aSide);
    vT = t0;
    vSide = aSide;
    vN = normalize((modelMatrix * vec4(n, 0.0)).xyz);
    vTan = tang;
    vW = world;
    vTint = iTint;
    vAlpha = alpha;
    vRand = iParams.y;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const STRAND_FRAG = /* glsl */ `
  ${COMMON}
  uniform vec3 uTipLift;
  uniform float uRootAO;
  varying float vT;
  varying float vSide;
  varying vec3 vN;
  varying vec3 vTan;
  varying vec3 vW;
  varying vec3 vTint;
  varying float vAlpha;
  varying float vRand;

  void main() {
    float edge = 1.0 - smoothstep(0.55, 1.0, abs(vSide));
    float tipFade = 1.0 - smoothstep(0.82, 1.0, vT);
    // Strands pointing at the camera read as speckle; keep them for the silhouette.
    float facing = abs(dot(normalize(vN), normalize(cameraPosition - vW)));
    float alpha = vAlpha * edge * tipFade * mix(1.0, 0.18, smoothstep(0.35, 0.85, facing));
    if (alpha < 0.02) discard;
    vec3 V = normalize(cameraPosition - vW);
    vec3 N = normalize(vN);
    vec3 base = vTint * mix(0.93, 1.06, vRand);
    base = mix(base, base * uTipLift, vT);
    float ao = mix(uRootAO, 1.0, pow(vT, 0.6));
    vec3 col = furShade(base, N, normalize(vTan), V, 0.6 + 0.4 * vT) * ao;
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export type StrandParams = {
  segments: number;
  comb: number;
  frizz: number;
  gravity: number;
  width: number;
  sheen: number;
  tipLift: THREE.Color;
  rootAO: number;
};

export const createStrandMaterial = (p: StrandParams, lights: FurLights): THREE.ShaderMaterial =>
  new THREE.ShaderMaterial({
    vertexShader: STRAND_VERT,
    fragmentShader: STRAND_FRAG,
    uniforms: {
      ...lightUniforms(lights),
      uSegments: { value: p.segments },
      uComb: { value: p.comb },
      uFrizz: { value: p.frizz },
      uGravity: { value: p.gravity },
      uFluff: { value: 1 },
      uWidth: { value: p.width },
      uPixel: { value: 0.0015 },
      uWind: { value: new THREE.Vector3() },
      uScale: { value: 1 },
      uSheen: { value: p.sheen },
      uTipLift: { value: p.tipLift },
      uRootAO: { value: p.rootAO },
    },
    alphaToCoverage: true,
    side: THREE.DoubleSide,
  });

/** The ribbon template every strand instance is drawn from. */
export const strandTemplate = (segments: number): THREE.InstancedBufferGeometry => {
  const g = new THREE.InstancedBufferGeometry();
  const n = (segments + 1) * 2;
  const pos = new Float32Array(n * 3);
  const t = new Float32Array(n);
  const side = new Float32Array(n);
  for (let i = 0; i <= segments; i++) {
    for (let s = 0; s < 2; s++) {
      const k = i * 2 + s;
      t[k] = i / segments;
      side[k] = s === 0 ? -1 : 1;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  g.setIndex(index);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aT", new THREE.BufferAttribute(t, 1));
  g.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
  return g;
};
