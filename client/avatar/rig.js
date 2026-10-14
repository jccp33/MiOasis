import * as THREE from 'three';

// Esqueleto humanoide mínimo. Los nombres son el estándar del proyecto
// (ver docs/AVATAR_ASSETS.md); un GLB propio debe usar los mismos nombres.
// Unidades en metros, pies en y = 0, frente hacia +Z, lado izquierdo del avatar = +X.
export const HIPS_Y = 0.95;

const DEFS = [
  // [hueso, padre, x, y, z]  (posición local respecto al padre)
  ['Hips', null, 0, HIPS_Y, 0],
  ['Spine', 'Hips', 0, 0.12, 0],
  ['Chest', 'Spine', 0, 0.15, 0],
  ['Neck', 'Chest', 0, 0.2, 0],
  ['Head', 'Neck', 0, 0.08, 0],
];
for (const [s, k] of [['Left', 1], ['Right', -1]]) {
  DEFS.push(
    [`${s}UpperArm`, 'Chest', 0.2 * k, 0.12, 0],
    [`${s}LowerArm`, `${s}UpperArm`, 0, -0.28, 0],
    [`${s}Hand`, `${s}LowerArm`, 0, -0.26, 0],
    [`${s}UpperLeg`, 'Hips', 0.1 * k, -0.05, 0],
    [`${s}LowerLeg`, `${s}UpperLeg`, 0, -0.43, 0],
    [`${s}Foot`, `${s}LowerLeg`, 0, -0.4, 0],
  );
}

/** Cuerpo base procedural: jerarquía de THREE.Bone + mallas de piel pegadas a cada hueso. */
export function buildProceduralBody(skinHex = '#e0ac80') {
  const skin = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.85 });
  const bones = new Map();
  for (const [name, parent, x, y, z] of DEFS) {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    bones.set(name, b);
    if (parent) bones.get(parent).add(b);
  }

  const add = (bone, geo, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, skin);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    bones.get(bone).add(m);
  };

  add('Hips', new THREE.BoxGeometry(0.32, 0.18, 0.2), 0, -0.02, 0);
  add('Spine', new THREE.CapsuleGeometry(0.16, 0.22, 6, 12), 0, 0.07, 0, 1.1, 1, 0.72);
  add('Neck', new THREE.CylinderGeometry(0.05, 0.055, 0.12, 10), 0, 0.02, 0);
  add('Head', new THREE.SphereGeometry(0.13, 20, 16), 0, 0.12, 0, 1, 1.1, 1);
  for (const s of ['Left', 'Right']) {
    add(`${s}UpperArm`, new THREE.CapsuleGeometry(0.052, 0.2, 4, 8), 0, -0.14, 0);
    add(`${s}LowerArm`, new THREE.CapsuleGeometry(0.046, 0.19, 4, 8), 0, -0.14, 0);
    add(`${s}Hand`, new THREE.SphereGeometry(0.05, 10, 8), 0, -0.03, 0);
    add(`${s}UpperLeg`, new THREE.CapsuleGeometry(0.075, 0.3, 4, 10), 0, -0.215, 0);
    add(`${s}LowerLeg`, new THREE.CapsuleGeometry(0.062, 0.28, 4, 10), 0, -0.2, 0);
    add(`${s}Foot`, new THREE.BoxGeometry(0.1, 0.07, 0.24), 0, -0.03, 0.05);
  }

  return { root: bones.get('Hips'), bones, skinMaterials: [skin] };
}
