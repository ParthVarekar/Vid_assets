// Pose library: content/poses/{expressions,gestures,custom}.json.
//
// Click a pose to apply it at the playhead (only the channels it contains);
// Shift+click applies it mirrored. Hover for its values. "Save current pose"
// stores the selected bird's pose in custom.json, where you can delete it again.
// Position (x, y, z, turn) is never saved: poses are about the body, not where it stands.

import React, { useCallback, useEffect, useState } from "react";
import { isCameraTrack } from "../../src/world3d/anim/clip";
import { CHANNEL_BY_ID, CHANNELS, GROUPS, type RigValues } from "../../src/world3d/rig/schema";
import { loadPoses, savePoses } from "./api";
import { applyPose, currentValue, getState, set, useStore } from "./store";

type Pose = { name: string; values: RigValues };
const FILES = ["expressions", "gestures", "custom"] as const;
const SAVE_GROUPS = GROUPS.filter((g) => g !== "life");
const NEVER_SAVED = new Set(["x", "y", "z", "yaw"]);

const describe = (p: Pose) =>
  Object.entries(p.values)
    .map(([k, v]) => `${CHANNEL_BY_ID[k]?.label ?? k}: ${v}`)
    .join("\n");

export const PosePanel: React.FC = () => {
  const [lib, setLib] = useState<Record<string, Pose[]>>({});
  const [open, setOpen] = useState(true);
  const [name, setName] = useState("");
  const [groups, setGroups] = useState<Record<string, boolean>>({ body: true, eyes: true, beak: true, wings: false, legs: false, crest: true });
  const track = useStore((s) => s.track);

  const reload = useCallback(
    () =>
      Promise.all(FILES.map((f) => loadPoses(f).then((p) => [f, p as Pose[]] as const).catch(() => [f, [] as Pose[]] as const))).then((r) => setLib(Object.fromEntries(r))),
    [],
  );
  useEffect(() => {
    reload();
  }, [reload]);

  const saveCurrent = async () => {
    const s = getState();
    const nm = name.trim();
    if (isCameraTrack(s.track)) return set({ status: "Select a bird first (keys 1 / 2 / 3)" });
    if (!nm) return set({ status: "Give the pose a name first" });
    const values: RigValues = {};
    for (const c of CHANNELS) {
      if (c.group !== "life" && groups[c.group] && !NEVER_SAVED.has(c.id)) values[c.id] = +currentValue(s, s.track, c.id).toFixed(3);
    }
    if (!Object.keys(values).length) return set({ status: "Tick at least one group to save" });
    try {
      const custom = (lib.custom ?? []).filter((p) => p.name !== nm);
      custom.push({ name: nm, values });
      await savePoses("custom", custom);
      setName("");
      await reload();
      set({ status: `Saved pose "${nm}" (${Object.keys(values).length} channels) to content/poses/custom.json` });
    } catch (e) {
      set({ status: `Save failed: ${(e as Error).message}` });
    }
  };

  const remove = async (nm: string) => {
    if (!confirm(`Delete custom pose "${nm}"?`)) return;
    try {
      await savePoses("custom", (lib.custom ?? []).filter((p) => p.name !== nm));
      await reload();
      set({ status: `Deleted pose "${nm}"` });
    } catch (e) {
      set({ status: `Delete failed: ${(e as Error).message}` });
    }
  };

  const total = Object.values(lib).reduce((a, b) => a + b.length, 0);
  return (
    <div className="poses">
      <button className="group-head" onClick={() => setOpen(!open)}>
        {open ? "▾" : "▸"} poses ({total})
      </button>
      {open ? (
        <>
          {FILES.filter((f) => lib[f]?.length).map((f) => (
            <div key={f}>
              <div className="hint small">{f} · click to apply, Shift+click mirrored</div>
              <div className="pose-grid">
                {lib[f].map((p) => (
                  <div key={p.name} className="pose-item">
                    <button className="apply" title={describe(p)} onClick={(e) => applyPose(p.values, e.shiftKey, p.name)}>
                      {p.name}
                    </button>
                    {f === "custom" ? (
                      <button className="del" title="Delete this pose" onClick={() => remove(p.name)}>
                        ×
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {total === 0 ? <div className="hint small">No poses yet. Add content/poses/expressions.json (see planning/TASKS-3D-BIRDS.md, S1).</div> : null}
          <div className="pose-save">
            <div className="hint small">Save the pose of {isCameraTrack(track) ? "(select a bird)" : track} at this frame</div>
            <input className="name" placeholder="pose name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveCurrent()} />
            <div className="pose-groups">
              {SAVE_GROUPS.map((g) => (
                <label key={g}>
                  <input type="checkbox" checked={!!groups[g]} onChange={(e) => setGroups((x) => ({ ...x, [g]: e.target.checked }))} /> {g}
                </label>
              ))}
            </div>
            <button onClick={saveCurrent}>Save to custom</button>
          </div>
        </>
      ) : null}
    </div>
  );
};
