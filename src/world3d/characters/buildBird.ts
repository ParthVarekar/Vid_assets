// Builds a rigged, furred bird from a BirdConfig. Pure three.js, no files:
// same config, same bird, every time.
//
// Structure (all inside `group`):
//   root bone ── cog ── body_lo ── body_mid ── body_hi
//                                   │            ├─ eye_L / eye_R (eyeball, iris, pupil, cornea, rim)
//                                   │            ├─ lidU_L, lidL_L, lidU_R, lidL_R
//                                   │            ├─ beak_up, beak_lo
//                                   │            └─ crest_0
//                                   ├─ wing_L / wing_R
//                                   └─ leg_L / leg_R ── foot_L / foot_R
// The body skin and its fur (shells + strands) are skinned to body_lo/mid/hi;
// everything else rides on its bone.

import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { seeded } from "../../utilities/rng";
import { createShellMaterial, createStrandMaterial, strandTemplate, type FurLights } from "../fur/furMaterials";
import type { Secondary } from "../anim/evaluate";
import { restValues, type RigValues } from "../rig/schema";
import type { BirdConfig } from "./config";

const V3 = THREE.Vector3;
const lin = (hex: string) => new THREE.Color(hex); // THREE.Color converts sRGB hex to linear
/** Stable numeric seed from a string id. */
const seedOf = (id: string, salt: number) => {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
};
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A full set of rig values (see rig/schema.ts). */
export type BirdPose = RigValues;
export const REST_POSE: BirdPose = restValues();
const NO_SECONDARY: Secondary = { crestPitch: 0, crestRoll: 0, wind: [0, 0, 0], wingLag: 0 };

export type BuiltBird = {
  group: THREE.Group;
  height: number;
  /** Centre of the body (for framing). */
  centre: THREE.Vector3;
  furMaterials: THREE.ShaderMaterial[];
  strandMaterials: THREE.ShaderMaterial[];
  setPose: (p: BirdPose, secondary?: Secondary) => void;
  dispose: () => void;
};

// ---------------------------------------------------------------------------
// Body shape
// ---------------------------------------------------------------------------

const makeShape = (cfg: BirdConfig) => {
  const b = cfg.body;
  const R = b.width / 2;
  const fb = -0.55;
  const yMin = fb + (-1 - fb) * (1 - b.flatBottom * 0.6);
  return (d: THREE.Vector3, out = new V3()) => {
    const y = d.y;
    const s = 1 + b.bottomHeavy * 0.42 * -y - b.pear * 0.3 * Math.max(0, y) ** 2 + 0.04 * (1 - y * y);
    let yy = y;
    if (y < fb) yy = fb + (y - fb) * (1 - b.flatBottom * 0.6);
    const x = d.x * R * s;
    let z = d.z * R * s * b.depth;
    if (z > 0) z *= 1 - b.faceFlat * 0.22 * Math.max(0, d.z) ** 3;
    z += b.lean * R * Math.max(0, yy) ** 2;
    const Y = b.legLength + ((yy - yMin) / (1 - yMin)) * b.height;
    return out.set(x, Y, z);
  };
};

/** Surface point and normal for a direction given as azimuth/elevation (degrees). */
const surfaceAt = (shape: ReturnType<typeof makeShape>, azDeg: number, elev: number) => {
  const az = (azDeg * Math.PI) / 180;
  const el = elev;
  const dir = new V3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
  const p = shape(dir);
  const e = 1e-3;
  const du = shape(new V3(Math.sin(az + e) * Math.cos(el), Math.sin(el), Math.cos(az + e) * Math.cos(el)).normalize());
  const dv = shape(new V3(Math.sin(az) * Math.cos(el + e), Math.sin(el + e), Math.cos(az) * Math.cos(el + e)).normalize());
  const n = new V3().crossVectors(du.sub(p), dv.sub(p)).normalize();
  if (n.dot(dir) < 0) n.negate();
  return { p, n };
};

/** Find the elevation whose surface point sits at a given height fraction. */
const elevationForHeight = (shape: ReturnType<typeof makeShape>, cfg: BirdConfig, azDeg: number, frac: number) => {
  let lo = -Math.PI / 2;
  let hi = Math.PI / 2;
  const target = cfg.body.legLength + frac * cfg.body.height;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (surfaceAt(shape, azDeg, mid).p.y < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

// ---------------------------------------------------------------------------
// Iris texture (polar: x = angle, y = radius)
// ---------------------------------------------------------------------------

const irisTexture = (cfg: BirdConfig) => {
  const W = 512;
  const H = 128;
  const data = new Uint8Array(W * H * 4);
  const a = new THREE.Color(cfg.eyes.iris);
  const d = new THREE.Color(cfg.eyes.irisDark);
  const rnd = seeded(seedOf(cfg.id, 977));
  const fibres = Array.from({ length: 96 }, () => rnd());
  for (let y = 0; y < H; y++) {
    const r = 1 - y / (H - 1); // sphere-cap uv: v=1 at the pole (centre), 0 at the edge
    for (let x = 0; x < W; x++) {
      const ang = x / W;
      const f = fibres[Math.floor(ang * fibres.length) % fibres.length];
      const f2 = fibres[(Math.floor(ang * fibres.length * 3) + 7) % fibres.length];
      // Collarette brighter near the pupil, darker limbal ring at the edge.
      let k = 0.55 + 0.45 * smooth(0.95, 0.35, r);
      k *= 0.82 + 0.25 * f + 0.12 * f2;
      const limbal = smooth(0.78, 1.0, r);
      const c = new THREE.Color().copy(d).lerp(a, Math.max(0, Math.min(1, k)));
      c.lerp(d, limbal * 0.85);
      const i = (y * W + x) * 4;
      data[i] = Math.round(Math.min(1, c.r) * 255);
      data[i + 1] = Math.round(Math.min(1, c.g) * 255);
      data[i + 2] = Math.round(Math.min(1, c.b) * 255);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
};

// ---------------------------------------------------------------------------
// Feather (crest)
// ---------------------------------------------------------------------------

const FEATHER_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vN = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const FEATHER_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uTip;
  uniform float uTipFrom;
  uniform vec3 uLightDir[4];
  uniform vec3 uLightCol[4];
  uniform vec3 uSky;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  float h11(float x) { return fract(sin(x * 127.1) * 43758.5453); }
  void main() {
    float u = vUv.x * 2.0 - 1.0;   // across the vane
    float s = vUv.y;               // along the shaft
    // Barbs run diagonally toward the tip; ragged gaps near the edge.
    float barbCoord = s * 46.0 + abs(u) * 9.0;
    float barb = fract(barbCoord);
    float id = floor(barbCoord);
    float edge = 1.0 - abs(u);
    float ragged = h11(id + sign(u) * 31.0);
    float cut = smoothstep(0.0, 0.08 + 0.12 * ragged, edge - 0.04 * ragged);
    float gap = smoothstep(0.0, 0.18, barb) * (1.0 - smoothstep(0.82, 1.0, barb));
    float alpha = cut * mix(1.0, 0.55 + 0.45 * gap, smoothstep(0.75, 0.2, edge));
    if (alpha < 0.03) discard;
    vec3 base = mix(uColor, uTip, smoothstep(uTipFrom, uTipFrom + 0.12, s));
    float shaft = 1.0 - smoothstep(0.0, 0.05, abs(u));
    base = mix(base, base * 1.12 + 0.03, shaft);
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    if (dot(N, V) < 0.0) N = -N;
    vec3 c = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      float ndl = dot(N, uLightDir[i]);
      float wrap = clamp((ndl + 0.4) / 1.4, 0.0, 1.0);
      float back = pow(clamp(dot(-uLightDir[i], V), 0.0, 1.0), 4.0) * 0.9;
      c += uLightCol[i] * base * (wrap + back);
    }
    c += base * uSky * 0.9;
    c *= mix(0.92, 1.05, gap);
    gl_FragColor = vec4((any(isnan(c)) || any(isinf(c))) ? vec3(0.0) : clamp(c, 0.0, 32.0), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const featherGeometry = (len: number, width: number, curl: number, sweep: number, asym = 0.75) => {
  const S = 48;
  const U = 14;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= S; i++) {
    const s = i / S;
    // Shaft: up, curving backward, a little curl to the side.
    const cx = curl * len * s * s * 0.25;
    const cy = len * s * (1 - 0.18 * s);
    const cz = -sweep * len * s * s;
    const w = width * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.08)), 0.7) * (1 - 0.2 * s) + width * 0.06 * (1 - s);
    for (let j = 0; j <= U; j++) {
      const u = (j / U) * 2 - 1;
      const side = u < 0 ? asym : 1;
      const x = cx + u * w * side;
      const droop = -Math.pow(Math.abs(u), 1.6) * w * 0.25;
      pos.push(x, cy + droop * 0.4, cz + droop);
      uv.push(j / U, s);
    }
  }
  for (let i = 0; i < S; i++) {
    for (let j = 0; j < U; j++) {
      const a = i * (U + 1) + j;
      idx.push(a, a + U + 1, a + 1, a + 1, a + U + 1, a + U + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

// ---------------------------------------------------------------------------
// The builder
// ---------------------------------------------------------------------------

export const buildBird = (cfg: BirdConfig, lights: FurLights, quality: "final" | "preview" = "final"): BuiltBird => {
  const disposables: Array<{ dispose: () => void }> = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };
  const shape = makeShape(cfg);
  const B = cfg.body;
  const H = B.height;
  const leg = B.legLength;
  const group = new THREE.Group();
  group.name = `bird-${cfg.id}`;

  // ---- Skeleton -----------------------------------------------------------
  const mk = (name: string, world: THREE.Vector3, parent: THREE.Bone | null, worlds: Map<THREE.Bone, THREE.Vector3>) => {
    const b = new THREE.Bone();
    b.name = name;
    const pw = parent ? worlds.get(parent)! : new V3();
    b.position.copy(world).sub(pw);
    if (parent) parent.add(b);
    worlds.set(b, world.clone());
    return b;
  };
  const worlds = new Map<THREE.Bone, THREE.Vector3>();
  const root = mk("root", new V3(0, 0, 0), null, worlds);
  const cog = mk("cog", new V3(0, leg + H * 0.42, 0), root, worlds);
  const lo = mk("body_lo", new V3(0, leg + H * 0.18, 0), cog, worlds);
  const mid = mk("body_mid", new V3(0, leg + H * 0.48, 0), lo, worlds);
  const hi = mk("body_hi", new V3(0, leg + H * 0.76, 0), mid, worlds);
  group.add(root);

  // ---- Feature placement --------------------------------------------------
  const E = cfg.eyes;
  const R = B.width / 2;
  const eyeR = E.size * B.width;
  const eyes = ([-1, 1] as const).map((side) => {
    const az = side * E.spread;
    const el = elevationForHeight(shape, cfg, az, E.height);
    const { p, n } = surfaceAt(shape, az, el);
    const centre = p.clone().addScaledVector(n, eyeR * (E.protrude - 1));
    // Gaze: mostly forward (cute, forward-facing), a little outward.
    const gaze = new V3(0, 0, 1).lerp(n, 0.28).normalize();
    return { side, centre, gaze, surface: p, normal: n };
  });
  const beakEl = elevationForHeight(shape, cfg, 0, E.height - 0.115);
  const beakSurf = surfaceAt(shape, 0, beakEl);
  const crownEl = elevationForHeight(shape, cfg, 0, 0.985);
  const crown = surfaceAt(shape, 0, crownEl);

  // ---- Body geometry with groom attributes --------------------------------
  const segW = quality === "final" ? 176 : 96;
  const segH = quality === "final" ? 128 : 72;
  let body: THREE.BufferGeometry = new THREE.SphereGeometry(1, segW, segH);
  body.deleteAttribute("uv");
  body.deleteAttribute("normal");
  body = mergeVertices(body);
  const dirs = body.getAttribute("position");
  const count = dirs.count;
  const tmp = new V3();
  for (let i = 0; i < count; i++) {
    tmp.fromBufferAttribute(dirs, i).normalize();
    const p = shape(tmp);
    dirs.setXYZ(i, p.x, p.y, p.z);
  }
  body.computeVertexNormals();
  const normals = body.getAttribute("normal");

  const comb = new Float32Array(count * 3);
  const groom = new Float32Array(count * 4);
  const tint = new Float32Array(count * 3);
  const skinIndex = new Uint16Array(count * 4);
  const skinWeight = new Float32Array(count * 4);
  const cBase = lin(cfg.fur.base);
  const cBelly = lin(cfg.fur.belly);
  const cFace = cfg.fur.face ? lin(cfg.fur.face) : null;
  const cBlush = lin(cfg.fur.blush);
  const rnd = seeded(seedOf(cfg.id, 7919));
  const P = new V3();
  const N = new V3();
  const down = new V3(0, -1, -0.25).normalize();
  const boneIndex = { lo: 2, mid: 3, hi: 4 };
  for (let i = 0; i < count; i++) {
    P.fromBufferAttribute(dirs, i);
    N.fromBufferAttribute(normals, i);
    const t = (P.y - leg) / H; // 0 bottom .. 1 top
    const front = N.z;
    // Distance to each eye, in eye radii.
    const dEye = Math.min(...eyes.map((e) => P.distanceTo(e.centre) / eyeR));
    const dBeak = P.distanceTo(beakSurf.p) / (cfg.beak.size * B.width);
    // Length: short around the eyes and beak, longer on the crown and cheeks.
    let len = 1;
    len *= 0.72 + 0.28 * smooth(1.0, 1.6, dEye);
    len *= 0.4 + 0.6 * smooth(0.6, 1.6, dBeak);
    len *= 1 - 0.28 * smooth(0.45, 0.85, front) * smooth(0.25, 0.45, t) * (1 - smooth(0.78, 0.92, t));
    len *= 1 + 0.55 * smooth(0.86, 1.0, t);
    len *= 1 - 0.45 * smooth(0.14, 0.0, t);
    const cheek = Math.max(
      ...eyes.map((e) => {
        const c = e.surface.clone().add(new V3(e.side * eyeR * 0.7, -eyeR * 1.15, 0));
        return 1 - smooth(0.6, 1.5, P.distanceTo(c) / eyeR);
      }),
    );
    len *= 1 + 0.18 * cheek;
    // Fur may overlap the eyeball's edge, so the eyes sit in the fur, not on it.
    const density = dEye < 0.86 ? 0 : dBeak < 0.45 ? 0 : 1;
    const clump = 1 - 0.55 * smooth(0.4, 0.8, front) * smooth(0.3, 0.5, t) * (1 - smooth(0.78, 0.9, t));
    groom.set([len, density, clump, rnd()], i * 4);

    // Flow: down and back over the body, out from the face, up on the crown.
    const flow = down.clone();
    const faceOut = P.clone().sub(beakSurf.p).normalize();
    flow.lerp(faceOut, smooth(0.35, 0.85, front) * smooth(0.3, 0.5, t) * (1 - smooth(0.8, 0.95, t)) * 0.8);
    flow.lerp(new V3(0, 1, -0.6).normalize(), smooth(0.84, 0.98, t));
    // Eye sockets: fur around each eye leans in over the eyeball's rim.
    const nearEye = eyes.reduce((a, e) => (P.distanceTo(e.centre) < P.distanceTo(a.centre) ? e : a));
    const socket = 1 - smooth(1.0, 1.55, P.distanceTo(nearEye.centre) / eyeR);
    flow.lerp(nearEye.centre.clone().sub(P).normalize(), socket * 0.9);
    groom[i * 4 + 3] = 1 + 1.4 * socket; // comb multiplier
    flow.addScaledVector(N, -flow.dot(N));
    if (flow.lengthSq() < 1e-6) flow.set(1, 0, 0).addScaledVector(N, -N.x);
    flow.normalize();
    comb.set([flow.x, flow.y, flow.z], i * 3);

    // Colour regions.
    const col = cBase.clone();
    const belly = smooth(0.15, 0.7, front) * smooth(0.5, 0.22, t) * cfg.fur.bellyAmount;
    col.lerp(cBelly, belly);
    if (cFace) {
      // A spectacle-shaped mask: rings around the eyes joined over the beak.
      const ring = Math.max(...eyes.map((e) => 1 - smooth(1.25, 1.85, P.distanceTo(e.centre) / eyeR)));
      const muzzle = 1 - smooth(0.8, 2.2, dBeak);
      const face = Math.max(ring, muzzle) * smooth(0.1, 0.4, front) * cfg.fur.faceAmount;
      col.lerp(cFace, face);
    }
    col.lerp(cBlush, cheek * cfg.fur.blushAmount * smooth(0.0, 0.5, front));
    col.lerp(new THREE.Color(cfg.fur.base).multiplyScalar(0.8), smooth(0.2, -0.5, front) * 0.25);
    tint.set([col.r, col.g, col.b], i * 3);

    // Skin weights along the height.
    const wLo = 1 - smooth(0.12, 0.5, t);
    const wHi = smooth(0.42, 0.82, t);
    const wMid = Math.max(0, 1 - wLo - wHi);
    const sum = wLo + wMid + wHi;
    skinIndex.set([boneIndex.lo, boneIndex.mid, boneIndex.hi, 0], i * 4);
    skinWeight.set([wLo / sum, wMid / sum, wHi / sum, 0], i * 4);
  }
  body.setAttribute("aComb", new THREE.BufferAttribute(comb, 3));
  body.setAttribute("aGroom", new THREE.BufferAttribute(groom, 4));
  body.setAttribute("aTint", new THREE.BufferAttribute(tint, 3));
  body.setAttribute("skinIndex", new THREE.BufferAttribute(skinIndex, 4));
  body.setAttribute("skinWeight", new THREE.BufferAttribute(skinWeight, 4));

  // ---- Remaining bones (features) ----------------------------------------
  const eyeBones = eyes.map((e) => mk(`eye_${e.side < 0 ? "L" : "R"}`, e.centre, hi, worlds));
  const lidUp = eyes.map((e) => mk(`lidU_${e.side < 0 ? "L" : "R"}`, e.centre, hi, worlds));
  const lidLo = eyes.map((e) => mk(`lidL_${e.side < 0 ? "L" : "R"}`, e.centre, hi, worlds));
  const beakBase = beakSurf.p.clone().addScaledVector(beakSurf.n, -cfg.beak.size * B.width * 0.25);
  const beakUp = mk("beak_up", beakBase, hi, worlds);
  const beakLo = mk("beak_lo", beakBase.clone().add(new V3(0, -cfg.beak.size * B.width * 0.18, 0)), hi, worlds);
  const crestBone = mk("crest_0", crown.p.clone().addScaledVector(crown.n, -0.01), hi, worlds);
  const wingBones = ([-1, 1] as const).map((side) => {
    const el = elevationForHeight(shape, cfg, side * 74, 0.5);
    const s = surfaceAt(shape, side * 74, el);
    return { side, bone: mk(`wing_${side < 0 ? "L" : "R"}`, s.p.clone().addScaledVector(s.n, cfg.fur.length * H * 0.55), mid, worlds), n: s.n };
  });
  // Legs hang from the root, not the body: the hip follows the body each frame
  // while the foot stays planted, so squash, lean and twist never slide the feet.
  const legBones = ([-1, 1] as const).map((side) => {
    const hip = new V3(side * R * 0.34, leg + H * 0.06, R * 0.08);
    const bone = mk(`leg_${side < 0 ? "L" : "R"}`, hip, root, worlds);
    const footRest = new V3(side * R * 0.38, 0.012, R * 0.14);
    const foot = mk(`foot_${side < 0 ? "L" : "R"}`, footRest, root, worlds);
    const hipInLo = hip.clone().sub(worlds.get(lo)!);
    return { side, bone, foot, hip, footRest, hipInLo };
  });

  group.updateMatrixWorld(true);
  const allBones: THREE.Bone[] = [];
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) allBones.push(o as THREE.Bone);
  });
  // Body bones must sit at the indices used in skinIndex above.
  const order = [root, cog, lo, mid, hi, ...allBones.filter((b) => ![root, cog, lo, mid, hi].includes(b))];
  const skeleton = new THREE.Skeleton(order);

  // ---- Fur: shells --------------------------------------------------------
  const F = cfg.fur;
  const tipLift = new THREE.Color(F.tip).clone();
  const baseLin = new THREE.Color(F.base);
  tipLift.setRGB(
    Math.max(0.85, Math.min(1.45, tipLift.r / Math.max(0.02, baseLin.r))),
    Math.max(0.85, Math.min(1.45, tipLift.g / Math.max(0.02, baseLin.g))),
    Math.max(0.85, Math.min(1.45, tipLift.b / Math.max(0.02, baseLin.b))),
  );
  const shells = quality === "final" ? 52 : 26;
  const shellGeo = new THREE.InstancedBufferGeometry();
  for (const name of ["position", "normal", "aComb", "aGroom", "aTint", "skinIndex", "skinWeight"]) {
    shellGeo.setAttribute(name, body.getAttribute(name));
  }
  shellGeo.setIndex(body.getIndex());
  shellGeo.instanceCount = shells + 1;
  const shellMat = keep(
    createShellMaterial(
      {
        shells,
        length: F.length * H,
        density: F.density / H,
        clumpFreq: F.clumpFreq / H,
        clump: F.clump,
        radius: F.radius,
        comb: F.comb,
        gravity: F.gravity,
        sheen: F.sheen,
        tipLift,
        rootAO: 0.6,
      },
      lights,
    ),
  );
  const shellMesh = new THREE.SkinnedMesh(shellGeo, shellMat);
  shellMesh.frustumCulled = false;
  shellMesh.name = "fur-shells";
  group.add(shellMesh);
  shellMesh.bind(skeleton);
  keep(shellGeo);

  // Shadow caster: the fur shaders cannot cast shadows, so an invisible hull,
  // inflated to the fur's mid-length, casts the bird's shadow onto the set.
  const hullGeo = keep(body.clone());
  {
    const hp = hullGeo.getAttribute("position");
    const hn = hullGeo.getAttribute("normal");
    const g4 = hullGeo.getAttribute("aGroom");
    for (let i = 0; i < hp.count; i++) {
      const d = F.length * H * 0.6 * g4.getX(i);
      hp.setXYZ(i, hp.getX(i) + hn.getX(i) * d, hp.getY(i) + hn.getY(i) * d, hp.getZ(i) + hn.getZ(i) * d);
    }
  }
  const hull = new THREE.SkinnedMesh(hullGeo, keep(new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })));
  hull.castShadow = true;
  hull.frustumCulled = false;
  hull.name = "shadow-hull";
  group.add(hull);
  hull.bind(skeleton);

  /** Grow shell fur on any rigid part (wings, lids). `flow` gives the combing direction from a normal. */
  const furCoat = (src: THREE.BufferGeometry, lenFactor: number, color: THREE.Color, flow: (n: THREE.Vector3) => THREE.Vector3) => {
    const g0 = src.clone();
    g0.deleteAttribute("uv");
    g0.deleteAttribute("normal");
    const geo = mergeVertices(g0);
    g0.dispose();
    geo.computeVertexNormals();
    const cnt = geo.getAttribute("position").count;
    const wc = new Float32Array(cnt * 3);
    const wg = new Float32Array(cnt * 4);
    const wt = new Float32Array(cnt * 3);
    const nn = geo.getAttribute("normal");
    const n = new V3();
    for (let i = 0; i < cnt; i++) {
      n.fromBufferAttribute(nn, i);
      const f = flow(n.clone());
      f.addScaledVector(n, -f.dot(n));
      if (f.lengthSq() < 1e-6) f.set(0, 0, 1).addScaledVector(n, -n.z);
      if (f.lengthSq() < 1e-6) f.set(1, 0, 0);
      f.normalize();
      wc.set([f.x, f.y, f.z], i * 3);
      wg.set([lenFactor, 1, 0.9, 1], i * 4);
      wt.set([color.r, color.g, color.b], i * 3);
    }
    geo.setAttribute("aComb", new THREE.BufferAttribute(wc, 3));
    geo.setAttribute("aGroom", new THREE.BufferAttribute(wg, 4));
    geo.setAttribute("aTint", new THREE.BufferAttribute(wt, 3));
    const ig = new THREE.InstancedBufferGeometry();
    for (const name of ["position", "normal", "aComb", "aGroom", "aTint"]) ig.setAttribute(name, geo.getAttribute(name));
    ig.setIndex(geo.getIndex());
    ig.instanceCount = shells + 1;
    keep(ig);
    keep(geo);
    const m = new THREE.Mesh(ig, shellMat);
    m.frustumCulled = false;
    return m;
  };

  // ---- Fur: strands -------------------------------------------------------
  const segments = quality === "final" ? 7 : 5;
  const strandCount = Math.round(F.strands * (quality === "final" ? 1 : 0.4));
  const index = body.getIndex()!;
  const tris = index.count / 3;
  const cdf = new Float32Array(tris);
  let acc = 0;
  const a = new V3();
  const b2 = new V3();
  const c = new V3();
  for (let t = 0; t < tris; t++) {
    const ia = index.getX(t * 3);
    const ib = index.getX(t * 3 + 1);
    const ic = index.getX(t * 3 + 2);
    a.fromBufferAttribute(dirs, ia);
    b2.fromBufferAttribute(dirs, ib);
    c.fromBufferAttribute(dirs, ic);
    const area = new V3().crossVectors(b2.clone().sub(a), c.clone().sub(a)).length() * 0.5;
    const g = Math.min(groom[ia * 4], groom[ib * 4], groom[ic * 4]);
    const dmask = Math.min(groom[ia * 4 + 1], groom[ib * 4 + 1], groom[ic * 4 + 1]);
    acc += area * (g > 0.35 && dmask > 0.5 ? g : 0);
    cdf[t] = acc;
  }
  const iRoot = new Float32Array(strandCount * 3);
  const iNormal = new Float32Array(strandCount * 3);
  const iComb = new Float32Array(strandCount * 3);
  const iParams = new Float32Array(strandCount * 4);
  const iTint = new Float32Array(strandCount * 3);
  const iSkinIndex = new Uint16Array(strandCount * 4);
  const iSkinWeight = new Float32Array(strandCount * 4);
  const srnd = seeded(seedOf(cfg.id, 104729));
  const bary = new V3();
  for (let s = 0; s < strandCount; s++) {
    const target = srnd() * acc;
    let lo2 = 0;
    let hi2 = tris - 1;
    while (lo2 < hi2) {
      const m = (lo2 + hi2) >> 1;
      if (cdf[m] < target) lo2 = m + 1;
      else hi2 = m;
    }
    const t = lo2;
    const ids = [index.getX(t * 3), index.getX(t * 3 + 1), index.getX(t * 3 + 2)];
    let u = srnd();
    let v = srnd();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    bary.set(1 - u - v, u, v);
    const w = [bary.x, bary.y, bary.z];
    const pick = (attr: ArrayLike<number>, stride: number, k: number) => w[0] * attr[ids[0] * stride + k] + w[1] * attr[ids[1] * stride + k] + w[2] * attr[ids[2] * stride + k];
    const pos = dirs.array as ArrayLike<number>;
    const nrm = normals.array as ArrayLike<number>;
    const root3 = new V3(pick(pos, 3, 0), pick(pos, 3, 1), pick(pos, 3, 2));
    const n3 = new V3(pick(nrm, 3, 0), pick(nrm, 3, 1), pick(nrm, 3, 2)).normalize();
    const c3 = new V3(pick(comb, 3, 0), pick(comb, 3, 1), pick(comb, 3, 2)).normalize();
    const g = pick(groom, 4, 0);
    const r = srnd();
    iRoot.set([root3.x, root3.y, root3.z], s * 3);
    iNormal.set([n3.x, n3.y, n3.z], s * 3);
    iComb.set([c3.x, c3.y, c3.z], s * 3);
    iParams.set([F.length * H * F.strandLength * g * (0.55 + 0.8 * r), srnd(), srnd(), 0.7 + 0.6 * srnd()], s * 4);
    iTint.set([pick(tint, 3, 0), pick(tint, 3, 1), pick(tint, 3, 2)], s * 3);
    const dom = w[0] >= w[1] && w[0] >= w[2] ? 0 : w[1] >= w[2] ? 1 : 2;
    iSkinIndex.set(skinIndex.subarray(ids[dom] * 4, ids[dom] * 4 + 4), s * 4);
    iSkinWeight.set(skinWeight.subarray(ids[dom] * 4, ids[dom] * 4 + 4), s * 4);
  }
  const strandGeo = strandTemplate(segments);
  strandGeo.setAttribute("iRoot", new THREE.InstancedBufferAttribute(iRoot, 3));
  strandGeo.setAttribute("iNormal", new THREE.InstancedBufferAttribute(iNormal, 3));
  strandGeo.setAttribute("iComb", new THREE.InstancedBufferAttribute(iComb, 3));
  strandGeo.setAttribute("iParams", new THREE.InstancedBufferAttribute(iParams, 4));
  strandGeo.setAttribute("iTint", new THREE.InstancedBufferAttribute(iTint, 3));
  strandGeo.setAttribute("skinIndex", new THREE.InstancedBufferAttribute(iSkinIndex, 4));
  strandGeo.setAttribute("skinWeight", new THREE.InstancedBufferAttribute(iSkinWeight, 4));
  strandGeo.instanceCount = strandCount;
  const strandMat = keep(
    createStrandMaterial(
      { segments, comb: F.comb * 0.9, frizz: F.frizz, gravity: F.gravity * 0.8, width: 0.0028 * H, sheen: F.sheen, tipLift, rootAO: 0.55 },
      lights,
    ),
  );
  const strandMesh = new THREE.SkinnedMesh(strandGeo, strandMat);
  strandMesh.frustumCulled = false;
  strandMesh.name = "fur-strands";
  group.add(strandMesh);
  strandMesh.bind(skeleton);
  keep(strandGeo);

  // ---- Eyes ---------------------------------------------------------------
  const iris = keep(irisTexture(cfg));
  const sclera = keep(new THREE.MeshPhysicalMaterial({ color: "#F4F0E8", roughness: 0.42, sheen: 0.4, sheenColor: new THREE.Color("#FFFFFF") }));
  // Iris and pupil are thin caps on the eyeball; polygon offset keeps them from
  // z-fighting with each other at wide shots.
  const pupilMat = keep(new THREE.MeshPhysicalMaterial({ color: "#050506", roughness: 0.25, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  const irisMat = keep(new THREE.MeshPhysicalMaterial({ map: iris, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const cornea = keep(
    new THREE.MeshPhysicalMaterial({
      color: "#FFFFFF",
      transparent: true,
      opacity: 0.06,
      roughness: 0.02,
      clearcoat: 1,
      clearcoatRoughness: 0.01,
      envMapIntensity: 2.4,
      specularIntensity: 1,
      depthWrite: false,
    }),
  );
  const rimMat = keep(new THREE.MeshPhysicalMaterial({ color: E.rim, roughness: 0.5, sheen: 0.3 }));
  const lidColor = new THREE.Color(cfg.fur.face ?? cfg.fur.base).lerp(new THREE.Color(E.rim), 0.08);
  const lidMat = keep(new THREE.MeshPhysicalMaterial({ color: lidColor, roughness: 0.8, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(cfg.fur.tip) }));
  const irisAngle = Math.asin(Math.min(0.98, E.irisSize));
  const sphere = (r: number, ws: number, hs: number, theta = Math.PI) => keep(new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, theta));
  const eyeParts: Array<{ pupil: THREE.Mesh; lidU: THREE.Bone; lidL: THREE.Bone; eye: THREE.Bone; gazeQ: THREE.Quaternion }> = [];
  eyes.forEach((e, k) => {
    const gazeQ = new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), e.gaze);
    const holder = new THREE.Group();
    holder.quaternion.copy(gazeQ);
    eyeBones[k].add(holder);
    holder.add(new THREE.Mesh(keep(new THREE.SphereGeometry(eyeR, 64, 48)), sclera));
    const irisCap = new THREE.Mesh(sphere(eyeR * 1.002, 72, 24, irisAngle), irisMat);
    irisCap.geometry.rotateX(Math.PI / 2);
    holder.add(irisCap);
    const pupil = new THREE.Mesh(sphere(eyeR * 1.004, 48, 12, irisAngle * E.pupil), pupilMat);
    pupil.geometry.rotateX(Math.PI / 2);
    holder.add(pupil);
    holder.add(new THREE.Mesh(keep(new THREE.SphereGeometry(eyeR * 1.035, 64, 48)), cornea));
    // Coloured liner where the fur meets the eyeball.
    const ringZ = 0.34;
    const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(eyeR * Math.sqrt(1 - ringZ * ringZ) * 1.01, eyeR * E.rimWidth, 16, 72)), rimMat);
    ring.position.z = eyeR * ringZ;
    // Rim and lids sit in a frame that does not rotate with the gaze.
    const socket = new THREE.Group();
    socket.quaternion.copy(gazeQ);
    socket.position.copy(e.centre).sub(worlds.get(hi)!);
    hi.add(socket);
    socket.add(ring);
    const lidUG = new THREE.Group();
    lidUG.quaternion.copy(gazeQ);
    lidUp[k].add(lidUG);
    // Lids are furred like the body, combed toward their edge.
    const lidU = new THREE.Mesh(sphere(eyeR * 1.05, 64, 24, Math.PI / 2), lidMat);
    lidUG.add(lidU);
    lidUG.add(furCoat(lidU.geometry, 0.3, lidColor, () => new V3(0, -0.4, 1)));
    const lidLG = new THREE.Group();
    lidLG.quaternion.copy(gazeQ);
    lidLo[k].add(lidLG);
    const lidLGeo = keep(new THREE.SphereGeometry(eyeR * 1.065, 64, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));
    lidLG.add(new THREE.Mesh(lidLGeo, lidMat));
    lidLG.add(furCoat(lidLGeo, 0.25, lidColor, () => new V3(0, 0.3, 1)));
    if (E.lashes) {
      const lashMat = keep(new THREE.MeshPhysicalMaterial({ color: "#2A1410", roughness: 0.5 }));
      // Three curved lashes at the outer corner, growing from the lid edge.
      [42, 58, 74].forEach((deg, j) => {
        const a = (deg * Math.PI) / 180;
        const r = eyeR * 1.06;
        const base = new V3(e.side * Math.sin(a) * r, 0, Math.cos(a) * r);
        const out = new V3(e.side * Math.sin(a), 0, Math.cos(a));
        const L = eyeR * (0.42 + j * 0.06);
        const curve = new THREE.QuadraticBezierCurve3(
          base,
          base.clone().addScaledVector(out, L * 0.45).add(new V3(0, L * 0.35, 0)),
          base.clone().addScaledVector(out, L * 0.75).add(new V3(0, L * 0.95, 0)),
        );
        const tube = keep(new THREE.TubeGeometry(curve, 16, eyeR * 0.03, 6));
        // Taper toward the tip.
        const tp = tube.getAttribute("position");
        const cp = new V3();
        for (let i = 0; i < tp.count; i++) {
          const t = Math.floor(i / 7) / 16;
          const c0 = curve.getPoint(t);
          cp.fromBufferAttribute(tp, i).sub(c0).multiplyScalar(1 - 0.85 * t).add(c0);
          tp.setXYZ(i, cp.x, cp.y, cp.z);
        }
        tube.computeVertexNormals();
        lidU.add(new THREE.Mesh(tube, lashMat));
      });
    }
    eyeParts.push({ pupil, lidU: lidUp[k], lidL: lidLo[k], eye: eyeBones[k], gazeQ });
  });

  // ---- Glasses (Ink) ------------------------------------------------------
  if (cfg.glasses) {
    const acetate = keep(new THREE.MeshPhysicalMaterial({ color: "#1B1A20", roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 }));
    const lens = keep(new THREE.MeshPhysicalMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.08, roughness: 0.02, clearcoat: 1, envMapIntensity: 2, depthWrite: false }));
    const frames = new THREE.Group();
    // Lens radius: as big as possible without the two rims touching.
    const gapAt = (e: (typeof eyes)[number]) => e.centre.clone().addScaledVector(e.gaze, eyeR * 1.15);
    const gR = Math.min(eyeR * 1.3, (gapAt(eyes[0]).distanceTo(gapAt(eyes[1])) / 2) * 0.93);
    eyes.forEach((e) => {
      const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), e.gaze);
      const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(gR, eyeR * 0.09, 16, 72)), acetate);
      ring.quaternion.copy(q);
      ring.position.copy(e.centre).addScaledVector(e.gaze, eyeR * 1.15);
      frames.add(ring);
      const glass = new THREE.Mesh(keep(new THREE.CircleGeometry(gR * 0.97, 48)), lens);
      glass.quaternion.copy(q);
      glass.position.copy(ring.position);
      frames.add(glass);
      const templeEnd = e.centre.clone().add(new V3(e.side * eyeR * 2.2, eyeR * 0.15, -eyeR * 2.2));
      const templeStart = ring.position.clone().add(new V3(e.side * gR, 0, 0));
      const temple = new THREE.Mesh(keep(new THREE.CylinderGeometry(eyeR * 0.06, eyeR * 0.06, templeStart.distanceTo(templeEnd), 10)), acetate);
      temple.position.copy(templeStart).add(templeEnd).multiplyScalar(0.5);
      temple.quaternion.setFromUnitVectors(new V3(0, 1, 0), templeEnd.clone().sub(templeStart).normalize());
      frames.add(temple);
    });
    const l = eyes[0].centre.clone().addScaledVector(eyes[0].gaze, eyeR * 1.15).add(new V3(gR, 0, 0));
    const r = eyes[1].centre.clone().addScaledVector(eyes[1].gaze, eyeR * 1.15).add(new V3(-gR, 0, 0));
    const bridge = new THREE.Mesh(keep(new THREE.CylinderGeometry(eyeR * 0.07, eyeR * 0.07, l.distanceTo(r) * 1.1, 10)), acetate);
    bridge.position.copy(l).add(r).multiplyScalar(0.5).add(new V3(0, eyeR * 0.15, eyeR * 0.05));
    bridge.rotation.z = Math.PI / 2;
    frames.add(bridge);
    frames.position.sub(worlds.get(hi)!);
    hi.add(frames);
  }

  // ---- Beak ---------------------------------------------------------------
  const bw = cfg.beak.size * B.width;
  const beakMat = keep(new THREE.MeshPhysicalMaterial({ color: cfg.beak.color, metalness: cfg.beak.metal, roughness: cfg.beak.metal > 0.5 ? 0.28 : 0.5, clearcoat: 0.6, clearcoatRoughness: 0.25 }));
  const beakShade = keep(new THREE.MeshPhysicalMaterial({ color: cfg.beak.shade, roughness: 0.6 }));
  // Beaks are lofted along +Z: a cross-section (rounded on top, flatter below)
  // whose width, heights and droop vary from base (s=0) to tip (s=1).
  type Profile = { w: (s: number) => number; top: (s: number) => number; bot: (s: number) => number; drop: (s: number) => number };
  const loft = (length: number, p: Profile) => {
    const S = 40;
    const U = 36;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= S; i++) {
      const s = i / S;
      for (let j = 0; j <= U; j++) {
        const th = (j / U) * Math.PI * 2;
        const c = Math.cos(th);
        const sn = Math.sin(th);
        const x = p.w(s) * Math.sign(c) * Math.abs(c) ** 0.8;
        const y = p.drop(s) + (sn >= 0 ? p.top(s) : p.bot(s)) * Math.sign(sn) * Math.abs(sn) ** 0.9;
        pos.push(x, y, s * length);
      }
    }
    for (let i = 0; i < S; i++) {
      for (let j = 0; j < U; j++) {
        const a = i * (U + 1) + j;
        idx.push(a, a + 1, a + U + 1, a + 1, a + U + 2, a + U + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return keep(g);
  };
  const kind = cfg.beak.kind;
  const len = kind === "point" ? bw * 1.15 : kind === "round" ? bw * 0.8 : bw * 1.15;
  const upperP: Profile =
    kind === "nib"
      ? {
          // Fountain-pen nib: slight shoulders, then a clean taper to a point.
          w: (s) => bw * 0.5 * (1 + 0.22 * Math.sin(Math.PI * Math.min(1, s * 1.4))) * (1 - s) ** 0.85,
          top: (s) => bw * 0.3 * (1 - 0.7 * s),
          bot: (s) => bw * 0.08 * (1 - s),
          drop: (s) => -bw * 0.2 * s * s,
        }
      : kind === "round"
        ? {
            w: (s) => bw * 0.5 * Math.sqrt(Math.max(0, 1 - s ** 2.2)),
            top: (s) => bw * 0.32 * Math.sqrt(Math.max(0, 1 - s ** 2)),
            bot: (s) => bw * 0.1 * Math.sqrt(Math.max(0, 1 - s ** 2)),
            drop: (s) => -bw * 0.12 * s * s,
          }
        : {
            w: (s) => bw * 0.48 * (1 - s) ** 1.1,
            top: (s) => bw * 0.34 * (1 - s),
            bot: (s) => bw * 0.1 * (1 - s),
            drop: (s) => -bw * 0.2 * s * s,
          };
  beakUp.add(new THREE.Mesh(loft(len, upperP), beakMat));
  const lowerP: Profile = {
    w: (s) => upperP.w(s * 0.8) * 0.85,
    top: (s) => bw * 0.04 * (1 - s),
    bot: (s) => bw * 0.16 * (1 - s) ** 0.8,
    drop: (s) => -bw * 0.1 * s,
  };
  beakLo.add(new THREE.Mesh(loft(len * 0.72, lowerP), beakMat));
  if (kind === "nib") {
    // The slit runs along the top of the nib from the breather hole to the point.
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
      const s = 0.42 + (i / 16) * 0.56;
      pts.push(new V3(0, upperP.drop(s) + upperP.top(s) * 1.0, s * len));
    }
    const slit = new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, bw * 0.014, 6)), beakShade);
    beakUp.add(slit);
    const s0 = 0.4;
    const hole = new THREE.Mesh(keep(new THREE.SphereGeometry(bw * 0.055, 16, 12)), beakShade);
    hole.scale.set(1, 0.5, 1.15);
    hole.position.set(0, upperP.drop(s0) + upperP.top(s0) * 0.97, s0 * len);
    beakUp.add(hole);
  }

  // ---- Wings --------------------------------------------------------------
  const wingParts: Array<{ bone: THREE.Bone; holder: THREE.Group; side: number }> = [];
  wingBones.forEach(({ side, bone, n }) => {
    const ws = cfg.wings.size * H;
    const holder = new THREE.Group();
    // Hang down along the side, flat against the body, tilted slightly forward.
    holder.quaternion.setFromUnitVectors(new V3(side, 0, 0), n);
    holder.rotateZ(side * 0.12);
    holder.rotateX(-0.18);
    bone.add(holder);
    const wingGeo = keep(new THREE.SphereGeometry(1, 48, 32));
    wingGeo.scale(ws * 0.22, ws * 0.5, ws * 0.33);
    wingGeo.translate(side * ws * 0.06, -ws * 0.42, ws * 0.04);
    const fingers = [-1, 0, 1].map((f) => {
      const g = new THREE.SphereGeometry(1, 24, 16);
      g.scale(ws * 0.09, ws * 0.17, ws * 0.1);
      g.rotateX(f * 0.25);
      g.translate(side * ws * 0.02, -ws * 0.88, ws * (0.02 + f * 0.11));
      return g;
    });
    const wingCol = new THREE.Color(cfg.wings.color);
    for (const g of [wingGeo, ...fingers]) {
      holder.add(furCoat(g, 0.65, wingCol, () => new V3(0, -1, 0)));
      g.dispose();
    }
    wingParts.push({ bone, holder, side });
  });

  // ---- Legs and feet --------------------------------------------------------
  const footMat = keep(new THREE.MeshPhysicalMaterial({ color: cfg.feet.color, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.3 }));
  const legMeshes: THREE.Mesh[] = [];
  const legRestLen = legBones[0].hip.distanceTo(legBones[0].footRest);
  legBones.forEach(({ side, foot }) => {
    // Unit-length capsule along Y, placed and stretched between hip and foot every frame.
    const legGeo = keep(new THREE.CapsuleGeometry(0.03 * H, legRestLen, 6, 12));
    const legMesh = new THREE.Mesh(legGeo, footMat);
    root.add(legMesh);
    legMeshes.push(legMesh);
    const s = cfg.feet.size * H;
    [-0.42, 0, 0.42].forEach((ang) => {
      const toe = new THREE.Mesh(keep(new THREE.CapsuleGeometry(0.024 * s, 0.1 * s, 6, 12)), footMat);
      toe.rotation.set(Math.PI / 2 - 0.08, 0, 0);
      toe.position.set(0, 0, 0.065 * s);
      const pivot = new THREE.Group();
      pivot.rotation.y = ang + side * 0.12;
      pivot.add(toe);
      foot.add(pivot);
    });
    const back = new THREE.Mesh(keep(new THREE.CapsuleGeometry(0.02 * s, 0.04 * s, 6, 10)), footMat);
    back.rotation.set(Math.PI / 2 + 0.2, 0, 0);
    back.position.set(0, 0.004, -0.04 * s);
    foot.add(back);
  });

  // ---- Crest --------------------------------------------------------------
  const C = cfg.crest;
  const featherMat = (color: string, tip: string, tipFrom: number) =>
    keep(
      new THREE.ShaderMaterial({
        vertexShader: FEATHER_VERT,
        fragmentShader: FEATHER_FRAG,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uTip: { value: new THREE.Color(tip) },
          uTipFrom: { value: tipFrom },
          uLightDir: { value: lights.dirs },
          uLightCol: { value: lights.colors },
          uSky: { value: lights.sky },
        },
        side: THREE.DoubleSide,
        alphaToCoverage: true,
      }),
    );
  const crestHolder = new THREE.Group();
  crestHolder.quaternion.setFromUnitVectors(new V3(0, 1, 0), crown.n.clone().lerp(new V3(0, 1, 0), 0.5).normalize());
  crestBone.add(crestHolder);
  if (C.kind === "quill") {
    const f = new THREE.Mesh(keep(featherGeometry(C.size * H, 0.12 * H, 0.35, 0.42)), featherMat(C.color, C.tip, 0.78));
    f.rotation.set(-0.42, 0.55, 0.12);
    crestHolder.add(f);
  } else if (C.kind === "sleek") {
    [-0.32, 0, 0.32].forEach((yaw, i) => {
      const f = new THREE.Mesh(keep(featherGeometry(C.size * H * (i === 1 ? 1 : 0.8), 0.07 * H, 0.1, 0.9, 0.9)), featherMat(C.color, C.tip, 0.86));
      f.rotation.set(-1.15 + Math.abs(yaw) * 0.3, yaw, yaw * 0.5);
      crestHolder.add(f);
    });
  } else if (C.kind === "tuft") {
    // A wild cowlick: four thin, curly plumes fanning out.
    [
      [-0.5, 0.15, 0.85, -0.9],
      [0.05, -0.1, 1.0, 0.7],
      [0.45, 0.2, 0.78, 1.1],
      [-0.1, 0.5, 0.65, -0.5],
    ].forEach(([yaw, pitch, scale, curl], i) => {
      const f = new THREE.Mesh(keep(featherGeometry(C.size * H * scale, 0.05 * H, curl * 1.6, 0.25 + 0.15 * i, 1)), featherMat(C.color, C.tip, 0.55));
      f.rotation.set(-0.15 + pitch, yaw, yaw * 0.6);
      crestHolder.add(f);
    });
  }

  // ---- Pose ---------------------------------------------------------------
  const rest = new Map<THREE.Object3D, { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 }>();
  root.traverse((o) => rest.set(o, { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }));
  const reset = (o: THREE.Object3D) => {
    const r = rest.get(o)!;
    o.position.copy(r.p);
    o.quaternion.copy(r.q);
    o.scale.copy(r.s);
  };
  const deg = Math.PI / 180;
  // Lid hemispheres rotate about the eye's X axis; a rotation of r degrees puts the
  // lid edge at elevation -r on the front of the eye. Closed: both edges meet ~-36.
  const lidOpenAngle = (rest01: number) => -58 + 70 * rest01; // degrees, upper lid
  const hipTmp = new V3();
  const loAboveBase = worlds.get(lo)!.y - leg;
  const yAxis = new V3(0, 1, 0);
  const setPose = (p: BirdPose, sec: Secondary = NO_SECONDARY) => {
    root.traverse(reset);
    // Squash and stretch with volume preservation, centred low on the body.
    const sy = 1 + p.stretch;
    const sxz = 1 / Math.sqrt(Math.max(0.2, sy));
    lo.scale.set(sxz, sy, sxz);
    // Pivot the squash at the body's base (it sits on the hips), not at the bone.
    lo.position.y -= loAboveBase * (1 - sy);
    // Lean, tilt and twist spread over the bend chain (lo -> mid -> hi).
    lo.rotation.set(p.lean * 0.25 * deg, 0, -p.tilt * 0.2 * deg);
    mid.rotation.set(p.lean * 0.35 * deg, p.twist * 0.4 * deg, -p.tilt * 0.35 * deg);
    hi.rotation.set(p.lean * 0.4 * deg, p.twist * 0.6 * deg, -p.tilt * 0.45 * deg);
    eyeParts.forEach((e, k) => {
      const side = k === 0 ? -1 : 1;
      const blink = k === 0 ? p.blinkL : p.blinkR;
      const tilt = k === 0 ? p.lidTiltL : p.lidTiltR;
      e.eye.rotation.set(-p.lookY * 22 * deg, p.lookX * 28 * deg, 0);
      const restAngle = lidOpenAngle(E.lidRest) - p.lidOpen * 26;
      const b01 = Math.max(0, Math.min(1, blink));
      // Upper lid follows the gaze vertically (it is what makes looks read).
      const upper = restAngle + (36 - restAngle) * b01 - p.lookY * 10 * (1 - b01);
      // Positive tilt raises the inner corner (worried), negative drops it (angry).
      e.lidU.rotation.set(upper * deg, 0, -side * tilt * 18 * deg);
      const lower = 64 - 44 * p.squint - 26 * b01 + p.lookY * 6;
      e.lidL.rotation.set(lower * deg, 0, side * tilt * 5 * deg);
      e.pupil.scale.setScalar(p.pupil);
    });
    beakLo.rotation.x = p.beakOpen * 28 * deg;
    wingParts.forEach((w) => {
      const l = w.side < 0;
      const raise = (l ? p.wingL : p.wingR) + sec.wingLag;
      const swing = l ? p.wingSwingL : p.wingSwingR;
      const twist = l ? p.wingTwistL : p.wingTwistR;
      w.bone.rotation.set(-swing * 70 * deg, 0, w.side * raise * 100 * deg);
      w.holder.rotateY(-w.side * twist * 70 * deg);
    });
    crestBone.rotation.set(p.crest * 0.6 + sec.crestPitch, 0, -sec.crestRoll);

    // Legs: hips ride the body, feet stay where the animator put them.
    root.updateMatrixWorld(true);
    legBones.forEach((lb, k) => {
      const l = lb.side < 0;
      const step = l ? p.stepL : p.stepR;
      const lift = l ? p.liftL : p.liftR;
      lo.localToWorld(hipTmp.copy(lb.hipInLo));
      root.worldToLocal(hipTmp);
      lb.bone.position.copy(hipTmp);
      lb.foot.position.copy(lb.footRest).add(new V3(0, lift * 0.2 * H, step * 0.22 * H));
      lb.foot.rotation.x = lift * 0.5;
      const m = legMeshes[k];
      const d = hipTmp.clone().sub(lb.foot.position);
      m.position.copy(lb.foot.position).addScaledVector(d, 0.5);
      m.quaternion.setFromUnitVectors(yAxis, d.clone().normalize());
      m.scale.set(1, d.length() / legRestLen, 1);
    });

    shellMat.uniforms.uFluff.value = p.fluff;
    strandMat.uniforms.uFluff.value = p.fluff;
    (shellMat.uniforms.uWind.value as THREE.Vector3).set(...sec.wind);
    (strandMat.uniforms.uWind.value as THREE.Vector3).set(...sec.wind);
  };
  setPose(REST_POSE);

  const totalHeight = leg + H + (C.kind === "quill" ? C.size * H * 0.75 : 0.15 * H);
  return {
    group,
    height: totalHeight,
    centre: new V3(0, leg + H * 0.5, 0),
    furMaterials: [shellMat],
    strandMaterials: [strandMat],
    setPose,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
};
