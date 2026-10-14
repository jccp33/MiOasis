import * as THREE from 'three';

// Piezas procedurales. Cada builder recibe { color, skin } y devuelve:
//   - un Object3D  -> se pega al hueso 'attach' del slot (catalog.json), o
//   - { NombreHueso: Object3D, ... } -> se pega a varios huesos (mangas, zapatos...).
// Convenciones del rig: frente = +Z, centro de la cabeza = (0, 0.12, 0) respecto al hueso Head.

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
};
const grp = (...kids) => { const g = new THREE.Group(); g.add(...kids); return g; };
const both = (suffix, make) => ({ [`Left${suffix}`]: make(), [`Right${suffix}`]: make() });
const capsule = (r, len, mat, y, sx = 1, sz = 1) => {
  const m = mesh(new THREE.CapsuleGeometry(r, len, 6, 12), mat, 0, y, 0);
  m.scale.set(sx, 1, sz);
  return m;
};

/* ---------------- Cabello ---------------- */
const hairMat = (c) => M(c, { roughness: 0.9, side: THREE.DoubleSide });

/** Media esfera inclinada hacia atrás: frente alta (deja ver cejas) y nuca baja. */
const dome = (mat, r = 0.14, tilt = -0.6, y = 0.12) => {
  const m = mesh(new THREE.SphereGeometry(r, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat, 0, y, -0.005);
  m.scale.y = 1.1;
  m.rotation.x = tilt;
  return m;
};

const hairShort = ({ color }) => grp(dome(hairMat(color)));

const hairLong = ({ color }) => {
  const mat = hairMat(color);
  return grp(dome(mat), capsule(0.12, 0.26, mat, -0.02, 1, 0.5).translateZ(-0.09));
};

const hairSpiky = ({ color }) => {
  const mat = hairMat(color);
  const g = grp(dome(mat, 0.135, -0.4));
  const dirs = [new THREE.Vector3(0, 1, 0)];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    dirs.push(new THREE.Vector3(Math.sin(a) * 0.75, 0.66, Math.cos(a) * 0.75));
  }
  for (const v of dirs) {
    v.normalize();
    const cone = mesh(new THREE.ConeGeometry(0.035, 0.13, 6), mat);
    cone.position.set(0, 0.12, 0).addScaledVector(v, 0.15);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
    g.add(cone);
  }
  return g;
};

/* ---------------- Cejas ---------------- */
const brows = ({ w, h, tilt, y }) => ({ color }) => {
  const mat = M(color);
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const b = mesh(new THREE.BoxGeometry(w, h, 0.012), mat, s * 0.05, y, 0.115);
    b.rotation.z = s * tilt; // tilt > 0: extremo interno más bajo (ceño fruncido)
    g.add(b);
  }
  return g;
};

/* ---------------- Ojos ---------------- */
const eyes = ({ size, spacing, narrow }) => ({ color }) => {
  const white = M(0xffffff, { roughness: 0.3 });
  const iris = M(color, { roughness: 0.4 });
  const pupil = M(0x111111);
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * spacing, 0.14, 0.112);
    const w = mesh(new THREE.SphereGeometry(size, 16, 12), white);
    w.scale.set(1, narrow, 0.6);
    const i = mesh(new THREE.SphereGeometry(size * 0.62, 16, 12), iris, 0, 0, size * 0.35);
    i.scale.set(1, narrow, 0.5);
    const p = mesh(new THREE.SphereGeometry(size * 0.3, 12, 8), pupil, 0, 0, size * 0.55);
    p.scale.set(1, narrow, 0.5);
    eye.add(w, i, p);
    g.add(eye);
  }
  return g;
};

/* ---------------- Nariz (usa el color de piel) ---------------- */
const noseSmall = ({ skin }) => mesh(new THREE.SphereGeometry(0.022, 12, 10), M(skin), 0, 0.105, 0.128);
const nosePointed = ({ skin }) => {
  const m = mesh(new THREE.ConeGeometry(0.022, 0.06, 10), M(skin), 0, 0.103, 0.125);
  m.rotation.x = Math.PI / 2; // la punta apunta a +Z
  return m;
};
const noseWide = ({ skin }) => {
  const m = mesh(new THREE.SphereGeometry(0.026, 12, 10), M(skin), 0, 0.1, 0.127);
  m.scale.set(1.5, 0.9, 0.9);
  return m;
};

/* ---------------- Boca ---------------- */
const mouthSmile = ({ color }) => {
  const m = mesh(new THREE.TorusGeometry(0.03, 0.005, 8, 16, Math.PI), M(color), 0, 0.068, 0.117);
  m.rotation.z = Math.PI; // arco hacia abajo = sonrisa
  return m;
};
const mouthNeutral = ({ color }) => mesh(new THREE.BoxGeometry(0.06, 0.008, 0.01), M(color), 0, 0.058, 0.117);
const mouthOpen = ({ color }) => {
  const m = mesh(new THREE.SphereGeometry(0.02, 12, 8), M(color), 0, 0.055, 0.116);
  m.scale.set(1.4, 1, 0.35);
  return m;
};

/* ---------------- Ropa (se adapta al cuerpo: siempre un poco más grande que la piel) ---------------- */
const torsoShell = (mat, r) => {
  const m = mesh(new THREE.CapsuleGeometry(r, 0.24, 6, 12), mat, 0, 0.07, 0);
  m.scale.set(1.1, 1, 0.72);
  return m;
};
const hipsShell = (mat) => mesh(new THREE.BoxGeometry(0.35, 0.2, 0.23), mat, 0, -0.02, 0);

const topTee = ({ color }) => {
  const m = M(color);
  return { Spine: torsoShell(m, 0.172), ...both('UpperArm', () => capsule(0.066, 0.1, m, -0.1)) };
};
const topJacket = ({ color }) => {
  const m = M(color, { roughness: 0.7 });
  return {
    Spine: torsoShell(m, 0.182),
    ...both('UpperArm', () => capsule(0.07, 0.2, m, -0.14)),
    ...both('LowerArm', () => capsule(0.062, 0.19, m, -0.14)),
  };
};

const bottomShorts = ({ color }) => {
  const m = M(color);
  return { Hips: hipsShell(m), ...both('UpperLeg', () => capsule(0.088, 0.12, m, -0.1)) };
};
const bottomPants = ({ color }) => {
  const m = M(color);
  return {
    Hips: hipsShell(m),
    ...both('UpperLeg', () => capsule(0.088, 0.3, m, -0.215)),
    ...both('LowerLeg', () => capsule(0.07, 0.28, m, -0.2)),
  };
};

const shoe = (mat, sole) => grp(
  mesh(new THREE.BoxGeometry(0.12, 0.1, 0.28), mat, 0, -0.02, 0.06),
  mesh(new THREE.BoxGeometry(0.125, 0.03, 0.285), sole, 0, -0.055, 0.06),
);
const shoesSneakers = ({ color }) => {
  const m = M(color), sole = M(0xf2f2f2);
  return both('Foot', () => shoe(m, sole));
};
const shoesBoots = ({ color }) => {
  const m = M(color, { roughness: 0.6 }), sole = M(0x222222);
  return {
    ...both('Foot', () => shoe(m, sole)),
    ...both('LowerLeg', () => mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.18, 14), m, 0, -0.3, 0)),
  };
};

/* ---------------- Cabeza: gorros y lentes ---------------- */
const headCap = ({ color }) => {
  const m = M(color, { side: THREE.DoubleSide });
  const visor = mesh(new THREE.BoxGeometry(0.17, 0.012, 0.1), m, 0, 0.195, 0.17);
  visor.rotation.x = 0.12;
  return grp(dome(m, 0.15, -0.5), visor);
};
const headTopHat = ({ color }) => {
  const m = M(color, { roughness: 0.5 });
  return grp(
    mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 24), m, 0, 0.215, 0),
    mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.17, 24), m, 0, 0.3, 0),
  );
};

const glasses = (round) => ({ color }) => {
  const frame = M(color, { roughness: 0.4, metalness: 0.3 });
  const lens = M(round ? 0xbfe6ff : 0x111111, { transparent: true, opacity: round ? 0.25 : 0.85, roughness: 0.1 });
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    if (round) {
      g.add(mesh(new THREE.TorusGeometry(0.036, 0.004, 8, 20), frame, s * 0.047, 0.14, 0.135));
      g.add(mesh(new THREE.CircleGeometry(0.036, 20), lens, s * 0.047, 0.14, 0.135));
    } else {
      g.add(mesh(new THREE.BoxGeometry(0.088, 0.05, 0.006), frame, s * 0.047, 0.14, 0.135));
      g.add(mesh(new THREE.BoxGeometry(0.08, 0.042, 0.008), lens, s * 0.047, 0.14, 0.139));
    }
    g.add(mesh(new THREE.BoxGeometry(0.006, 0.006, 0.12), frame, s * 0.088, 0.14, 0.075)); // patilla
  }
  g.add(mesh(new THREE.BoxGeometry(0.02, 0.006, 0.006), frame, 0, 0.145, 0.135)); // puente
  return g;
};

/** Nombre de builder (catalog.json) -> función. Añade aquí nuevas piezas procedurales. */
export const BUILDERS = {
  hairShort, hairLong, hairSpiky,
  browsThin: brows({ w: 0.045, h: 0.008, tilt: 0, y: 0.168 }),
  browsThick: brows({ w: 0.05, h: 0.016, tilt: 0.1, y: 0.168 }),
  browsAngry: brows({ w: 0.05, h: 0.012, tilt: 0.35, y: 0.168 }),
  eyesRound: eyes({ size: 0.022, spacing: 0.045, narrow: 1 }),
  eyesNarrow: eyes({ size: 0.024, spacing: 0.048, narrow: 0.55 }),
  eyesBig: eyes({ size: 0.03, spacing: 0.048, narrow: 1.05 }),
  noseSmall, nosePointed, noseWide,
  mouthSmile, mouthNeutral, mouthOpen,
  topTee, topJacket, bottomShorts, bottomPants, shoesSneakers, shoesBoots,
  headCap, headTopHat,
  glassesRound: glasses(true),
  glassesShades: glasses(false),
};
