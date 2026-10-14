import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isRecord, validId } from '../shared/protocol.js';
import { AVATAR_SLOTS, STORAGE_TIERS, validateMetrics, validateAvatar } from '../shared/avatars.js';

const core = JSON.parse(readFileSync(new URL('../assets/catalog/core.json', import.meta.url), 'utf8'));
if (core.schemaVersion !== 1 || !Array.isArray(core.assets)) throw new Error('INVALID_CORE_CATALOG');
const coreIds = new Set();
const basics = core.assets.map(asset => {
    if (!validId(asset.id) || !asset.id.startsWith('asset:builtin:') || coreIds.has(asset.id)
        || asset.kind !== 'builtin' || !['cube', 'avatar-capsule'].includes(asset.primitive)
        || asset.category !== (asset.primitive === 'cube' ? 'prop' : 'avatar') || asset.rigId !== null) throw new Error('INVALID_CORE_ASSET');
    validateMetrics(asset.metrics);
    coreIds.add(asset.id);
    return { ...asset, schemaVersion: 1, version: 1, ownerId: 'system:core', visibility: 'public', immutable: true, core: true };
});
const validBoneName = value => typeof value === 'string' && value.length > 0 && value.length <= 128 && !/[\u0000-\u001f]/.test(value);

export class AssetCatalog {
    #assets = new Map(basics.map(asset => [asset.id, structuredClone(asset)]));
    #rigs = new Map();
    constructor({ rigs = [], isReferenced = () => true } = {}) {
        // Solo configuración instalada por el operador, nunca mensajes del cliente.
        for (const rig of rigs) {
            if (!validId(rig.id) || !Array.isArray(rig.bones) || !rig.bones.length || rig.bones.length > 64
                || !rig.bones.every(validBoneName) || new Set(rig.bones).size !== rig.bones.length || !isRecord(rig.sockets)) throw new Error('INVALID_RIG');
            for (const [slot, bone] of Object.entries(rig.sockets)) {
                if (!AVATAR_SLOTS.includes(slot) || !rig.bones.includes(bone)) throw new Error('INVALID_RIG_SOCKET');
            }
            if (this.#rigs.has(rig.id)) throw new Error('DUPLICATE_RIG');
            this.#rigs.set(rig.id, structuredClone(rig));
        }
        this.isReferenced = isReferenced;
    }
    get(id, principal = {}) {
        const asset = this.#assets.get(id);
        if (!asset || (asset.visibility !== 'public' && asset.ownerId !== principal.userId)) return null;
        return structuredClone(asset);
    }
    list(principal = {}) {
        return [...this.#assets.keys()].map(id => this.get(id, principal)).filter(Boolean);
    }
    usage(principal) {
        const owned = [...this.#assets.values()].filter(asset => !asset.core && asset.ownerId === principal.userId);
        return { count: owned.length, bytes: owned.reduce((sum, asset) => sum + asset.metrics.bytes, 0) };
    }
    register(principal, manifest, measured) {
        // principal y measured provienen exclusivamente de servicios confiables del servidor.
        if (!validId(principal?.userId)) throw new Error('AUTH_REQUIRED');
        const tier = Object.hasOwn(STORAGE_TIERS, principal.storageTier) ? STORAGE_TIERS[principal.storageTier] : null;
        if (!tier) throw new Error('INVALID_STORAGE_TIER');
        if (!isRecord(manifest) || manifest.schemaVersion !== 1 || !['avatar', 'avatarPart', 'prop'].includes(manifest.category)
            || !['public', 'private'].includes(manifest.visibility) || manifest.kind !== 'glb'
            || !/^[a-f0-9]{64}$/.test(manifest.sha256) || typeof manifest.license !== 'string'
            || !manifest.license.trim() || manifest.license.length > 200 || typeof manifest.author !== 'string'
            || !manifest.author.trim() || manifest.author.length > 200) throw new Error('INVALID_ASSET');
        // No permitir apropiarse de IDs oficiales ni fijar campos de autoridad.
        for (const key of ['id', 'ownerId', 'immutable', 'core', 'metrics', 'storageTier', 'url', 'path']) {
            if (Object.hasOwn(manifest, key)) throw new Error('SERVER_OWNED_FIELD');
        }
        validateMetrics(measured);
        const rigId = manifest.rigId ?? null;
        if (rigId !== null && !this.#rigs.has(rigId)) throw new Error('UNKNOWN_RIG');
        if (manifest.category === 'avatar' && (!rigId || measured.bones === 0)) throw new Error('RIG_REQUIRED');
        if (manifest.category === 'avatarPart') {
            const rig = this.#rigs.get(rigId);
            if (!rig || !AVATAR_SLOTS.includes(manifest.slot) || !rig.sockets[manifest.slot]
                || !['rigid', 'skinned'].includes(manifest.binding)) throw new Error('INVALID_ATTACHMENT');
            if (manifest.binding === 'skinned' && measured.bones === 0) throw new Error('RIG_REQUIRED');
        }
        const usage = this.usage(principal);
        if (usage.count + 1 > tier.maxAssets || usage.bytes + measured.bytes > tier.maxBytes) throw new Error('STORAGE_QUOTA');
        const asset = { id: `asset:user:${randomUUID()}`, schemaVersion: 1, version: 1, kind: 'glb',
            category: manifest.category, ownerId: principal.userId, visibility: manifest.visibility,
            core: false, immutable: false, sha256: manifest.sha256, author: manifest.author, license: manifest.license,
            rigId, metrics: structuredClone(measured) };
        if (manifest.category === 'avatarPart') { asset.slot = manifest.slot; asset.binding = manifest.binding; }
        this.#assets.set(asset.id, asset);
        return structuredClone(asset);
    }
    remove(principal, id) {
        const asset = this.#assets.get(id);
        if (!asset) throw new Error('NOT_FOUND');
        if (asset.core || asset.immutable) throw new Error('IMMUTABLE_ASSET');
        if (!principal?.userId || asset.ownerId !== principal.userId) throw new Error('FORBIDDEN');
        if (this.isReferenced(id)) throw new Error('ASSET_IN_USE');
        this.#assets.delete(id);
    }
    validateAvatar(principal, config, { shared = false } = {}) {
        return validateAvatar(config, id => {
            const asset = this.get(id, principal);
            // La selección privada no habilita distribuir sus bytes a todos los espectadores.
            return shared && asset?.visibility !== 'public' ? null : asset;
        });
    }
}
