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
  // Potrace writes outer contours and holes with opposite winding; since
  // three r18x, toShapes() detects hole winding by itself.
  return sp.toShapes();
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

const buildCore = (L: LogoData): Model[] => [
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

const CORE_IDS = [
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

// ===========================================================================
// 3D icon set: the 18 line icons as ink tubes on paper tiles
// ===========================================================================

type Poly = { pts: THREE.Vector3[]; closed: boolean };

/** Converts 18-unit SVG icon markup (rect, circle, path with M/L/H/V/C/Z) to polylines. */
const iconPolylines = (markup: string): Poly[] => {
  const out: Poly[] = [];
  const v = (x: number, y: number) => new THREE.Vector3((x - 9) / 18, -(y - 9) / 18, 0);
  const attr = (el: string, name: string) => Number(el.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1] ?? 0);
  for (const el of markup.match(/<(rect|circle|path)[^>]*>/g) ?? []) {
    if (el.startsWith("<circle")) {
      const cx = attr(el, "cx");
      const cy = attr(el, "cy");
      const r = attr(el, "r");
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 48; i++) pts.push(v(cx + Math.cos((i / 48) * Math.PI * 2) * r, cy + Math.sin((i / 48) * Math.PI * 2) * r));
      out.push({ pts, closed: true });
    } else if (el.startsWith("<rect")) {
      const x = attr(el, "x");
      const y = attr(el, "y");
      const w = attr(el, "width");
      const h = attr(el, "height");
      const r = Math.min(attr(el, "rx"), w / 2, h / 2);
      const pts: THREE.Vector3[] = [];
      const corner = (cx: number, cy: number, a0: number) => {
        for (let i = 0; i <= 6; i++) {
          const a = a0 + (i / 6) * (Math.PI / 2);
          pts.push(v(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
        }
      };
      corner(x + w - r, y + r, -Math.PI / 2);
      corner(x + w - r, y + h - r, 0);
      corner(x + r, y + h - r, Math.PI / 2);
      corner(x + r, y + r, Math.PI);
      out.push({ pts, closed: true });
    } else {
      const d = el.match(/\bd="([^"]+)"/)?.[1] ?? "";
      const tokens = d.match(/[MLHVCZ]|-?\d*\.?\d+/g) ?? [];
      let i = 0;
      let cmd = "M";
      let x = 0;
      let y = 0;
      let cur: Poly | null = null;
      const n = () => Number(tokens[i++]);
      while (i < tokens.length) {
        if (/[MLHVCZ]/.test(tokens[i])) {
          cmd = tokens[i++];
          if (cmd === "Z" && cur) cur.closed = true;
          continue;
        }
        if (cmd === "M") {
          x = n();
          y = n();
          cur = { pts: [v(x, y)], closed: false };
          out.push(cur);
          cmd = "L";
        } else if (cmd === "L") {
          x = n();
          y = n();
          cur?.pts.push(v(x, y));
        } else if (cmd === "H") {
          x = n();
          cur?.pts.push(v(x, y));
        } else if (cmd === "V") {
          y = n();
          cur?.pts.push(v(x, y));
        } else if (cmd === "C") {
          const x1 = n();
          const y1 = n();
          const x2 = n();
          const y2 = n();
          const x3 = n();
          const y3 = n();
          for (let k = 1; k <= 10; k++) {
            const t = k / 10;
            const u = 1 - t;
            cur?.pts.push(
              v(
                u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
                u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
              ),
            );
          }
          x = x3;
          y = y3;
        } else i++;
      }
    }
  }
  return out;
};

/** Tube geometry along a polyline; corners stay crisp, joints and ends are rounded. */
const polyTube = (poly: Poly, r: number): THREE.BufferGeometry[] => {
  const pts = poly.closed ? [...poly.pts, poly.pts[0]] : poly.pts;
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 0; i < pts.length - 1; i++) {
    if (pts[i].distanceTo(pts[i + 1]) > 1e-6) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
  }
  const segs = Math.max(8, path.curves.length * 4);
  const geos: THREE.BufferGeometry[] = [new THREE.TubeGeometry(path as unknown as THREE.Curve<THREE.Vector3>, segs, r, 12, false)];
  for (const p of poly.closed ? poly.pts : pts) {
    const s = new THREE.SphereGeometry(r, 12, 8);
    s.translate(p.x, p.y, p.z);
    geos.push(s);
  }
  return geos;
};

export const icon3d = (name: string, markup: string, accent = false): Model => {
  const S = 1.3;
  const D = 0.16;
  const r = (0.8 / 18) * 0.9 * 0.85;
  const parts: Part[] = [{ name: "tile", geometry: slab(S, S, D, 0.3, 0.03), material: "paperBright" }];
  iconPolylines(markup).forEach((poly, i) =>
    polyTube(poly, r).forEach((g, j) => {
      g.scale(0.85, 0.85, 1);
      parts.push({ name: `stroke-${i}-${j}`, geometry: g, material: accent ? "sanguine" : "ink", position: [0, 0, D / 2 + r * 0.85] });
    }),
  );
  return { id: `icon3d-${name}`, title: `3D icon: ${name}`, parts };
};

// ===========================================================================
// Devices and objects for explainers and ads
// ===========================================================================

type V3 = [number, number, number];

export const laptop = (): Model => {
  const W = 1.6;
  const Dp = 1.05;
  const T = 0.05;
  const base = slab(W, Dp, T, 0.06);
  base.rotateX(-Math.PI / 2);
  const lidParts: Part[] = [
    { name: "lid", geometry: slab(W, Dp, 0.035, 0.06), material: "zinc" },
    { name: "screen", geometry: slab(W - 0.1, Dp - 0.1, 0.004, 0.03, 0), material: "glass", position: [0, 0, 0.02] },
    { name: "ui-bar", geometry: box(1.2, 0.05, 0.004), material: "white", position: [0, 0.35, 0.024] },
    { name: "ui-block", geometry: box(0.6, 0.32, 0.004), material: "taupe", position: [0.25, 0.0, 0.024] },
    { name: "ui-text", geometry: box(0.42, 0.06, 0.004), material: "white", position: [-0.38, 0.1, 0.024] },
    { name: "ui-text-2", geometry: box(0.32, 0.06, 0.004), material: "white", position: [-0.43, -0.02, 0.024] },
    { name: "ui-button", geometry: slab(0.22, 0.07, 0.006, 0.035, 0), material: "sanguine", position: [-0.48, -0.18, 0.026] },
  ];
  const rot = new THREE.Matrix4().makeRotationX(-Math.PI * 0.08);
  const parts: Part[] = [
    { name: "base", geometry: base, material: "zinc" },
    { name: "keys", geometry: box(W - 0.24, 0.004, Dp * 0.42), material: "inkMatte", position: [0, T / 2 + 0.002, -0.12] },
    { name: "pad", geometry: box(0.5, 0.003, 0.28), material: "rule", position: [0, T / 2 + 0.002, 0.3] },
  ];
  for (const p of lidParts) {
    const g = p.geometry.clone();
    const [px, py, pz] = p.position ?? [0, 0, 0];
    g.translate(px, py + Dp / 2, pz);
    g.applyMatrix4(rot);
    g.translate(0, T / 2, -Dp / 2);
    parts.push({ name: p.name, geometry: g, material: p.material });
  }
  return { id: "laptop", title: "Laptop", parts };
};

export const monitor = (): Model => ({
  id: "monitor",
  title: "Desktop monitor",
  parts: [
    { name: "frame", geometry: slab(2.0, 1.2, 0.06, 0.04), material: "inkMatte", position: [0, 0.75, 0] },
    { name: "screen", geometry: slab(1.92, 1.12, 0.004, 0.02, 0), material: "white", position: [0, 0.75, 0.032] },
    { name: "ui-headline", geometry: box(0.8, 0.09, 0.006), material: "ink", position: [-0.4, 0.95, 0.036] },
    { name: "ui-headline-2", geometry: box(0.6, 0.09, 0.006), material: "ink", position: [-0.5, 0.83, 0.036] },
    { name: "ui-image", geometry: slab(0.72, 0.62, 0.006, 0.03, 0), material: "taupe", position: [0.5, 0.75, 0.036] },
    { name: "ui-button", geometry: slab(0.3, 0.08, 0.008, 0.04, 0), material: "sanguine", position: [-0.62, 0.62, 0.038] },
    { name: "neck", geometry: box(0.12, 0.42, 0.06), material: "zinc", position: [0, 0.0, -0.06] },
    { name: "foot", geometry: slab(0.7, 0.36, 0.03, 0.08).rotateX(-Math.PI / 2), material: "zinc", position: [0, -0.2, 0] },
  ],
});

export const tablet = (): Model => ({
  id: "tablet",
  title: "Tablet",
  parts: [
    { name: "body", geometry: slab(1.1, 1.5, 0.05, 0.08), material: "ink" },
    { name: "screen", geometry: slab(1.02, 1.42, 0.004, 0.05, 0), material: "white", position: [0, 0, 0.026] },
    { name: "chart-1", geometry: box(0.12, 0.3, 0.02), material: "taupeLight", position: [-0.3, -0.4, 0.04] },
    { name: "chart-2", geometry: box(0.12, 0.45, 0.02), material: "taupe", position: [-0.12, -0.33, 0.04] },
    { name: "chart-3", geometry: box(0.12, 0.62, 0.02), material: "ink", position: [0.06, -0.24, 0.04] },
    { name: "chart-4", geometry: box(0.12, 0.82, 0.02), material: "sanguine", position: [0.24, -0.14, 0.04] },
    { name: "title", geometry: box(0.5, 0.06, 0.006), material: "ink", position: [-0.17, 0.55, 0.03] },
  ],
});

export const chatBubble = (): Model => {
  const shape = roundedRect(1.4, 0.8, 0.3);
  const tail = new THREE.Shape();
  tail.moveTo(-0.45, -0.36);
  tail.lineTo(-0.62, -0.62);
  tail.lineTo(-0.2, -0.36);
  tail.closePath();
  const g = new THREE.ExtrudeGeometry([shape, tail], {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 4,
    curveSegments: 12,
  });
  g.translate(0, 0, -0.06);
  g.computeVertexNormals();
  return {
    id: "chat-bubble",
    title: "Chat bubble (AI assistant)",
    parts: [
      { name: "bubble", geometry: g, material: "paperBright" },
      ...[-0.3, 0, 0.3].map((x, i) => ({
        name: `dot-${i}`,
        geometry: new THREE.SphereGeometry(0.08, 24, 16),
        material: (i === 2 ? "sanguine" : "ink") as MaterialName,
        position: [x, 0, 0.1] as V3,
      })),
    ],
  };
};

export const cursor = (): Model => {
  const s = new THREE.Shape();
  const P: Array<[number, number]> = [[0, 0], [0, -1.0], [0.24, -0.78], [0.42, -1.15], [0.56, -1.08], [0.38, -0.72], [0.7, -0.7]];
  s.moveTo(P[0][0], P[0][1]);
  for (const p of P.slice(1)) s.lineTo(p[0], p[1]);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 4 });
  g.translate(-0.35, 0.55, -0.05);
  g.computeVertexNormals();
  return { id: "cursor", title: "Cursor", parts: [{ name: "arrow", geometry: g, material: "ink" }] };
};

export const database = (): Model => ({
  id: "database",
  title: "Database",
  parts: [0, 1, 2].flatMap((i): Part[] => [
    { name: `disc-${i}`, geometry: new THREE.CylinderGeometry(0.6, 0.6, 0.3, 64), material: i === 2 ? "ink" : "inkMatte", position: [0, i * 0.36 - 0.36, 0] },
    { name: `band-${i}`, geometry: new THREE.TorusGeometry(0.6, 0.012, 8, 96).rotateX(Math.PI / 2), material: "nightEdge", position: [0, i * 0.36 - 0.36 + 0.15, 0] },
    { name: `led-${i}`, geometry: new THREE.SphereGeometry(0.035, 16, 12), material: i === 1 ? "sanguineGlow" : "nightEdge", position: [0.42, i * 0.36 - 0.36, 0.43] },
  ]),
});

export const cloud = (): Model => {
  const puffs: Array<[number, number, number, number]> = [[-0.45, -0.05, 0, 0.32], [0, 0.12, 0, 0.45], [0.42, 0.0, 0, 0.34], [-0.15, -0.18, 0.1, 0.3], [0.2, -0.18, 0.1, 0.3]];
  return {
    id: "cloud",
    title: "Cloud",
    parts: [
      ...puffs.map(([x, y, z, r], i): Part => ({ name: `puff-${i}`, geometry: new THREE.SphereGeometry(r, 48, 32), material: "paperBright", position: [x, y, z] })),
      { name: "base", geometry: slab(1.3, 0.3, 0.5, 0.15, 0.03), material: "paperBright", position: [0, -0.22, 0] },
    ],
  };
};

export const terminal = (): Model => {
  const lines: Array<[number, MaterialName]> = [[0.5, "sanguine"], [0.9, "zinc"], [0.7, "zinc"], [0.4, "white"], [0.85, "zinc"]];
  return {
    id: "terminal",
    title: "Code / terminal window",
    parts: [
      { name: "window", geometry: slab(1.6, 1.0, 0.05, 0.05), material: "nightCard" },
      { name: "bar", geometry: box(1.56, 0.003, 0.003), material: "nightEdge", position: [0, 0.39, 0.026] },
      ...[0, 1, 2].map((i): Part => ({
        name: `dot-${i}`,
        geometry: new THREE.CylinderGeometry(0.018, 0.018, 0.006, 16).rotateX(Math.PI / 2),
        material: i === 0 ? "sanguine" : "zinc",
        position: [-0.7 + i * 0.05, 0.44, 0.03],
      })),
      ...lines.map(([w, m], i): Part => ({ name: `code-${i}`, geometry: box(w, 0.045, 0.008), material: m, position: [-0.7 + w / 2 + (i % 2 ? 0.08 : 0), 0.24 - i * 0.12, 0.03] })),
      { name: "caret", geometry: box(0.03, 0.07, 0.012), material: "sanguineGlow", position: [-0.25, -0.38, 0.032] },
    ],
  };
};

export const checkBadge = (markup: string): Model => {
  const tubes = iconPolylines(markup)
    .filter((p) => !p.closed)
    .flatMap((p) => polyTube(p, 0.05));
  tubes.forEach((g) => g.scale(1.1, 1.1, 1));
  return {
    id: "check-badge",
    title: "Check badge (done / shipped)",
    parts: [
      { name: "disc", geometry: new THREE.CylinderGeometry(0.6, 0.6, 0.14, 96).rotateX(Math.PI / 2), material: "sanguine" },
      { name: "rim", geometry: new THREE.TorusGeometry(0.6, 0.025, 12, 96), material: "sanguine" },
      ...tubes.map((g, i): Part => ({ name: `check-${i}`, geometry: g, material: "paperBright", position: [0, 0, 0.09] })),
    ],
  };
};

export const notification = (): Model => ({
  id: "notification",
  title: "Notification card",
  parts: [
    { name: "card", geometry: slab(1.5, 0.42, 0.06, 0.12), material: "paperBright" },
    { name: "icon", geometry: slab(0.26, 0.26, 0.04, 0.07, 0.008), material: "ink", position: [-0.54, 0, 0.04] },
    { name: "title", geometry: box(0.62, 0.055, 0.008), material: "ink", position: [-0.04, 0.07, 0.034] },
    { name: "body", geometry: box(0.82, 0.04, 0.006), material: "zinc", position: [0.06, -0.06, 0.033] },
    { name: "badge", geometry: new THREE.SphereGeometry(0.06, 24, 16), material: "sanguine", position: [0.7, 0.2, 0.04] },
  ],
});

export const toggle = (): Model => ({
  id: "toggle",
  title: "Toggle switch (on)",
  parts: [
    { name: "track", geometry: slab(1.0, 0.5, 0.14, 0.25, 0.03), material: "sanguine" },
    { name: "knob", geometry: new THREE.SphereGeometry(0.2, 48, 32).scale(1, 1, 0.7), material: "paperBright", position: [0.24, 0, 0.1] },
  ],
});

export const barChart = (): Model => {
  const h = [0.35, 0.55, 0.5, 0.8, 1.15];
  return {
    id: "bar-chart",
    title: "Bar chart (illustrative)",
    parts: [
      { name: "base", geometry: slab(1.7, 0.7, 0.06, 0.08).rotateX(-Math.PI / 2), material: "paper" },
      ...h.map((v, i): Part => ({
        name: `bar-${i}`,
        geometry: slab(0.22, v, 0.22, 0.03, 0.01),
        material: i === h.length - 1 ? "sanguine" : i === h.length - 2 ? "ink" : "taupe",
        position: [-0.6 + i * 0.3, v / 2 + 0.03, 0],
      })),
    ],
  };
};

// ===========================================================================
// Catalogue
// ===========================================================================

export const ICON_ACCENT = new Set(["ai-agent", "lightning", "check"]);

/** Every model. `icons` is ICON_PATHS from src/three/data/icons.ts. */
export const buildAll = (L: LogoData, icons: Readonly<Record<string, string>>): Model[] => [
  ...buildCore(L),
  laptop(),
  monitor(),
  tablet(),
  chatBubble(),
  cursor(),
  database(),
  cloud(),
  terminal(),
  checkBadge(icons.check),
  notification(),
  toggle(),
  barChart(),
  ...Object.entries(icons).map(([n, m]) => icon3d(n, m, ICON_ACCENT.has(n))),
];

const ICON_NAMES = ["form", "ai-agent", "document", "email", "sheet", "crm", "payments", "check", "arrow", "globe", "mobile", "code", "cloud", "dashboard", "integration", "layers", "lightning", "quill"] as const;

export const MODEL_IDS = [
  ...CORE_IDS,
  "laptop",
  "monitor",
  "tablet",
  "chat-bubble",
  "cursor",
  "database",
  "cloud",
  "terminal",
  "check-badge",
  "notification",
  "toggle",
  "bar-chart",
  ...ICON_NAMES.map((n) => `icon3d-${n}` as const),
] as const;
export type ModelId = (typeof MODEL_IDS)[number];
