// ProtoVinci 3D models, built from code. No modelling software involved.
//
// Every model is a list of parts: a three.js BufferGeometry plus a named
// material. The same builders feed two outputs:
//   - scripts/three/export-glb.mjs writes standard .glb files (Blender, Spline,
//     Unity, Unreal, model-viewer, three.js, Figma plugins...).
//   - src/three/Model.tsx renders them live in React Three Fiber / Remotion.
//
// This file imports only "three" (no project imports), so Node can run it
// directly. Logo path data is passed in rather than imported.
//
// Units: 1 unit = the height of the logo mark. Y is up, the front faces +Z.

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Materials (sRGB hex, physically based)
// ---------------------------------------------------------------------------

export type MaterialSpec = {
  color: string;
  roughness: number;
  metalness: number;
  emissive?: string;
  emissiveIntensity?: number;
};

export const MATERIALS = {
  ink: { color: "#16161B", roughness: 0.3, metalness: 0.35 },
  inkMatte: { color: "#141417", roughness: 0.8, metalness: 0.0 },
  paper: { color: "#EEEBE4", roughness: 0.95, metalness: 0.0 },
  paperBright: { color: "#F7F5F0", roughness: 0.9, metalness: 0.0 },
  white: { color: "#FAFAFA", roughness: 0.55, metalness: 0.0 },
  rule: { color: "#E4E4E7", roughness: 0.7, metalness: 0.0 },
  zinc: { color: "#9898A3", roughness: 0.6, metalness: 0.1 },
  taupe: { color: "#A69A8A", roughness: 0.85, metalness: 0.0 },
  taupeLight: { color: "#DFD8CE", roughness: 0.9, metalness: 0.0 },
  sanguine: { color: "#C4472F", roughness: 0.62, metalness: 0.0 },
  sanguineGlow: { color: "#E8583C", roughness: 0.4, metalness: 0.0, emissive: "#E8583C", emissiveIntensity: 0.6 },
  nightCard: { color: "#18181D", roughness: 0.5, metalness: 0.2 },
  nightEdge: { color: "#D4D4DA", roughness: 0.35, metalness: 0.6 },
  glass: { color: "#1A1A20", roughness: 0.12, metalness: 0.4 },
} satisfies Record<string, MaterialSpec>;

export type MaterialName = keyof typeof MATERIALS;

export type Part = {
  name: string;
  geometry: THREE.BufferGeometry;
  material: MaterialName;
  position?: [number, number, number];
  rotation?: [number, number, number];
};

export type Model = { id: string; title: string; parts: Part[] };

/** Logo data from src/components/logoPath.ts, passed in by the caller. */
export type LogoData = {
  LOGO_VIEWBOX: { x: number; y: number; w: number; h: number };
  QUILL_PATH: string;
  CRADLE_PATH: string;
  CRADLE_CENTRELINE: ReadonlyArray<{ x: number; y: number }>;
  CRADLE_THICKNESS: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parses the absolute M/L/C/Z path data Potrace writes into three.js shapes. */
const pathToShapes = (d: string, toXY: (x: number, y: number) => [number, number]): THREE.Shape[] => {
  const sp = new THREE.ShapePath();
  const tokens = d.match(/[MLCZz]|-?\d+(?:\.\d+)?/g) ?? [];
  let i = 0;
  let cmd = "M";
  const n = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[MLCZz]/.test(t)) {
      cmd = t;
      i++;
      if (cmd === "Z" || cmd === "z") sp.currentPath?.closePath();
      continue;
    }
    if (cmd === "M") {
      sp.moveTo(...toXY(n(), n()));
      cmd = "L";
    } else if (cmd === "L") {
      sp.lineTo(...toXY(n(), n()));
    } else if (cmd === "C") {
      const a = toXY(n(), n());
      const b = toXY(n(), n());
      const c = toXY(n(), n());
      sp.bezierCurveTo(a[0], a[1], b[0], b[1], c[0], c[1]);
    } else {
      i++;
    }
  }
  // Potrace writes outer contours and holes with opposite winding.
  return sp.toShapes(true);
};

/** Rounded rectangle centred on the origin. */
const roundedRect = (w: number, h: number, r: number): THREE.Shape => {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
};

/** A rounded slab: extruded rounded rectangle, front face at z = depth/2. */
const slab = (w: number, h: number, depth: number, r: number, bevel = Math.min(0.012, depth * 0.3)): THREE.BufferGeometry => {
  const g = new THREE.ExtrudeGeometry(roundedRect(w - bevel * 2, h - bevel * 2, Math.max(0.001, r - bevel)), {
    depth: Math.max(0.0005, depth - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 10,
  });
  g.translate(0, 0, -(depth - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
};

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------

const logoTransform = (L: LogoData) => {
  const V = L.LOGO_VIEWBOX;
  const s = 1 / V.h;
  const cx = V.x + V.w / 2;
  const cy = V.y + V.h / 2;
  return (x: number, y: number): [number, number] => [(x - cx) * s, -(y - cy) * s];
};

const extrudeMark = (L: LogoData, d: string, depth: number) => {
  const g = new THREE.ExtrudeGeometry(pathToShapes(d, logoTransform(L)), {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.18,
    bevelSize: 0.004,
    bevelSegments: 3,
    curveSegments: 8,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
};

/** The full mark as a solid, ink. Two-tone puts the cradle in sanguine. */
export const logoMark = (L: LogoData, twoTone = false, depth = 0.09): Model => ({
  id: twoTone ? "logo-mark-two-tone" : "logo-mark",
  title: twoTone ? "Logo mark, two-tone" : "Logo mark",
  parts: [
    { name: "quill", geometry: extrudeMark(L, L.QUILL_PATH, depth), material: "ink" },
    { name: "cradle", geometry: extrudeMark(L, L.CRADLE_PATH, depth), material: twoTone ? "sanguine" : "ink" },
  ],
});

/** The quill alone: the pen that draws the line. */
export const quill = (L: LogoData): Model => ({
  id: "quill",
  title: "Quill",
  parts: [{ name: "quill", geometry: extrudeMark(L, L.QUILL_PATH, 0.07), material: "ink" }],
});

/** The cradle as a round tube: the film's line, in the shape of the logo. */
export const cradleTube = (L: LogoData): Model => {
  const to = logoTransform(L);
  const pts = L.CRADLE_CENTRELINE.map((p) => new THREE.Vector3(...to(p.x, p.y), 0));
  const r = (L.CRADLE_THICKNESS / L.LOGO_VIEWBOX.h) * 0.42;
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const tube = new THREE.TubeGeometry(curve, 180, r, 24, false);
  const cap = (at: THREE.Vector3) => {
    const s = new THREE.SphereGeometry(r, 24, 16);
    s.translate(at.x, at.y, at.z);
    return s;
  };
  return {
    id: "cradle-tube",
    title: "Cradle as a tube",
    parts: [
      { name: "tube", geometry: tube, material: "sanguine" },
      { name: "cap-start", geometry: cap(pts[0]), material: "sanguine" },
      { name: "cap-end", geometry: cap(pts[pts.length - 1]), material: "sanguine" },
    ],
  };
};

/** Logo on a plinth, ready for product-style shots. */
export const logoOnPlinth = (L: LogoData): Model => {
  const mark = logoMark(L, true, 0.1).parts.map((p) => ({ ...p, position: [0, 0.62, 0] as [number, number, number] }));
  const plinth = new THREE.CylinderGeometry(0.42, 0.44, 0.1, 96, 1);
  const top = new THREE.CylinderGeometry(0.405, 0.42, 0.012, 96, 1);
  return {
    id: "logo-plinth",
    title: "Logo on a plinth",
    parts: [
      ...mark,
      { name: "plinth", geometry: plinth, material: "paper", position: [0, 0.05, 0] },
      { name: "plinth-top", geometry: top, material: "taupeLight", position: [0, 0.106, 0] },
    ],
  };
};

// ---------------------------------------------------------------------------
// The line
// ---------------------------------------------------------------------------

/** The red line as a tube along any path of points. */
export const lineTube = (id: string, title: string, points: THREE.Vector3[], radius = 0.012, glow = false): Model => {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const tube = new THREE.TubeGeometry(curve, Math.min(600, Math.max(64, points.length * 24)), radius, 16, false);
  const cap = (p: THREE.Vector3) => {
    const s = new THREE.SphereGeometry(radius, 16, 12);
    s.translate(p.x, p.y, p.z);
    return s;
  };
  const m: MaterialName = glow ? "sanguineGlow" : "sanguine";
  return {
    id,
    title,
    parts: [
      { name: "line", geometry: tube, material: m },
      { name: "cap-a", geometry: cap(points[0]), material: m },
      { name: "cap-b", geometry: cap(points[points.length - 1]), material: m },
    ],
  };
};

/** The "Scale" curve: flat, then exponential climb. */
export const lineClimb = (): Model => {
  const pts: THREE.Vector3[] = [new THREE.Vector3(-1.6, 0, 0)];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push(new THREE.Vector3(-0.8 + t * 2.2, ((Math.exp(2.7 * t) - 1) / (Math.exp(2.7) - 1)) * 1.4, 0));
  }
  return lineTube("line-climb", "Line, growth curve", pts, 0.014, true);
};

/** The "Build" step: along the ground, up and over a window, down and on. */
export const lineStep = (): Model => {
  const p = (x: number, y: number) => new THREE.Vector3(x, y, 0);
  const pts = [p(-1.6, 0), p(-0.75, 0), p(-0.66, 0.06), p(-0.62, 0.2), p(-0.62, 0.95), p(-0.55, 1.05), p(0.55, 1.05), p(0.62, 0.95), p(0.62, 0.2), p(0.66, 0.06), p(0.75, 0), p(1.6, 0)];
  return lineTube("line-step", "Line, step over a window", pts, 0.012);
};

/** A 3D spiral: the line rising through space, for abstract hero shots. */
export const lineHelix = (): Model => {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    const a = t * Math.PI * 5;
    const r = 0.25 + t * 0.35;
    pts.push(new THREE.Vector3(Math.cos(a) * r, t * 1.6 - 0.8, Math.sin(a) * r));
  }
  return lineTube("line-helix", "Line, rising spiral", pts, 0.011, true);
};

// ---------------------------------------------------------------------------
// Devices and interface
// ---------------------------------------------------------------------------

/** Browser window with the film's landing page laid out in relief. */
export const browserWindow = (): Model => {
  const W = 1.6;
  const H = 1.08;
  const D = 0.05;
  const z = D / 2;
  const at = (x: number, y: number, depth = 0.006): [number, number, number] => [x, y, z + depth / 2];
  const bar = 0.11;
  return {
    id: "browser-window",
    title: "Browser window",
    parts: [
      { name: "frame", geometry: slab(W, H, D, 0.045), material: "white" },
      { name: "bar", geometry: box(W - 0.02, 0.004, 0.004), material: "rule", position: [0, H / 2 - bar, z + 0.002] },
      ...[0, 1, 2].map((i) => ({
        name: `dot-${i}`,
        geometry: new THREE.CylinderGeometry(0.014, 0.014, 0.006, 24).rotateX(Math.PI / 2),
        material: "rule" as MaterialName,
        position: at(-W / 2 + 0.06 + i * 0.045, H / 2 - bar / 2),
      })),
      { name: "address", geometry: slab(0.56, 0.05, 0.006, 0.025, 0), material: "rule", position: at(0, H / 2 - bar / 2) },
      { name: "nav-logo", geometry: new THREE.CylinderGeometry(0.022, 0.022, 0.008, 24).rotateX(Math.PI / 2), material: "ink", position: at(-0.7, 0.31, 0.008) },
      { name: "nav-cta", geometry: slab(0.17, 0.05, 0.008, 0.025, 0), material: "ink", position: at(0.66, 0.31, 0.008) },
      { name: "headline-1", geometry: box(0.62, 0.075, 0.012), material: "ink", position: at(-0.4, 0.15, 0.012) },
      { name: "headline-2", geometry: box(0.5, 0.075, 0.012), material: "ink", position: at(-0.46, 0.05, 0.012) },
      { name: "copy-1", geometry: box(0.48, 0.022, 0.006), material: "zinc", position: at(-0.47, -0.06) },
      { name: "copy-2", geometry: box(0.36, 0.022, 0.006), material: "zinc", position: at(-0.53, -0.1) },
      { name: "button", geometry: slab(0.3, 0.075, 0.016, 0.0375, 0.004), material: "ink", position: at(-0.56, -0.21, 0.016) },
      { name: "image", geometry: slab(0.56, 0.62, 0.01, 0.03, 0.002), material: "paper", position: at(0.42, -0.05, 0.01) },
      { name: "image-disc", geometry: new THREE.CylinderGeometry(0.24, 0.24, 0.01, 64, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), material: "taupe", position: at(0.4, -0.355, 0.012) },
      { name: "image-mark", geometry: box(0.04, 0.04, 0.02), material: "ink", position: at(0.55, 0.12, 0.02) },
    ],
  };
};

/** Phone showing the same product. */
export const phone = (): Model => {
  const W = 0.5;
  const H = 1.04;
  const D = 0.06;
  const z = D / 2;
  const at = (x: number, y: number, dz = 0.004): [number, number, number] => [x, y, z + dz];
  return {
    id: "phone",
    title: "Phone",
    parts: [
      { name: "body", geometry: slab(W, H, D, 0.08), material: "ink" },
      { name: "screen", geometry: slab(W - 0.03, H - 0.03, 0.004, 0.066, 0), material: "white", position: [0, 0, z + 0.001] },
      { name: "island", geometry: slab(0.12, 0.03, 0.004, 0.015, 0), material: "ink", position: at(0, H / 2 - 0.05) },
      { name: "headline", geometry: box(0.34, 0.05, 0.008), material: "ink", position: at(-0.03, 0.3) },
      { name: "headline-2", geometry: box(0.26, 0.05, 0.008), material: "ink", position: at(-0.07, 0.23) },
      { name: "image", geometry: slab(0.4, 0.28, 0.006, 0.025, 0), material: "taupe", position: at(0, 0.0) },
      { name: "row-1", geometry: slab(0.4, 0.07, 0.004, 0.02, 0), material: "rule", position: at(0, -0.22) },
      { name: "row-2", geometry: slab(0.4, 0.07, 0.004, 0.02, 0), material: "rule", position: at(0, -0.31) },
      { name: "button", geometry: slab(0.4, 0.07, 0.01, 0.035, 0.002), material: "ink", position: at(0, -0.42, 0.006) },
    ],
  };
};

/** Workflow node: a dark tile with a bright edge, as in the Automate scene. */
export const workflowNode = (): Model => {
  const W = 0.62;
  const H = 0.26;
  const D = 0.08;
  const frame = new THREE.ExtrudeGeometry(
    (() => {
      const s = roundedRect(W, H, 0.07);
      s.holes.push(roundedRect(W - 0.016, H - 0.016, 0.064) as unknown as THREE.Path);
      return s;
    })(),
    { depth: 0.012, bevelEnabled: false, curveSegments: 12 },
  );
  frame.computeVertexNormals();
  return {
    id: "workflow-node",
    title: "Workflow node",
    parts: [
      { name: "tile", geometry: slab(W, H, D, 0.07), material: "nightCard" },
      { name: "edge", geometry: frame, material: "nightEdge", position: [0, 0, D / 2 - 0.004] },
      { name: "icon", geometry: new THREE.OctahedronGeometry(0.045, 0), material: "white", position: [-0.18, 0, D / 2 + 0.02] },
      { name: "label", geometry: box(0.22, 0.03, 0.008), material: "zinc", position: [0.06, 0, D / 2 + 0.004] },
    ],
  };
};

/** Scale unit: the three-node tile that multiplies in the Scale scene. */
export const scaleUnit = (): Model => {
  const S = 0.7;
  const D = 0.08;
  const z = D / 2;
  return {
    id: "scale-unit",
    title: "Scale unit",
    parts: [
      { name: "tile", geometry: slab(S, S, D, 0.12), material: "nightCard" },
      { name: "bar", geometry: new THREE.CylinderGeometry(0.008, 0.008, 0.36, 12).rotateZ(Math.PI / 2), material: "nightEdge", position: [0, 0, z + 0.02] },
      ...[-0.18, 0, 0.18].map((x, i) => ({
        name: `node-${i}`,
        geometry: slab(0.1, 0.1, 0.05, 0.025, 0.006),
        material: (i === 1 ? "sanguineGlow" : "nightEdge") as MaterialName,
        position: [x, 0, z + 0.025] as [number, number, number],
      })),
    ],
  };
};

/** A field of scale units, n x n, for "systems that grow". */
export const scaleField = (n = 5): Model => {
  const unit = scaleUnit();
  const parts: Part[] = [];
  const pitch = 0.82;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * pitch;
      const y = (j - (n - 1) / 2) * pitch;
      const lift = Math.max(0, 1 - Math.hypot(x, y) / (n * pitch * 0.6)) * 0.25;
      for (const p of unit.parts) {
        const [px, py, pz] = p.position ?? [0, 0, 0];
        parts.push({ ...p, name: `${p.name}-${i}-${j}`, position: [x + px, y + py, pz + lift] });
      }
    }
  }
  return { id: "scale-field", title: `Scale field ${n}x${n}`, parts };
};

// ---------------------------------------------------------------------------
// Paper and geometry
// ---------------------------------------------------------------------------

/** A sheet of notebook paper with a soft curl at one corner. */
export const paperSheet = (): Model => {
  const W = 2.1;
  const H = 1.48;
  const g = new THREE.PlaneGeometry(W, H, 60, 40);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Curl lifts the bottom-right corner; a faint sag runs across the middle.
    const u = Math.max(0, (x / W + 0.5 - 0.6) / 0.4);
    const v = Math.max(0, (0.5 - y / H - 0.55) / 0.45);
    const curl = Math.pow(u * v, 1.6) * 0.32;
    pos.setZ(i, curl + Math.sin((x / W) * Math.PI) * 0.01);
  }
  g.computeVertexNormals();
  const back = g.clone();
  back.scale(1, 1, 1);
  back.translate(0, 0, -0.002);
  back.index && back.setIndex(Array.from(back.index.array).reverse());
  back.computeVertexNormals();
  // Construction marks printed on the sheet.
  const ring = new THREE.TorusGeometry(0.62, 0.0035, 6, 180, Math.PI * 0.62);
  ring.rotateZ(Math.PI * 0.5);
  return {
    id: "paper-sheet",
    title: "Paper sheet",
    parts: [
      { name: "front", geometry: g, material: "paper" },
      { name: "back", geometry: back, material: "paperBright" },
      { name: "arc", geometry: ring, material: "taupe", position: [-0.45, -0.5, 0.004] },
      { name: "rule-h", geometry: box(W * 0.9, 0.006, 0.002), material: "taupe", position: [0, 0.48, 0.004] },
      { name: "rule-v", geometry: box(0.006, H * 0.9, 0.002), material: "taupe", position: [0.55, 0, 0.004] },
      { name: "square", geometry: box(0.05, 0.05, 0.006), material: "taupe", position: [0.82, -0.2, 0.006] },
    ],
  };
};

/** Construction geometry as objects: ring, rules and blocks, as on the brand's LinkedIn cover. */
export const constructionSet = (): Model => ({
  id: "construction-set",
  title: "Construction geometry",
  parts: [
    { name: "ring", geometry: new THREE.TorusGeometry(0.8, 0.008, 12, 240), material: "taupe" },
    { name: "disc", geometry: new THREE.CylinderGeometry(0.62, 0.62, 0.04, 128).rotateX(Math.PI / 2), material: "taupeLight", position: [0, 0, -0.06] },
    { name: "rule-h", geometry: box(2.2, 0.01, 0.01), material: "taupe", position: [0, 0.5, 0] },
    { name: "rule-v", geometry: box(0.01, 2.0, 0.01), material: "taupe", position: [0.66, 0, 0] },
    { name: "block-ink", geometry: box(0.12, 0.12, 0.12), material: "ink", position: [0.66, 0.5, 0.06] },
    { name: "block-paper", geometry: box(0.09, 0.09, 0.09), material: "paperBright", position: [0.95, -0.42, 0.05] },
    { name: "block-sanguine", geometry: box(0.07, 0.07, 0.07), material: "sanguine", position: [-0.92, 0.72, 0.035] },
  ],
});

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export const buildAll = (L: LogoData): Model[] => [
  logoMark(L),
  logoMark(L, true),
  quill(L),
  cradleTube(L),
  logoOnPlinth(L),
  lineClimb(),
  lineStep(),
  lineHelix(),
  browserWindow(),
  phone(),
  workflowNode(),
  scaleUnit(),
  scaleField(),
  paperSheet(),
  constructionSet(),
];

export const MODEL_IDS = [
  "logo-mark",
  "logo-mark-two-tone",
  "quill",
  "cradle-tube",
  "logo-plinth",
  "line-climb",
  "line-step",
  "line-helix",
  "browser-window",
  "phone",
  "workflow-node",
  "scale-unit",
  "scale-field",
  "paper-sheet",
  "construction-set",
] as const;
export type ModelId = (typeof MODEL_IDS)[number];
