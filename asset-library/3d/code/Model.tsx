// Renders a code-built ProtoVinci model in React Three Fiber.
// Works anywhere R3F works: Remotion (<ThreeCanvas>), Next.js, Vite.
//
//   <Model id="logo-mark-two-tone" />

import React, { useMemo } from "react";
import * as THREE from "three";
import * as LOGO from "../components/logoPath";
import { buildAll, MATERIALS, type MaterialName, type ModelId } from "./models";

let cache: Map<string, ReturnType<typeof buildAll>[number]> | null = null;
const getModel = (id: ModelId) => {
  if (!cache) cache = new Map(buildAll(LOGO).map((m) => [m.id, m]));
  const m = cache.get(id);
  if (!m) throw new Error(`Unknown model "${id}"`);
  return m;
};

const useMaterials = () =>
  useMemo(() => {
    const out = {} as Record<MaterialName, THREE.MeshStandardMaterial>;
    for (const [name, spec] of Object.entries(MATERIALS) as Array<[MaterialName, (typeof MATERIALS)[MaterialName]]>) {
      out[name] = new THREE.MeshStandardMaterial({
        color: spec.color,
        roughness: spec.roughness,
        metalness: spec.metalness,
        emissive: "emissive" in spec ? spec.emissive : "#000000",
        emissiveIntensity: "emissiveIntensity" in spec ? spec.emissiveIntensity : 0,
        side: THREE.DoubleSide,
      });
    }
    return out;
  }, []);

type Vec3 = [number, number, number];

export const Model: React.FC<{
  id: ModelId;
  /** Swap a part's material by part name, e.g. { cradle: "sanguine" }. */
  override?: Partial<Record<string, MaterialName>>;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
}> = ({ id, override, position, rotation, scale }) => {
  const model = useMemo(() => getModel(id), [id]);
  const mats = useMaterials();
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {model.parts.map((p) => (
        <mesh
          key={p.name}
          geometry={p.geometry}
          material={mats[override?.[p.name] ?? p.material]}
          position={p.position}
          rotation={p.rotation}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
};

/** Bounding sphere radius of a model, for framing a camera. */
export const modelRadius = (id: ModelId): number => {
  const box = new THREE.Box3();
  for (const p of getModel(id).parts) {
    p.geometry.computeBoundingBox();
    const b = p.geometry.boundingBox!.clone();
    if (p.position) b.translate(new THREE.Vector3(...p.position));
    box.union(b);
  }
  const s = new THREE.Sphere();
  box.getBoundingSphere(s);
  return s.radius;
};

export const modelCenter = (id: ModelId): THREE.Vector3 => {
  const box = new THREE.Box3();
  for (const p of getModel(id).parts) {
    p.geometry.computeBoundingBox();
    const b = p.geometry.boundingBox!.clone();
    if (p.position) b.translate(new THREE.Vector3(...p.position));
    box.union(b);
  }
  return box.getCenter(new THREE.Vector3());
};
