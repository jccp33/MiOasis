import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

/* ---------- Carga de GLB con caché (se descarga una vez, se clona por avatar) ---------- */
const loader = new GLTFLoader();
const cache = new Map();

export function loadGLB(url) {
  if (!cache.has(url)) {
    cache.set(url, loader.loadAsync(url).catch((e) => { cache.delete(url); throw e; }));
  }
  return cache.get(url);
}

export async function instantiate(url) {
  const gltf = await loadGLB(url);
  return { scene: SkeletonUtils.clone(gltf.scene), animations: gltf.animations };
}

/* ---------- Nombres de huesos: nuestro estándar + alias de Mixamo ---------- */
const ALIAS = { Spine1: 'Chest', Spine2: 'UpperChest' };
for (const s of ['Left', 'Right']) {
  Object.assign(ALIAS, {
    [`${s}Arm`]: `${s}UpperArm`,
    [`${s}ForeArm`]: `${s}LowerArm`,
    [`${s}UpLeg`]: `${s}UpperLeg`,
    [`${s}Leg`]: `${s}LowerLeg`,
  });
}

/** 'mixamorig:LeftForeArm' -> 'LeftLowerArm' */
export const canon = (name) => {
  const n = name.replace(/^mixamorig\d*[:_]?/, '');
  return ALIAS[n] ?? n;
};

export function collectBones(root) {
  const map = new Map();
  root.traverse((o) => { if (o.isBone) map.set(canon(o.name), o); });
  return map;
}

/**
 * Re-vincula una SkinnedMesh (ropa) al esqueleto base, emparejando huesos por nombre.
 * Así la ropa se deforma con las mismas animaciones que el cuerpo.
 */
export function rebindSkinned(mesh, boneMap) {
  const bones = mesh.skeleton.bones.map((b) => {
    const target = boneMap.get(canon(b.name));
    if (!target) console.warn(`[avatar] hueso sin pareja en el esqueleto base: ${b.name}`);
    return target ?? b;
  });
  mesh.bind(new THREE.Skeleton(bones, mesh.skeleton.boneInverses), mesh.bindMatrix);
  mesh.frustumCulled = false;
}

/**
 * Clona los materiales con un nombre dado ('Skin', 'Tint') para poder teñirlos
 * por avatar sin afectar a los demás. Devuelve los clones.
 */
export function collectTintables(root, materialName) {
  const clones = [];
  const swap = (m) => {
    if (!m || m.name !== materialName) return m;
    const c = m.clone();
    clones.push(c);
    return c;
  };
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
  });
  return clones;
}

/** Aplica morph targets (blendshapes) por nombre en toda la jerarquía. */
export function setMorphs(root, values = {}) {
  root.traverse((o) => {
    if (!o.isMesh || !o.morphTargetDictionary) return;
    for (const [name, v] of Object.entries(values)) {
      const i = o.morphTargetDictionary[name];
      if (i !== undefined) o.morphTargetInfluences[i] = v;
    }
  });
}

/* ---------- Gestión de memoria GPU ---------- */
export const newOwned = () => ({ geos: new Set(), mats: new Set() });

export function collectOwned(root, owned) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    owned.geos.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) owned.mats.add(m);
  });
}

export function disposeOwned(owned) {
  owned.geos.forEach((g) => g.dispose());
  owned.mats.forEach((m) => m.dispose());
  owned.geos.clear();
  owned.mats.clear();
}
