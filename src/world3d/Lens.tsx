// Lens effects for the shot camera: depth of field (the miniature look), a
// gentle bloom on hot highlights, then tone mapping.
//
// Built directly on `postprocessing` (not the @react-three/postprocessing
// wrapper) so the composer exists on the very first draw: Remotion renders each
// frame with a single advance(), and the wrapper only creates its composer
// after a second React pass, which left rendered frames empty.

import { useFrame, useThree } from "@react-three/fiber";
import { BloomEffect, DepthOfFieldEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

export type LensProps = {
  /** Distance from the camera that is in focus. */
  focus: number;
  /** Bokeh size; 0 = no blur. */
  blur: number;
};

export const Lens: React.FC<LensProps> = ({ focus, blur }) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const fx = useMemo(() => {
    const composer = new EffectComposer(gl, { multisampling: 4, frameBufferType: THREE.HalfFloatType });
    composer.addPass(new RenderPass(scene, camera));
    const dof = new DepthOfFieldEffect(camera, { worldFocusDistance: focus, worldFocusRange: Math.max(0.6, focus * 0.12), bokehScale: blur, resolutionScale: 0.75 });
    composer.addPass(new EffectPass(camera, dof));
    const bloom = new BloomEffect({ intensity: 0.35, luminanceThreshold: 0.92, luminanceSmoothing: 0.15, mipmapBlur: true });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL });
    composer.addPass(new EffectPass(camera, bloom, tone));
    composer.setSize(size.width, size.height);
    return { composer, dof };
    // Rebuild only when the renderer, scene or camera change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);
  useLayoutEffect(() => {
    fx.composer.setSize(size.width, size.height);
  }, [fx, size.width, size.height]);
  // Per-frame lens settings, before the draw.
  useLayoutEffect(() => {
    fx.dof.cocMaterial.worldFocusDistance = focus;
    fx.dof.cocMaterial.worldFocusRange = Math.max(0.6, focus * 0.12);
    fx.dof.bokehScale = blur;
  });
  useEffect(() => () => fx.composer.dispose(), [fx]);
  // Priority 1: replaces R3F's own render.
  useFrame((_, delta) => fx.composer.render(delta), 1);
  return null;
};
