// Talks to the save API in vite.config.ts.
import type { Clip } from "../../src/world3d/anim/clip";

const j = async (r: Response) => {
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((body as { error?: string }).error ?? r.statusText);
  return body;
};

export const listEpisodes = async (): Promise<string[]> => j(await fetch("/api/episodes"));
export const loadEpisode = async (name: string): Promise<Clip> => j(await fetch(`/api/episodes/${name}`));
export const saveEpisode = async (name: string, clip: Clip): Promise<{ saved: string }> =>
  j(await fetch(`/api/episodes/${name}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clip) }));
export const loadPoses = async (name: string): Promise<unknown> => j(await fetch(`/api/poses/${name}`));
export const savePoses = async (name: string, data: unknown): Promise<{ saved: string }> =>
  j(await fetch(`/api/poses/${name}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }));
