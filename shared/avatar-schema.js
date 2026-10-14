// Esquema de configuración de avatar. Se usa en cliente (editor) y servidor (validación).
//
// Config de ejemplo:
// { v: 1,
//   body:  { height: 1, build: 1, skin: '#e0ac80', morphs: { noseSize: 0.4 } },
//   parts: { hair: { id: 'short', color: '#5a3825' }, eyes: { id: 'round', color: '#2e6b3a' }, ... } }
//
// Regla clave: la config solo guarda IDs del catálogo, nunca URLs. Así un cliente
// malicioso no puede hacer que otros jugadores descarguen archivos arbitrarios.

const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v, fallback) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback);
const clampNum = (v, lo, hi, fallback) =>
  Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

export function defaultAvatar(catalog) {
  const parts = {};
  for (const [slot, def] of Object.entries(catalog.slots)) {
    parts[slot] = {
      id: def.options.find(o => o.id === def.default && o.enabled !== false)?.id ?? def.options.find(o => o.enabled !== false).id,
      color: def.defaultColor ?? '#ffffff',
    };
  }
  return {
    v: 1,
    body: { height: 1, build: 1, skin: catalog.body.defaultSkin ?? '#e0ac80', morphs: {} },
    parts,
  };
}

/** Devuelve SIEMPRE una config válida; descarta o corrige lo que no cumpla. */
export function sanitizeAvatar(input, catalog) {
  const out = defaultAvatar(catalog);
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;

  const b = input.body && typeof input.body === 'object' ? input.body : {};
  const [h0, h1] = catalog.body.heightRange ?? [0.9, 1.1];
  const [w0, w1] = catalog.body.buildRange ?? [0.85, 1.2];
  out.body.height = clampNum(b.height, h0, h1, 1);
  out.body.build = clampNum(b.build, w0, w1, 1);
  out.body.skin = hex(b.skin, out.body.skin);
  for (const m of catalog.body.morphs ?? []) {
    const v = b.morphs?.[m.id];
    if (Number.isFinite(v)) out.body.morphs[m.id] = clampNum(v, 0, 1, 0);
  }

  const parts = input.parts && typeof input.parts === 'object' ? input.parts : {};
  for (const [slot, def] of Object.entries(catalog.slots)) {
    const sel = parts[slot];
    const opt = def.options.find((o) => o.id === sel?.id && o.enabled !== false);
    if (opt) out.parts[slot].id = opt.id;
    if (def.colorable) out.parts[slot].color = hex(sel?.color, out.parts[slot].color);
  }
  return out;
}
