// Every clip in content/episodes/*.anim.json, loaded at bundle time.
// Drop a file in (or save from Puppet Studio) and Remotion Studio picks it up:
// it appears as Episode-<name> and Episode-<name>-9x16.

import { validateClip, type Clip } from "./anim/clip";

declare const require: {
  context: (dir: string, deep: boolean, re: RegExp) => { keys: () => string[]; (k: string): unknown };
};

const ctx = require.context("../../content/episodes", false, /\.anim\.json$/);

export const EPISODES: Clip[] = ctx
  .keys()
  .filter((k) => k.startsWith("./"))
  .map((k) => {
    const raw = ctx(k) as { default?: unknown };
    const clip = (raw && typeof raw === "object" && "default" in raw ? raw.default : raw) as Clip;
    const errs = validateClip(clip);
    if (errs.length) throw new Error(`${k}: ${errs.join("; ")}`);
    return clip;
  })
  .sort((a, b) => a.name.localeCompare(b.name));
