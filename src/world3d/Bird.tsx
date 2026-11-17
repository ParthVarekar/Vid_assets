// A bird in an R3F scene. Builds once per config; the pose is applied on every
// render, so the bird is a pure function of the props (Remotion-safe).

import { useThree } from "@react-three/fiber";
import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import type { Secondary } from "./anim/evaluate";
import { buildBird, REST_POSE, type BirdPose } from "./characters/buildBird";
import { BIRDS, type BirdId } from "./characters/config";
import { furLightsFor, type LightRig } from "./lighting";
import { useHDR } from "./set/assets";

export type BirdProps = {
  id: BirdId;
  rig: LightRig;
  /** Rig values (see rig/schema.ts); missing channels use their defaults. x/y/z/yaw place the bird. */
  pose?: Partial<Record<string, number>>;
  /** Follow-through and wind from anim/evaluate.ts. */
  secondary?: Secondary;
  /** Extra placement on top of the pose's x/y/z (e.g. lineup spacing). */
  position?: [number, number, number];
  /** Extra facing, degrees around Y (0 faces the camera at +Z). */
  yaw?: number;
  quality?: "final" | "preview";
};

export const Bird: React.FC<BirdProps> = ({ id, rig, pose, secondary, position = [0, 0, 0], yaw = 0, quality = "final" }) => {
  const lights = useMemo(() => furLightsFor(rig), [rig]);
  const bird = useMemo(() => buildBird(BIRDS[id], lights, quality), [id, lights, quality]);
  useEffect(() => () => bird.dispose(), [bird]);

  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);

  // Pose and per-frame uniforms, before the frame is drawn.
  useLayoutEffect(() => {
    bird.setPose(full, secondary);
    const px = (2 * Math.tan(((camera.fov ?? 30) * Math.PI) / 360)) / (size.height * gl.getPixelRatio());
    for (const m of bird.strandMaterials) m.uniforms.uPixel.value = px;
  });

  const full: BirdPose = { ...REST_POSE };
  for (const k in pose) if (pose[k] !== undefined) full[k] = pose[k]!;
  return (
    <group position={[position[0] + full.x, position[1] + full.y, position[2] + full.z]} rotation={[0, ((yaw + full.yaw) * Math.PI) / 180, 0]}>
      <primitive object={bird.group} />
    </group>
  );
};

/**
 * A photo-studio environment for reflections: a dim gradient room with one
 * softbox per rig light. The softboxes are what make crisp catchlights in the
 * eyes and clean highlights on the beak and glasses.
 */
const studioEnvironment = (rig: LightRig) => {
  const scene = new THREE.Scene();
  const room = new THREE.SphereGeometry(20, 32, 16);
  const cols: number[] = [];
  const pos = room.getAttribute("position");
  const top = new THREE.Color(rig.sky).multiplyScalar(0.55);
  const bottom = new THREE.Color(rig.ground).multiplyScalar(0.12);
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.smoothstep(pos.getY(i) / 20, -0.4, 0.8);
    const c = bottom.clone().lerp(top, t);
    cols.push(c.r, c.g, c.b);
  }
  room.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  scene.add(new THREE.Mesh(room, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  rig.lights.forEach((l, i) => {
    const dir = new THREE.Vector3(...l.from).normalize();
    // Key gets a big rectangular softbox; the others get narrow strips.
    const w = i === 0 ? 5 : 1.6;
    const h = i === 0 ? 3.6 : 6;
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(l.color).multiplyScalar(l.intensity * 2.2), side: THREE.DoubleSide }),
    );
    panel.position.copy(dir.multiplyScalar(14));
    panel.lookAt(0, 0, 0);
    scene.add(panel);
  });
  return scene;
};

/**
 * Standard lights matching a rig, plus an environment for reflections: the
 * rig's HDRI when it has one (the Desk), else the softbox studio.
 * The rig's shadow light casts soft shadows across the set.
 */
export const RigLights: React.FC<{ rig: LightRig }> = ({ rig }) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const hdr = useHDR(rig.hdri ?? "");
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    let tex: THREE.Texture;
    if (rig.hdri && hdr) {
      tex = pm.fromEquirectangular(hdr).texture;
    } else {
      const envScene = studioEnvironment(rig);
      tex = pm.fromScene(envScene, 0.0).texture;
      envScene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        }
      });
    }
    pm.dispose();
    return tex;
  }, [gl, rig, hdr]);
  useLayoutEffect(() => {
    scene.environment = env;
    scene.environmentIntensity = rig.envIntensity;
    gl.toneMapping = rig.toneMapping === "agx" ? THREE.AgXToneMapping : THREE.NeutralToneMapping;
    gl.toneMappingExposure = rig.exposure;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFShadowMap; // r187: soft PCF is PCF + shadow.radius
    return () => {
      scene.environment = null;
    };
  }, [env, scene, gl, rig]);
  useEffect(() => () => env.dispose(), [env]);
  return (
    <>
      <hemisphereLight args={[rig.sky, rig.ground, rig.ambient]} />
      {rig.lights.map((l, i) => {
        const shadow = rig.shadowLight === i;
        const p = new THREE.Vector3(...l.from).normalize().multiplyScalar(30);
        return (
          <directionalLight
            key={i}
            position={[p.x, p.y, p.z]}
            color={l.color}
            intensity={l.intensity}
            castShadow={shadow}
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0004}
            shadow-normalBias={0.03}
            shadow-radius={6}
            shadow-camera-left={-12}
            shadow-camera-right={12}
            shadow-camera-top={12}
            shadow-camera-bottom={-12}
            shadow-camera-near={1}
            shadow-camera-far={70}
          />
        );
      })}
      {(rig.points ?? []).map((p, i) => (
        <pointLight key={`p${i}`} position={p.position} color={p.color} intensity={p.intensity} distance={p.distance} decay={2} />
      ))}
    </>
  );
};

/** Soft contact shadow under a character (no shadow maps needed). */
export const ContactShadow: React.FC<{ position?: [number, number, number]; radius: number; opacity?: number }> = ({ position = [0, 0, 0], radius, opacity = 0.55 }) => {
  const tex = useMemo(() => {
    const S = 256;
    const data = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = (x + 0.5) / S - 0.5;
        const dy = (y + 0.5) / S - 0.5;
        const r = Math.sqrt(dx * dx + dy * dy) * 2;
        // Dense core (contact), long soft falloff (occlusion).
        const fade = 1 - Math.min(1, Math.max(0, (r - 0.6) / 0.4)) ** 2;
        const a = (0.7 * Math.exp(-((r / 0.3) ** 2)) + 0.22 * Math.exp(-((r / 0.55) ** 2))) * fade;
        const i = (y * S + x) * 4;
        data[i] = 40;
        data[i + 1] = 30;
        data[i + 2] = 22;
        data[i + 3] = Math.round(Math.min(1, a) * 255 * (r < 1 ? 1 : 0));
      }
    }
    const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
    t.needsUpdate = true;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};
