// Lookdev: the birds on a neutral studio sweep, for judging modelling, groom
// and shading. Gate 1 review stills and turntables come from here.
//
//   npx remotion still Lookdev-Quill out.png --frame=0 --gl=angle --scale=2
//   npx remotion render Lookdev-Lineup out.mp4 --gl=angle

import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import React, { useLayoutEffect } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { noise1 } from "../utilities/rng";
import { Bird, ContactShadow, RigLights } from "./Bird";
import type { BirdPose } from "./characters/buildBird";
import { BIRDS, type BirdId } from "./characters/config";
import { STUDIO } from "./lighting";

export type LookdevProps = {
  mode: "single" | "lineup" | "closeup";
  bird: BirdId;
  /** Starting facing, degrees. */
  yaw: number;
  /** Degrees turned over the whole duration (0 for stills). */
  spin: number;
  quality: "final" | "preview";
  /** "black" puts the birds on pure black: halo bleed, see-through coverage and edge artifacts show up at once. */
  ground?: "studio" | "black";
};

const CameraAt: React.FC<{ position: [number, number, number]; target: [number, number, number]; fov: number }> = ({ position, target, fov }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.fov = fov;
    camera.near = 0.02;
    camera.far = 60;
    camera.position.set(...position);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  });
  return null;
};

/** A gentle idle so turntables are not dead: breathing fur, slow glances, a blink. */
const idle = (frame: number, seed: number): Partial<BirdPose> => {
  const blinkAt = (frame + seed * 37) % 96;
  const blink = blinkAt < 6 ? Math.sin((blinkAt / 6) * Math.PI) : 0;
  return {
    lookX: noise1(frame / 70, seed) * 0.35,
    lookY: noise1(frame / 90, seed + 9) * 0.15,
    blinkL: blink,
    blinkR: blink,
    stretch: Math.sin(frame / 22 + seed) * 0.012,
  };
};

export const Lookdev: React.FC<LookdevProps> = ({ mode, bird, yaw, spin, quality, ground = "studio" }) => {
  const black = ground === "black";
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const turn = yaw + (spin * frame) / Math.max(1, durationInFrames);
  const aspect = width / height;
  const still = spin === 0 && durationInFrames <= 1;
  const poseFor = (seed: number): Partial<BirdPose> => (still ? {} : idle(frame, seed));

  let cam: { position: [number, number, number]; target: [number, number, number]; fov: number };
  if (mode === "lineup") {
    const fov = aspect >= 1 ? 22 : 34;
    cam = { position: [0, 1.05, aspect >= 1 ? 9.2 : 11.5], target: [0, 0.62, 0], fov };
  } else if (mode === "closeup") {
    const c = BIRDS[bird];
    const eyeY = c.body.legLength + c.body.height * c.eyes.height;
    cam = { position: [0.35, eyeY + 0.12, 1.9], target: [0, eyeY - 0.05, 0], fov: 24 };
  } else {
    const c = BIRDS[bird];
    const mid = c.body.legLength + c.body.height * 0.6;
    cam = { position: [0, mid + 0.35, aspect >= 1 ? 4.6 : 6.2], target: [0, mid, 0], fov: 24 };
  }

  const cast: Array<{ id: BirdId; x: number; yaw: number; seed: number }> =
    mode === "lineup"
      ? [
          { id: "ink", x: -1.35, yaw: turn + 14, seed: 2 },
          { id: "quill", x: 0, yaw: turn, seed: 1 },
          { id: "chalk", x: 1.3, yaw: turn - 16, seed: 3 },
        ]
      : [{ id: bird, x: 0, yaw: turn, seed: 1 }];

  return (
    <AbsoluteFill style={{ background: black ? "#000" : "radial-gradient(ellipse 75% 70% at 50% 38%, #FBF7EF 0%, #EFE7DA 55%, #D9CDBA 100%)" }}>
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} camera={{ fov: cam.fov, position: cam.position }}>
        <CameraAt {...cam} />
        <RigLights rig={STUDIO} />
        {cast.map((b) => (
          <React.Fragment key={b.id}>
            <Bird id={b.id} rig={STUDIO} yaw={b.yaw} position={[b.x, 0, 0]} quality={quality} pose={poseFor(b.seed)} />
            {black ? null : <ContactShadow position={[b.x, 0.001, 0.02]} radius={BIRDS[b.id].body.width * 0.95} />}
          </React.Fragment>
        ))}
      </ThreeCanvas>
      {/* Soft vignette, like a lit studio sweep. */}
      {black ? null : <AbsoluteFill style={{ pointerEvents: "none", boxShadow: `inset 0 0 ${Math.min(width, height) * 0.22}px rgba(120,100,70,0.22)` }} />}
    </AbsoluteFill>
  );
};
