// The 3D view: the same BirdScene Remotion renders, plus editor-only
// pick proxies and drag handles.

import { OrbitControls, TransformControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import React, { Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { isCameraTrack } from "../../src/world3d/anim/clip";
import { BirdScene, STUDIO_BACKDROP } from "../../src/world3d/BirdScene";
import { BIRDS, type BirdId } from "../../src/world3d/characters/config";
import { displayClip, endEdit, evaluatedPose, set, setValues, useStore } from "./store";
import { viewCamera } from "./viewCamera";

const deg = Math.PI / 180;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Redraw whenever React re-renders (frameloop is "demand"); share the camera. */
const Invalidator: React.FC = () => {
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as { target?: THREE.Vector3 } | null;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    viewCamera.camera = camera;
    viewCamera.target = controls?.target ?? null;
    // Debug hook for performance checks: window.__puppet.bench(10) -> ms per frame (GPU-synced).
    (window as unknown as { __puppet: unknown }).__puppet = {
      bench: (n = 10) => {
        const px = new Uint8Array(4);
        const ctx = gl.getContext();
        gl.render(scene, camera);
        ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
        const t = performance.now();
        for (let i = 0; i < n; i++) {
          gl.render(scene, camera);
          ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
        }
        return (performance.now() - t) / n;
      },
    };
    invalidate();
  });
  return null;
};

/** Keeps the editor alive if an asset fails to load; shows the error instead. */
class SceneErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: String((e as Error)?.message ?? e) };
  }
  componentDidCatch(e: unknown) {
    set({ status: `Scene error: ${String((e as Error)?.message ?? e)}` });
  }
  render() {
    return this.state.error ? null : this.props.children;
  }
}

/** Invisible capsule per bird: click to select. */
const PickProxies: React.FC = () => {
  const s = useStore((x) => x);
  return (
    <>
      {s.clip.cast.map((m) => {
        const v = evaluatedPose(s, m.id);
        const b = BIRDS[m.id].body;
        return (
          <mesh
            key={m.id}
            position={[v.x, v.y + b.legLength + b.height * 0.5, v.z]}
            onClick={(e) => {
              e.stopPropagation();
              set({ track: m.id, status: `Selected ${m.id}` });
            }}
          >
            <capsuleGeometry args={[b.width * 0.55, b.height * 0.4, 4, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        );
      })}
    </>
  );
};

/** Ring on the ground under the selected bird. */
const SelectionRing: React.FC = () => {
  const s = useStore((x) => x);
  if (isCameraTrack(s.track) || !s.clip.cast.some((m) => m.id === s.track)) return null;
  const v = evaluatedPose(s, s.track);
  const r = BIRDS[s.track as BirdId].body.width * 0.62;
  return (
    <mesh position={[v.x, 0.004, v.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r, r + 0.02, 64]} />
      <meshBasicMaterial color="#C4472F" transparent opacity={0.85} toneMapped={false} depthWrite={false} />
    </mesh>
  );
};

/** Move / turn / eye-target gizmos for the selected bird. */
const Handles: React.FC = () => {
  const s = useStore((x) => x);
  const [dragging, setDragging] = useState(false);
  const target = useRef<THREE.Group>(null);
  if (isCameraTrack(s.track) || s.handle === "none" || !s.clip.cast.some((m) => m.id === s.track)) return null;
  const track = s.track as BirdId;
  const v = evaluatedPose(s, track);
  const cfg = BIRDS[track];
  const headY = v.y + cfg.body.legLength + cfg.body.height * cfg.eyes.height;
  const yaw = v.yaw * deg;
  const start = () => setDragging(true);
  const stop = () => {
    setDragging(false);
    endEdit();
  };

  if (s.handle === "move") {
    return (
      <TransformControls
        mode="translate"
        size={0.8}
        position={[v.x, v.y, v.z]}
        onMouseDown={start}
        onMouseUp={stop}
        onObjectChange={(e) => {
          const o = (e?.target as unknown as { object: THREE.Object3D }).object;
          if (!o) return;
          setValues(track, { x: +o.position.x.toFixed(3), y: +Math.max(0, o.position.y).toFixed(3), z: +o.position.z.toFixed(3) }, true);
        }}
      >
        <group />
      </TransformControls>
    );
  }
  if (s.handle === "turn") {
    return (
      <TransformControls
        mode="rotate"
        size={0.9}
        showX={false}
        showZ={false}
        position={[v.x, v.y + 0.02, v.z]}
        rotation={dragging ? undefined : [0, yaw, 0]}
        onMouseDown={start}
        onMouseUp={stop}
        onObjectChange={(e) => {
          const o = (e?.target as unknown as { object: THREE.Object3D }).object;
          if (!o) return;
          const y = new THREE.Euler().setFromQuaternion(o.quaternion, "YXZ").y / deg;
          setValues(track, { yaw: +y.toFixed(1) }, true);
        }}
      >
        <group />
      </TransformControls>
    );
  }
  // Eye target: a dot in front of the face; drag it and the eyes follow.
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const dist = 1.4;
  const pos = new THREE.Vector3(v.x, headY, v.z).addScaledVector(fwd, dist).addScaledVector(right, v.lookX * 0.9).add(new THREE.Vector3(0, v.lookY * 0.6, 0));
  return (
    <>
      <TransformControls
        mode="translate"
        size={0.6}
        showZ={false}
        space="world"
        position={[pos.x, pos.y, pos.z]}
        onMouseDown={start}
        onMouseUp={stop}
        onObjectChange={(e) => {
          const o = (e?.target as unknown as { object: THREE.Object3D }).object;
          if (!o) return;
          const d = o.position.clone().sub(new THREE.Vector3(v.x, headY, v.z));
          setValues(track, { lookX: +clamp(d.dot(right) / 0.9, -1, 1).toFixed(3), lookY: +clamp(d.y / 0.6, -1, 1).toFixed(3) }, true);
        }}
      >
        <group ref={target}>
          <mesh>
            <sphereGeometry args={[0.05, 16, 12]} />
            <meshBasicMaterial color="#C4472F" toneMapped={false} />
          </mesh>
        </group>
      </TransformControls>
    </>
  );
};

export const Viewport: React.FC = () => {
  const cameraMode = useStore((s) => s.cameraMode);
  const quality = useStore((s) => s.quality);
  const frame = useStore((s) => s.frame);
  const [format, setFormat] = useState<"16:9" | "9:16">("16:9");
  // The vertical view uses the clip's camera-9x16 track when it has one (same as Remotion).
  const clip = useStore((s) => displayClip(s));
  const shown = useMemo(() => (format === "9:16" && clip.tracks["camera-9x16"] ? { ...clip, tracks: { ...clip.tracks, camera: clip.tracks["camera-9x16"] } } : clip), [clip, format]);
  const box = useRef<HTMLDivElement>(null);

  return (
    <div className="viewport">
      <div className="viewport-bar">
        <span className="hint">{cameraMode === "shot" ? "Shot camera (keyed on the camera track)" : "Free orbit: drag to orbit, right-drag to pan, wheel to zoom"}</span>
        <div className="seg">
          {(["16:9", "9:16"] as const).map((f) => (
            <button key={f} className={format === f ? "on" : ""} onClick={() => setFormat(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="viewport-stage">
        <div ref={box} className="viewport-frame" style={{ aspectRatio: format === "16:9" ? "16 / 9" : "9 / 16", background: STUDIO_BACKDROP }}>
          <Canvas
            frameloop="demand"
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true }}
            camera={{ fov: 22, position: [0, 1.1, 9], near: 0.02, far: 500 }}
          >
            <Invalidator />
            {/* The editor's own Suspense boundary: the Desk's props load in the background. */}
            <SceneErrorBoundary>
              <Suspense fallback={null}>
                <BirdScene clip={shown} frame={frame} quality={quality} camera={cameraMode} lens={quality === "final"} />
              </Suspense>
            </SceneErrorBoundary>
            {cameraMode === "free" ? <OrbitControls makeDefault target={[0, 0.6, 0]} /> : null}
            <PickProxies />
            <SelectionRing />
            <Handles />
          </Canvas>
          <div className="vignette" />
        </div>
      </div>
    </div>
  );
};
