import { readFileSync } from 'node:fs';
import { defaultAvatar, sanitizeAvatar } from '../shared/avatar-schema.js';
import { AVATAR_BUDGET } from '../shared/avatars.js';
import { BUILDERS } from '../client/avatar/builders.js';
import { buildProceduralBody } from '../client/avatar/rig.js';
import { collectOwned, disposeOwned, newOwned } from '../client/avatar/loader.js';
import { isRecord, validId } from '../shared/protocol.js';

function measure(roots) {
    let triangles = 0;
    const surfaces = new Set();
    const owned = newOwned();
    for (const root of roots) {
        collectOwned(root, owned);
        root.traverse(o => { if (o.isMesh) {
            triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
            surfaces.add(`${o.material.side}:${o.material.transparent ? o.material.opacity : 1}`);
        } });
    }
    disposeOwned(owned);
    return { triangles, surfaces: [...surfaces] };
}

export class AvatarService {
    constructor() {
        const catalog = JSON.parse(readFileSync(new URL('../assets/avatars/catalog.json', import.meta.url), 'utf8'));
        if (catalog.version !== 1 || !isRecord(catalog.body) || !isRecord(catalog.slots) || Object.keys(catalog.slots).length > AVATAR_BUDGET.maxParts) throw new Error('INVALID_AVATAR_CATALOG');
        // Solo generadores instalados en esta primera integración. GLB requiere inspector real.
        if (catalog.body.model?.url) throw new Error('GLB de avatar aún no habilitado: falta validación de archivos.');
        const body = buildProceduralBody();
        const boneNames = [...body.bones.keys()];
        this.baseMetrics = measure([body.root]);
        this.boneCount = boneNames.length;
        this.optionMetrics = new Map();
        for (const [slot, def] of Object.entries(catalog.slots)) {
            if (!validId(slot) || ['__proto__', 'constructor', 'prototype'].includes(slot) || !Array.isArray(def.options)
                || !def.options.length || !boneNames.includes(def.attach)) throw new Error('INVALID_AVATAR_SLOT');
            const ids = new Set();
            for (const option of def.options) {
                if (!validId(option.id) || ids.has(option.id)) throw new Error('INVALID_AVATAR_OPTION');
                ids.add(option.id);
                option.assetId = `asset:core:avatar:${slot}:${option.id}`;
                option.core = true; option.immutable = true; option.visibility = 'public';
                if (option.enabled === false) continue;
                if (option.url || option.type === 'glb' || (option.builder && !Object.hasOwn(BUILDERS, option.builder))) throw new Error('UNVALIDATED_AVATAR_ASSET');
                const result = option.builder ? BUILDERS[option.builder]({ color: '#ffffff', skin: '#ffffff' }) : null;
                this.optionMetrics.set(`${slot}:${option.id}`, result ? measure(result.isObject3D ? [result] : Object.values(result)) : { triangles: 0, surfaces: [] });
            }
            if (!def.options.some(o => o.id === def.default && o.enabled !== false)) throw new Error('INVALID_AVATAR_DEFAULT');
        }
        for (const key of ['heightRange', 'buildRange']) {
            const range = catalog.body[key];
            if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite) || range[0] < 0.5 || range[1] > 1.5 || range[0] > 1 || range[1] < 1) throw new Error('INVALID_AVATAR_RANGE');
        }
        this.catalog = catalog;
        this.catalog.core = true; this.catalog.immutable = true; this.catalog.visibility = 'public';
        this.catalog.rigId = 'rig:core:humanoid:1';
        this.catalog.baseAssetId = 'asset:core:avatar:procedural';
        this.default = this.validate(defaultAvatar(catalog));
    }
    publicCatalog() { return structuredClone(this.catalog); }
    validate(input) {
        if (!isRecord(input) || input.v !== 1) throw new Error('INVALID_AVATAR_VERSION');
        const config = sanitizeAvatar(input, this.catalog);
        const costs = [this.baseMetrics, ...Object.entries(config.parts).map(([slot, part]) => this.optionMetrics.get(`${slot}:${part.id}`))];
        const triangles = costs.reduce((sum, cost) => sum + cost.triangles, 0);
        const surfaces = new Set(costs.flatMap(cost => cost.surfaces)).size;
        if (triangles > AVATAR_BUDGET.triangles || this.boneCount > AVATAR_BUDGET.bones || surfaces > AVATAR_BUDGET.materials || surfaces > AVATAR_BUDGET.drawCalls) throw new Error('AVATAR_BUDGET');
        return config;
    }
}

export const avatarService = new AvatarService();
