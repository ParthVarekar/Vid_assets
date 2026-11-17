// One clip at one frame: the cast posed from their tracks, the light rig, the
// shot camera and contact shadows. Remotion (Episode) and Puppet Studio both
// render this component, so a frame looks the same in the editor and in the
// final render.

import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect } from "react";
import * as THREE from "three";
import { noise1 } from "../utilities/rng";
import { sampleCamera, type Clip } from "./anim/clip";
import { evaluateBird } from "./anim/evaluate";
import { Bird, ContactShadow, RigLights } from "./Bird";
import { BIRDS } from "./characters/config";
import { RIGS, STUDIO } from "./lighting";
import { DeskSet } from "./set/DeskSet";
import { Lens } from "./Lens";

/** CSS backdrop behind the transparent canvas (the studio sweep, until the Desk set). */
export const STUDIO_BACKDROP = "radial-gradient(ellipse 75% 70% at 50% 38%, #FBF7EF 0%, #EFE7DA 55%, #D9CDBA 100%)";

/** Puts the R3F camera where the clip's camera track says, at this frame. */
export const ShotCamera: React.FC<{ clip: Clip; frame: number }> = ({ clip, frame }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  useLayoutEffect(() => {
    const c = sampleCamera(clip, frame);
    const sh = c.shake;
    const n = (seed: number) => noise1(frame / 9, seed) * sh;
    camera.fov = c.fov;
    camera.near = 0.05;
    camera.far = 500;
    camera.aspect = size.width / Math.max(1, size.height);
    camera.position.set(c.px + n(1) * 0.06, c.py + n(2) * 0.05, c.pz);
    camera.up.set(Math.sin((c.roll * Math.PI) / 180), Math.cos((c.roll * Math.PI) / 180), 0);
    camera.lookAt(c.tx + n(3) * 0.03, c.ty + n(4) * 0.03, c.tz);
    camera.updateProjectionMatrix();
  });
  return null;
};

export type BirdSceneProps = {
  clip: Clip;
  frame: number;
  quality?: "final" | "preview";
  /** "shot": the clip's camera drives the view. "free": leave the camera alone (editor orbit). */
  camera?: "shot" | "free";
  /** Lens effects (depth of field, bloom). The editor turns them off at preview quality for speed. */
  lens?: boolean;
};

export const BirdScene: React.FC<BirdSceneProps> = ({ clip, frame, quality = "final", camera = "shot", lens = true }) => {
  const rig = RIGS[clip.rig ?? "studio"] ?? STUDIO;
  const cam = sampleCamera(clip, frame);
  const focus = cam.focus > 0 ? cam.focus : Math.hypot(cam.px - cam.tx, cam.py - cam.ty, cam.pz - cam.tz);
  return (
    <>
      {camera === "shot" ? <ShotCamera clip={clip} frame={frame} /> : null}
      <RigLights rig={rig} />
      {clip.set === "desk" ? <DeskSet rig={rig} /> : null}
      {lens && cam.blur > 0 ? <Lens focus={focus} blur={cam.blur} /> : null}
      {clip.cast.map((m) => {
        const { values, secondary } = evaluateBird(clip, m.id, frame, m.seed ?? 1);
        // The shadow tightens and fades as the bird leaves the ground.
        const lift = Math.max(0, values.y);
        const r = BIRDS[m.id].body.width * 0.95 * (1 + lift * 0.6);
        return (
          <React.Fragment key={m.id}>
            <Bird id={m.id} rig={rig} quality={quality} pose={values} secondary={secondary} />
            <ContactShadow position={[values.x, 0.001, values.z + 0.02]} radius={r} opacity={0.55 / (1 + lift * 2.5)} />
          </React.Fragment>
        );
      })}
    </>
  );
};
