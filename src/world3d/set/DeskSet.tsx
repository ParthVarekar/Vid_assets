// "The Desk": the birds' world. A miniature diorama at bird scale
// (1 unit = 10 cm, so real props are 10x their size in metres): the birds
// stand on an open sketchbook on a big wooden desk, with a laptop, books, a
// plant and a desk lamp around them, and a window behind looking out over the
// Arabian Sea and the Bandra-Worli Sea Link.
//
// Coordinates: birds stand on y = 0 (the sketchbook page) and face +z (the
// camera). The window wall is at z = WALL_Z.

import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import type { LightRig } from "../lighting";
import { useProp, useTexture } from "./assets";
import { sketchTexture, skylineTexture, type TimeOfDay } from "./paintings";

/** Real metres -> set units. */
export const SET_SCALE = 10;
/** Desk top height (the sketchbook is 0.12 thick, so pages sit at y = 0). */
export const DESK_Y = -0.12;
export const WALL_Z = -7.2;
/** Window opening in the wall (x0, x1, y0, y1). */
export const WINDOW: [number, number, number, number] = [-3.5, 9.5, 1.4, 14.5];

type Placement = {
  id: string;
  position: [number, number, number];
  yaw?: number;
  /** Extra rotation, degrees [x, y, z] applied before yaw (e.g. lay something flat). */
  tilt?: [number, number, number];
  scale?: number | [number, number, number];
};

// Props from Poly Haven (CC0). Positions are tuned by eye from the camera presets.
export const PROPS: Placement[] = [
  // Desk: widened so the diorama has room; legs are below frame.
  { id: "wooden_table_02", position: [0, DESK_Y - 8, -2.5], scale: [16, 10, 12.5] }, // 0.8 m tall: top at DESK_Y
  { id: "book_encyclopedia_set_01", position: [-5.9, DESK_Y, -1.6], yaw: 90 },
  { id: "potted_plant_02", position: [-6.3, DESK_Y, -5.0], yaw: 20, scale: 7 },
  { id: "desk_lamp_arm_01", position: [-3.4, DESK_Y, -5.6], yaw: 35 },
  { id: "office_notepads", position: [-1.1, DESK_Y, -4.6], yaw: -6, scale: 5 },
  { id: "binder_notebook", position: [5.1, DESK_Y, -0.2], yaw: 14 },
  { id: "ceramic_vase_01", position: [7.6, DESK_Y, -2.4], yaw: 0 },
  { id: "magnifying_glass_01", position: [-4.0, DESK_Y + 0.14, 1.3], yaw: 0, tilt: [-90, 0, 35] },
];

/** A Poly Haven prop, centred on its base (x/z centre, y min = 0), then placed. */
const Prop: React.FC<Placement & { lampOn?: boolean; screen?: THREE.Texture | null; screenGlow?: number }> = ({ id, position, yaw = 0, tilt, scale = SET_SCALE, lampOn, screen, screenGlow = 1 }) => {
  const obj = useProp(id);
  const placed = useMemo(() => {
    if (!obj) return null;
    const inner = new THREE.Group();
    inner.add(obj);
    if (tilt) inner.rotation.set((tilt[0] * Math.PI) / 180, (tilt[1] * Math.PI) / 180, (tilt[2] * Math.PI) / 180);
    inner.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(inner);
    const c = box.getCenter(new THREE.Vector3());
    obj.position.set(-c.x, -box.min.y, -c.z);
    const holder = new THREE.Group();
    holder.add(inner);
    return holder;
  }, [obj, tilt]);
  // Material tweaks (lamp bulb, laptop screen) before the frame is drawn.
  useLayoutEffect(() => {
    if (!obj) return;
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat.name === "desk_lamp_arm_01_light") {
        mat.emissive = new THREE.Color("#FFD9A0");
        mat.emissiveIntensity = lampOn ? 6 : 0;
      }
      if (mat.name === "classic_laptop_screen" && screen) {
        mat.map = screen;
        mat.emissiveMap = screen;
        mat.emissive = new THREE.Color("#FFFFFF");
        mat.emissiveIntensity = 0.9 * screenGlow;
        mat.roughness = 0.25;
        mat.metalness = 0;
        mat.needsUpdate = true;
      }
    });
  }, [obj, lampOn, screen, screenGlow]);
  if (!placed) return null;
  const s = typeof scale === "number" ? ([scale, scale, scale] as [number, number, number]) : scale;
  return <primitive object={placed} position={position} rotation={[0, (yaw * Math.PI) / 180, 0]} scale={s} />;
};

// ---------------------------------------------------------------------------
// Code-built brand props
// ---------------------------------------------------------------------------

/** An open A3 sketchbook with red-chalk wireframes; its pages are the birds' floor. */
const Sketchbook: React.FC = () => {
  const { left, right, coverMat, blockMat } = useMemo(
    () => ({
      left: sketchTexture("left"),
      right: sketchTexture("right"),
      coverMat: new THREE.MeshPhysicalMaterial({ color: "#5B2A24", roughness: 0.85, sheen: 0.5, sheenColor: new THREE.Color("#8A4A3E") }),
      blockMat: new THREE.MeshStandardMaterial({ color: "#EFE6D2", roughness: 0.95 }),
    }),
    [],
  );
  useEffect(() => () => [left, right, coverMat, blockMat].forEach((x) => x.dispose()), [left, right, coverMat, blockMat]);
  const W = 3.0; // one page
  const D = 4.1;
  // Pages dip gently into the gutter.
  const page = (side: -1 | 1) => {
    const g = new THREE.PlaneGeometry(W, D, 40, 4);
    g.rotateX(-Math.PI / 2);
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      const u = (p.getX(i) + W / 2) / W; // 0..1 across the page
      const toGutter = side < 0 ? u : 1 - u;
      p.setY(i, -0.05 * Math.pow(toGutter, 6));
    }
    g.computeVertexNormals();
    g.translate((side * W) / 2, 0, 0);
    return g;
  };
  const geos = useMemo(() => ({ l: page(-1), r: page(1) }), []);
  return (
    <group position={[0, 0, 0.05]}>
      <mesh geometry={geos.l} receiveShadow>
        <meshStandardMaterial map={left} roughness={0.92} />
      </mesh>
      <mesh geometry={geos.r} receiveShadow>
        <meshStandardMaterial map={right} roughness={0.92} />
      </mesh>
      {/* Page blocks and cloth cover. */}
      <mesh position={[-W / 2, -0.055, 0]} receiveShadow castShadow material={blockMat}>
        <boxGeometry args={[W - 0.04, 0.1, D - 0.04]} />
      </mesh>
      <mesh position={[W / 2, -0.055, 0]} receiveShadow castShadow material={blockMat}>
        <boxGeometry args={[W - 0.04, 0.1, D - 0.04]} />
      </mesh>
      <mesh position={[0, -0.112, 0]} receiveShadow castShadow material={coverMat}>
        <boxGeometry args={[W * 2 + 0.16, 0.016, D + 0.16]} />
      </mesh>
    </group>
  );
};

/** ProtoVinci's fountain pen: black lacquer, brass trim, a red cap end. */
const FountainPen: React.FC<{ position: [number, number, number]; yaw: number }> = ({ position, yaw }) => {
  const parts = useMemo(() => {
    const lathe = (pts: Array<[number, number]>) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 32);
    return {
      body: lathe([
        [0, 0],
        [0.055, 0.02],
        [0.065, 0.2],
        [0.066, 0.85],
        [0.06, 0.95],
        [0, 0.97],
      ]),
      grip: lathe([
        [0.06, 0],
        [0.05, 0.18],
        [0.045, 0.24],
        [0, 0.25],
      ]),
      nib: lathe([
        [0.04, 0],
        [0.03, 0.08],
        [0.004, 0.2],
        [0, 0.21],
      ]),
      ring: new THREE.TorusGeometry(0.066, 0.008, 8, 32),
      lacquer: new THREE.MeshPhysicalMaterial({ color: "#121216", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
      brass: new THREE.MeshPhysicalMaterial({ color: "#C9A24A", metalness: 1, roughness: 0.25 }),
      red: new THREE.MeshPhysicalMaterial({ color: "#C4472F", roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }),
    };
  }, []);
  return (
    // Lying on the page, slightly raised by its clip.
    <group position={position} rotation={[0, (yaw * Math.PI) / 180, 0]}>
      <group rotation={[0, 0, Math.PI / 2]} position={[0.62, 0.07, 0]}>
        <mesh geometry={parts.body} material={parts.lacquer} castShadow />
        <mesh geometry={parts.grip} material={parts.lacquer} position={[0, -0.25, 0]} rotation={[Math.PI, 0, 0]} castShadow />
        <mesh geometry={parts.nib} material={parts.brass} position={[0, -0.25, 0]} rotation={[Math.PI, 0, 0]} scale={[1, 1.4, 0.6]} castShadow />
        <mesh geometry={parts.ring} material={parts.brass} position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={parts.ring} material={parts.brass} position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh material={parts.red} position={[0, 0.93, 0]} castShadow>
          <sphereGeometry args={[0.062, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
    </group>
  );
};

/** Keyboard deck texture: black keys on a dark well. */
const keyboardTexture = () => {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 400;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2A2B2F";
  g.fillRect(0, 0, 1024, 400);
  const rows = [14, 14, 13, 12, 11];
  rows.forEach((n, r) => {
    const w = 1024 / 14.6;
    const x0 = (1024 - n * w) / 2;
    for (let i = 0; i < n; i++) {
      g.fillStyle = "#121215";
      g.beginPath();
      g.roundRect(x0 + i * w + 4, 12 + r * 76, w - 8, 66, 8);
      g.fill();
    }
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/**
 * A modern 16" laptop (built in code: the CC0 options were all retro), lid
 * open at 112 degrees, showing a ProtoVinci portfolio site.
 */
const Laptop: React.FC<{ position: [number, number, number]; yaw: number; screen: THREE.Texture; glow: number }> = ({ position, yaw, screen, glow }) => {
  const W = 3.56;
  const D = 2.48;
  const T = 0.16;
  const LID = 2.3;
  const m = useMemo(() => {
    const scr = screen.clone();
    // Cover-fit the image into the 16:10 panel.
    const img = screen.image as { width: number; height: number } | undefined;
    const aspect = img && img.height ? img.width / img.height : 2;
    const panel = (W - 0.24) / (LID - 0.26);
    if (aspect > panel) {
      scr.repeat.set(panel / aspect, 1);
      scr.offset.set((1 - panel / aspect) / 2, 0);
    } else {
      scr.repeat.set(1, aspect / panel);
      scr.offset.set(0, 1 - aspect / panel);
    }
    scr.needsUpdate = true;
    return {
      alu: new THREE.MeshPhysicalMaterial({ color: "#C3C6CC", metalness: 1, roughness: 0.32, clearcoat: 0.2 }),
      bezel: new THREE.MeshPhysicalMaterial({ color: "#0E0E10", roughness: 0.2, clearcoat: 1 }),
      keys: new THREE.MeshStandardMaterial({ map: keyboardTexture(), roughness: 0.6 }),
      pad: new THREE.MeshPhysicalMaterial({ color: "#B4B7BD", metalness: 0.6, roughness: 0.45 }),
      display: new THREE.MeshStandardMaterial({ map: scr, emissiveMap: scr, emissive: new THREE.Color("#FFFFFF"), emissiveIntensity: 0.85 * glow, roughness: 0.15, metalness: 0 }),
      scr,
    };
  }, [screen, glow]);
  useEffect(() => () => Object.values(m).forEach((x) => (x as { dispose: () => void }).dispose()), [m]);
  const open = (112 * Math.PI) / 180;
  return (
    <group position={position} rotation={[0, (yaw * Math.PI) / 180, 0]}>
      {/* Base. */}
      <mesh position={[0, T / 2, 0]} material={m.alu} castShadow receiveShadow>
        <boxGeometry args={[W, T, D]} />
      </mesh>
      <mesh position={[0, T + 0.002, -0.28]} rotation={[-Math.PI / 2, 0, 0]} material={m.keys} receiveShadow>
        <planeGeometry args={[W * 0.86, D * 0.42]} />
      </mesh>
      <mesh position={[0, T + 0.002, 0.68]} rotation={[-Math.PI / 2, 0, 0]} material={m.pad}>
        <planeGeometry args={[1.25, 0.8]} />
      </mesh>
      {/* Lid, hinged at the back edge of the base. */}
      <group position={[0, T, -D / 2]} rotation={[-(open - Math.PI / 2), 0, 0]}>
        <mesh position={[0, LID / 2, -0.03]} material={m.alu} castShadow>
          <boxGeometry args={[W, LID, 0.06]} />
        </mesh>
        <mesh position={[0, LID / 2, 0.002]} material={m.bezel}>
          <planeGeometry args={[W - 0.06, LID - 0.06]} />
        </mesh>
        <mesh position={[0, LID / 2 + 0.03, 0.004]} material={m.display}>
          <planeGeometry args={[W - 0.24, LID - 0.26]} />
        </mesh>
      </group>
    </group>
  );
};

/** A glass inkpot of red ink. */
const Inkpot: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const m = useMemo(
    () => ({
      glass: new THREE.MeshPhysicalMaterial({ color: "#FFFFFF", roughness: 0.05, transmission: 0.92, thickness: 0.15, ior: 1.5, clearcoat: 1 }),
      ink: new THREE.MeshPhysicalMaterial({ color: "#5E1610", roughness: 0.15, clearcoat: 1 }),
      brass: new THREE.MeshPhysicalMaterial({ color: "#C9A24A", metalness: 1, roughness: 0.3 }),
      bottle: new THREE.LatheGeometry(
        [
          [0, 0],
          [0.34, 0],
          [0.36, 0.04],
          [0.36, 0.36],
          [0.3, 0.46],
          [0.14, 0.5],
          [0.14, 0.62],
          [0.12, 0.62],
          [0.12, 0.5],
          [0, 0.5],
        ].map(([r, y]) => new THREE.Vector2(r, y)),
        40,
      ),
    }),
    [],
  );
  return (
    <group position={position}>
      <mesh geometry={m.bottle} material={m.glass} castShadow />
      <mesh material={m.ink} position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.31, 0.31, 0.3, 32]} />
      </mesh>
      {/* The brass cap lies beside the open pot. */}
      <mesh material={m.brass} position={[0.55, 0.07, 0.15]} rotation={[Math.PI / 2, 0, 0.4]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.14, 24]} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Room: wall with window, the view, floor
// ---------------------------------------------------------------------------

const Room: React.FC<{ tod: TimeOfDay }> = ({ tod }) => {
  const view = useMemo(() => skylineTexture(tod), [tod]);
  useEffect(() => () => view.dispose(), [view]);
  const diff = useTexture("3d/textures/beige_wall_001/diff_1k.jpg");
  const nor = useTexture("3d/textures/beige_wall_001/nor_1k.jpg", false);
  const wallMat = useMemo(() => {
    // Warm off-white plaster: keep the texture's relief (normal map) but not its
    // beige-brown colour, which read as a dark brown wall when back-lit.
    const m = new THREE.MeshStandardMaterial({ color: "#EFE6D8", roughness: 0.95 });
    for (const t of [diff, nor]) {
      if (!t) continue;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(6, 4);
    }
    if (nor) {
      m.normalMap = nor;
      m.normalScale = new THREE.Vector2(0.6, 0.6);
    }
    return m;
  }, [diff, nor]);
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2B2A2E", roughness: 0.55 }), []);
  const [x0, x1, y0, y1] = WINDOW;
  const T = 1.2; // wall thickness
  const z = WALL_Z - T / 2;
  const L = -40;
  const R = 40;
  const B = -12;
  const TOP = 34;
  const bar = 0.32;
  return (
    <group>
      {/* Wall around the opening. */}
      <mesh position={[(L + x0) / 2, (B + TOP) / 2, z]} material={wallMat} receiveShadow>
        <boxGeometry args={[x0 - L, TOP - B, T]} />
      </mesh>
      <mesh position={[(x1 + R) / 2, (B + TOP) / 2, z]} material={wallMat} receiveShadow>
        <boxGeometry args={[R - x1, TOP - B, T]} />
      </mesh>
      <mesh position={[(x0 + x1) / 2, (B + y0) / 2, z]} material={wallMat} receiveShadow>
        <boxGeometry args={[x1 - x0, y0 - B, T]} />
      </mesh>
      <mesh position={[(x0 + x1) / 2, (y1 + TOP) / 2, z]} material={wallMat} receiveShadow>
        <boxGeometry args={[x1 - x0, TOP - y1, T]} />
      </mesh>
      {/* Window frame: outer frame, one mullion, one transom. */}
      {[
        [(x0 + x1) / 2, y0 + bar / 2, x1 - x0, bar],
        [(x0 + x1) / 2, y1 - bar / 2, x1 - x0, bar],
        [x0 + bar / 2, (y0 + y1) / 2, bar, y1 - y0],
        [x1 - bar / 2, (y0 + y1) / 2, bar, y1 - y0],
        [(x0 + x1) / 2, (y0 + y1) / 2, bar * 0.8, y1 - y0],
        [(x0 + x1) / 2, y0 + (y1 - y0) * 0.68, x1 - x0, bar * 0.8],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, WALL_Z - T * 0.55]} material={frameMat} castShadow>
          <boxGeometry args={[w, h, 0.35]} />
        </mesh>
      ))}
      {/* Window sill. */}
      <mesh position={[(x0 + x1) / 2, y0 - 0.1, WALL_Z + 0.15]} material={wallMat} receiveShadow castShadow>
        <boxGeometry args={[x1 - x0 + 0.8, 0.22, 0.9]} />
      </mesh>
      {/* The view: far away so depth of field softens it naturally. */}
      {/* Horizon sits low in the window so the sea and the Sea Link show. */}
      <mesh position={[6, 20.8, -60]}>
        <planeGeometry args={[160, 80]} />
        <meshBasicMaterial map={view} toneMapped={false} fog={false} />
      </mesh>
      {/* The rest of the room, for reverse and high shots: side walls, back wall, ceiling. */}
      <mesh position={[-16, 9, 10]} rotation={[0, Math.PI / 2, 0]} material={wallMat} receiveShadow>
        <planeGeometry args={[36, 42]} />
      </mesh>
      <mesh position={[18, 9, 10]} rotation={[0, -Math.PI / 2, 0]} material={wallMat} receiveShadow>
        <planeGeometry args={[36, 42]} />
      </mesh>
      <mesh position={[1, 9, 28]} rotation={[0, Math.PI, 0]} material={wallMat} receiveShadow>
        <planeGeometry args={[36, 42]} />
      </mesh>
      <mesh position={[1, 26, 10]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36, 42]} />
        <meshStandardMaterial color="#E8E1D6" roughness={1} />
      </mesh>
      {/* Floor far below the desk (seen only in high or wide shots). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -8.2, 0]} receiveShadow>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color="#4A3A2C" roughness={0.8} />
      </mesh>
    </group>
  );
};

export const DeskSet: React.FC<{ rig: LightRig }> = ({ rig }) => {
  const tod = rig.set?.timeOfDay ?? "day";
  const screen = useTexture("assets/brand/work/awarddock.webp");
  return (
    <group>
      <Room tod={tod} />
      {PROPS.map((p) => (
        <Prop key={p.id} {...p} lampOn={rig.set?.lampOn} />
      ))}
      <Sketchbook />
      <FountainPen position={[1.4, 0, 1.25]} yaw={-28} />
      <Inkpot position={[5.0, DESK_Y + 0.25, -0.3]} />
      <Laptop position={[3.9, DESK_Y, -3.3]} yaw={-24} screen={screen} glow={rig.set?.screenGlow ?? 1} />
    </group>
  );
};
