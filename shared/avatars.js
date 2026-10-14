// Contrato provisional de integración; los nombres de huesos vienen del rig real.
export const AVATAR_SCHEMA_VERSION = 1;
export const DEFAULT_AVATAR_ID = 'asset:builtin:avatar-capsule';
export const AVATAR_SLOTS = Object.freeze(['hair', 'eyebrows', 'eyes', 'nose', 'mouth', 'ears', 'face', 'headwear', 'glasses', 'top', 'bottom', 'shoes', 'outfit', 'accessory']);

// Presupuestos iniciales, pendientes de perfilado en el equipo de referencia.
export const AVATAR_BUDGET = Object.freeze({ maxParts: 12, triangles: 50000, materials: 8,
    bones: 64, textureBytes: 128 * 1024 * 1024, drawCalls: 16 });
export const ASSET_BUDGET = Object.freeze({ bytes: 10 * 1024 * 1024, triangles: 50000,
    materials: 8, bones: 64, textureBytes: 128 * 1024 * 1024, drawCalls: 16, textureSize: 2048 });
export const STORAGE_TIERS = Object.freeze({
    player: Object.freeze({ maxAssets: 25, maxBytes: 100 * 1024 * 1024 }),
    worldOperator: Object.freeze({ maxAssets: 500, maxBytes: 1024 * 1024 * 1024 }),
});

export function validateMetrics(metrics, limits = ASSET_BUDGET) {
    if (!metrics || typeof metrics !== 'object') throw new Error('METRICS_REQUIRED');
    for (const [name, max] of Object.entries(limits)) {
        if (!Number.isSafeInteger(metrics[name]) || metrics[name] < 0 || metrics[name] > max) throw new Error(`ASSET_BUDGET:${name}`);
    }
}

// resolve debe aplicar permisos de lectura; nunca aceptar medidas declaradas por el navegador.
export function validateAvatar(config, resolve) {
    if (!config || config.schemaVersion !== AVATAR_SCHEMA_VERSION || !Array.isArray(config.parts)
        || config.parts.length > AVATAR_BUDGET.maxParts) throw new Error('INVALID_AVATAR');
    const base = resolve(config.baseAssetId);
    if (!base || base.category !== 'avatar') throw new Error('INVALID_AVATAR_BASE');
    const totals = Object.fromEntries(Object.keys(AVATAR_BUDGET).filter(k => k !== 'maxParts').map(k => [k, base.metrics[k]]));
    const occupied = new Set();
    for (const part of config.parts) {
        if (!part || !AVATAR_SLOTS.includes(part.slot) || occupied.has(part.slot)) throw new Error('INVALID_AVATAR_SLOT');
        const asset = resolve(part.assetId);
        if (!asset || asset.category !== 'avatarPart' || asset.slot !== part.slot || !base.rigId || asset.rigId !== base.rigId) {
            throw new Error('INCOMPATIBLE_AVATAR_PART');
        }
        occupied.add(part.slot);
        for (const name of Object.keys(totals)) totals[name] += asset.metrics[name];
    }
    // Suma conservadora: huesos/materiales compartidos no se descuentan hasta medir deduplicación real.
    for (const [name, value] of Object.entries(totals)) {
        if (!Number.isSafeInteger(value) || value > AVATAR_BUDGET[name]) throw new Error(`AVATAR_BUDGET:${name}`);
    }
    return { config: structuredClone(config), metrics: totals };
}
