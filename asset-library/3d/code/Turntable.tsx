// Turntable for any code-built model: slow rotation on paper or night ground,
// soft studio light. Renders previews and reusable 3D loops.
//
//   npx remotion render Turntable out.mp4 --props=props.json --gl=angle
//   npx remotion still  Turntable out.png --frame=40 --props=props.json --gl=angle

import { ThreeCanvas } from "@remotion/three";
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Grain } from "../components/Surface";
import { C } from "../theme";
import { Model, modelCenter, modelRadius } from "../three/Model";
import type { ModelId } from "../three/models";

export type TurntableProps = {
  model: ModelId;
  ground: "paper" | "night";
  /** Degrees of rotation over the whole duration. */
  spin: number;
  /** Camera elevation in degrees. */
  elevation: number;
};

export const Turntable: React.FC<TurntableProps> = ({ model, ground, spin, elevation }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const dark = ground === "night";
  const radius = useMemo(() => modelRadius(model), [model]);
  const center = useMemo(() => modelCenter(model), [model]);
  const yaw = ((-spin / 2 + (spin * frame) / Math.max(1, durationInFrames - 1)) * Math.PI) / 180;
  const el = (elevation * Math.PI) / 180;
  // Fit the bounding sphere inside the narrower field of view, with margin.
  const aspect = width / height;
  const halfV = (20 * Math.PI) / 180;
  const halfMin = aspect >= 1 ? halfV : Math.atan(Math.tan(halfV) * aspect);
  const dist = (radius / Math.sin(halfMin)) * 1.18;
  const bg = dark ? C.night : C.paper;

  return (
    <AbsoluteFill
      style={{
        background: dark
          ? `radial-gradient(ellipse 70% 60% at 50% 45%, #1F1F25 0%, ${C.night} 70%)`
          : `radial-gradient(ellipse 70% 60% at 50% 42%, ${C.paperBright} 0%, ${C.paper} 60%, #DCD6CB 100%)`,
      }}
    >
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ fov: 40, near: 0.01, far: 100, position: [0, 0, dist] }}
        gl={{ antialias: true, alpha: true }}
      >
        <hemisphereLight args={[dark ? "#C9CCD6" : "#FFFFFF", dark ? "#09090B" : "#B8AE9F", dark ? 0.6 : 1.2]} />
        <directionalLight position={[3, 5, 4]} intensity={dark ? 2.2 : 2.6} color="#FFF6EA" />
        <directionalLight position={[-4, 2, -3]} intensity={dark ? 1.4 : 0.8} color={dark ? "#9FB2FF" : "#E9E2D6"} />
        <directionalLight position={[0, -3, 3]} intensity={0.35} />
        {/* Camera stays level; the model tilts toward it instead. */}
        <group rotation={[el, 0, 0]}>
          <group rotation={[0, yaw, 0]}>
            <Model id={model} position={[-center.x, -center.y, -center.z]} />
          </group>
        </group>
      </ThreeCanvas>
      <Grain opacity={0.28} />
      <AbsoluteFill style={{ pointerEvents: "none", boxShadow: `inset 0 0 ${width * 0.12}px ${bg}66` }} />
    </AbsoluteFill>
  );
};
