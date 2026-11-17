// The free-orbit camera, shared so "Key camera from view" can read it.
import type * as THREE from "three";

export const viewCamera: { camera: THREE.PerspectiveCamera | null; target: THREE.Vector3 | null } = { camera: null, target: null };
