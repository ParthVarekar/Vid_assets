// Loading set assets (GLB props, textures, HDRIs) for both Remotion and
// Puppet Studio, with React Suspense.
//
// Loaders *suspend* until the asset is ready. Remotion's <ThreeCanvas> holds a
// delayRender while anything inside it is suspended, so frames are never
// captured before props and textures arrive. Puppet Studio wraps the scene in
// its own <Suspense>. (BirdScene itself must not add a Suspense boundary, or
// Remotion would draw before assets load.)
//
// Episode sets `url` to staticFile; the editor serves public/ at the root.

import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const env = { url: (p: string) => `/${p}` };
export const setAssetEnv = (e: Partial<typeof env>) => Object.assign(env, e);
export const assetUrl = (p: string) => env.url(p);

type Entry = { status: "pending" | "done" | "error"; promise: Promise<void>; value?: unknown; error?: unknown };
const cache = new Map<string, Entry>();

/** Suspense resource: returns the value, or throws the pending promise / error. */
const read = <T,>(key: string, load: () => Promise<T>): T => {
  let e = cache.get(key);
  if (!e) {
    const entry: Entry = { status: "pending", promise: Promise.resolve() };
    entry.promise = load().then(
      (v) => {
        entry.status = "done";
        entry.value = v;
      },
      (err) => {
        entry.status = "error";
        entry.error = err;
        console.error(`failed to load ${key}`, err);
      },
    );
    cache.set(key, entry);
    e = entry;
  }
  if (e.status === "pending") throw e.promise;
  if (e.status === "error") throw e.error;
  return e.value as T;
};

const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

/** A prop GLB from public/3d/props, as this component's own clone (safe to place several times). */
export const useProp = (id: string): THREE.Object3D => {
  const gltf = read<GLTF>(`prop:${id}`, () => gltfLoader.loadAsync(assetUrl(`3d/props/${id}.glb`)));
  const clone = useMemo(() => {
    const c = gltf.scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        // Materials are shared between clones; copy so per-prop tweaks stay local.
        m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
      }
    });
    return c;
  }, [gltf]);
  useLayoutEffect(
    () => () =>
      clone.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
      }),
    [clone],
  );
  return clone;
};

export const useTexture = (path: string, srgb = true): THREE.Texture =>
  read<THREE.Texture>(`tex:${path}:${srgb}`, async () => {
    const t = await new THREE.TextureLoader().loadAsync(assetUrl(path));
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });

/** An equirect HDRI; pass "" for none (returns null, loads nothing). */
export const useHDR = (path: string): THREE.DataTexture | null => {
  if (!path) return null;
  return read<THREE.DataTexture>(`hdr:${path}`, async () => {
    const t = await new HDRLoader().loadAsync(assetUrl(path));
    t.mapping = THREE.EquirectangularReflectionMapping;
    return t;
  });
};
