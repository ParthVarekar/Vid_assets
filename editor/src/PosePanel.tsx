// Pose library: content/poses/{expressions,gestures,custom}.json.
// Click applies the pose at the playhead (only the channels it contains);
// Shift+click applies it mirrored.
// (Sonnet task S2 adds "save current pose" and polish.)

import React, { useEffect, useState } from "react";
import type { RigValues } from "../../src/world3d/rig/schema";
import { loadPoses } from "./api";
import { applyPose } from "./store";

type Pose = { name: string; values: RigValues };
const FILES = ["expressions", "gestures", "custom"];

export const PosePanel: React.FC = () => {
  const [lib, setLib] = useState<Record<string, Pose[]>>({});
  const [open, setOpen] = useState(true);
  useEffect(() => {
    Promise.all(FILES.map((f) => loadPoses(f).then((p) => [f, p as Pose[]] as const).catch(() => [f, [] as Pose[]] as const))).then((r) => setLib(Object.fromEntries(r)));
  }, []);
  const total = Object.values(lib).reduce((a, b) => a + b.length, 0);
  return (
    <div className="poses">
      <button className="group-head" onClick={() => setOpen(!open)}>
        {open ? "▾" : "▸"} poses ({total})
      </button>
      {open ? (
        total === 0 ? (
          <div className="hint small">No poses yet. Add content/poses/expressions.json (see planning/TASKS-3D-BIRDS.md, S1).</div>
        ) : (
          FILES.filter((f) => lib[f]?.length).map((f) => (
            <div key={f}>
              <div className="hint small">{f} · click to apply, Shift+click mirrored</div>
              <div className="pose-grid">
                {lib[f].map((p) => (
                  <button key={p.name} onClick={(e) => applyPose(p.values, e.shiftKey, p.name)}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ))
        )
      ) : null}
    </div>
  );
};
