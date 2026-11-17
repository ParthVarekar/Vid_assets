// Prints which GPU the renderer's Chrome uses (Remotion forwards console logs):
//   npx remotion still GpuProbe out/gpu.png --gl=angle
// On laptops with two GPUs, Windows may give headless Chrome the integrated one.

import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";

export const GpuProbe: React.FC = () => {
  const info = useMemo(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "no webgl2";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
  }, []);
  console.log(`[gpu] ${info}`);
  return <AbsoluteFill style={{ background: "#111", color: "#eee", fontSize: 28, padding: 40, fontFamily: "monospace" }}>{info}</AbsoluteFill>;
};
