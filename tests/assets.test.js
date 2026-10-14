import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AssetCatalog } from '../server/asset-catalog.js';
import { World } from '../server/world.js';
import { DEFAULT_AVATAR_ID, STORAGE_TIERS } from '../shared/avatars.js';
import { createAvatar, disposeAvatar } from '../client/avatar.js';

const player = { userId: 'user:alice', storageTier: 'player' };
const operator = { userId: 'user:operator', storageTier: 'worldOperator' };
const rig = { id: 'rig:test:1', bones: ['root', 'head'], sockets: { hair: 'head', eyes: 'head', nose: 'head' } };
const metrics = (patch = {}) => ({ bytes: 1000, triangles: 100, materials: 1, bones: 2, textureBytes: 4096, drawCalls: 1, textureSize: 32, ...patch });
const manifest = (patch = {}) => ({ schemaVersion: 1, kind: 'glb', category: 'avatar', rigId: rig.id,
    visibility: 'private', sha256: 'a'.repeat(64), author: 'Test', license: 'test-permission', ...patch });

test('básicos públicos protegidos, copias aisladas y avatar actual disponible', () => {
    const catalog = new AssetCatalog();
    assert.equal(catalog.get(DEFAULT_AVATAR_ID).visibility, 'public');
    for (const basic of catalog.list()) {
        assert.equal(basic.immutable, true);
        assert.throws(() => catalog.remove({ userId: 'system:core' }, basic.id), /IMMUTABLE/);
    }
    const copy = catalog.get(DEFAULT_AVATAR_ID); copy.visibility = 'private';
    assert.equal(catalog.get(DEFAULT_AVATAR_ID).visibility, 'public');
    assert.equal(catalog.usage(player).count, 0);
    assert.equal(catalog.validateAvatar({}, { schemaVersion: 1, baseAssetId: DEFAULT_AVATAR_ID, parts: [] }).config.baseAssetId, DEFAULT_AVATAR_ID);
    const avatar = createAvatar(); let triangles = 0;
    avatar.traverse(mesh => { if (mesh.geometry) triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3; });
    assert.equal(avatar.userData.avatarAssetId, DEFAULT_AVATAR_ID);
    assert.equal(catalog.get(DEFAULT_AVATAR_ID).metrics.triangles, triangles);
    disposeAvatar(avatar);
});

test('privacidad, propiedad y prevención de apropiación de assets básicos', () => {
    const catalog = new AssetCatalog({ rigs: [rig], isReferenced: () => false });
    const privateAsset = catalog.register(player, manifest(), metrics());
    assert.equal(catalog.get(privateAsset.id), null);
    assert.equal(catalog.get(privateAsset.id, operator), null);
    assert.ok(catalog.get(privateAsset.id, player));
    assert.equal(catalog.list().some(a => a.id === privateAsset.id), false);
    assert.throws(() => catalog.remove(operator, privateAsset.id), /FORBIDDEN/);
    assert.throws(() => catalog.register(player, manifest({ id: DEFAULT_AVATAR_ID }), metrics()), /SERVER_OWNED/);
    assert.throws(() => catalog.register(player, manifest({ storageTier: 'worldOperator' }), metrics()), /SERVER_OWNED/);
    const world = new World(undefined, undefined, catalog);
    assert.equal(world.snapshot().assets.some(a => a.id === privateAsset.id), false);
    catalog.remove(player, privateAsset.id);
    assert.equal(catalog.usage(player).count, 0);
});

test('operador dispone de más catálogo, no de avatares más pesados', () => {
    const catalog = new AssetCatalog({ rigs: [rig] });
    for (let i = 0; i < STORAGE_TIERS.player.maxAssets; i++) catalog.register(player, manifest(), metrics());
    assert.throws(() => catalog.register(player, manifest(), metrics()), /STORAGE_QUOTA/);
    for (let i = 0; i <= STORAGE_TIERS.player.maxAssets; i++) catalog.register(operator, manifest(), metrics());
    assert.equal(catalog.usage(operator).count, 26);
    for (const principal of [player, operator]) {
        assert.throws(() => catalog.register(principal, manifest(), metrics({ triangles: 50001 })), /ASSET_BUDGET/);
    }
    const bytesCatalog = new AssetCatalog({ rigs: [rig] });
    for (let i = 0; i < 10; i++) bytesCatalog.register(player, manifest(), metrics({ bytes: 10 * 1024 * 1024 }));
    assert.throws(() => bytesCatalog.register(player, manifest(), metrics()), /STORAGE_QUOTA/);
});

test('compatibilidad, coste de avatar compuesto y exposición pública explícita', () => {
    const catalog = new AssetCatalog({ rigs: [rig] });
    const base = catalog.register(player, manifest({ visibility: 'public' }), metrics({ triangles: 30000 }));
    const hair = catalog.register(player, manifest({ category: 'avatarPart', slot: 'hair', binding: 'rigid' }), metrics({ bones: 0, triangles: 25000 }));
    const config = { schemaVersion: 1, baseAssetId: base.id, parts: [{ slot: 'hair', assetId: hair.id }] };
    assert.throws(() => catalog.validateAvatar(player, config), /AVATAR_BUDGET:triangles/);
    assert.throws(() => catalog.validateAvatar(player, config, { shared: true }), /INCOMPATIBLE/);
    const small = catalog.register(player, manifest({ category: 'avatarPart', slot: 'eyes', binding: 'rigid', visibility: 'public' }), metrics({ bones: 0 }));
    const valid = { schemaVersion: 1, baseAssetId: base.id, parts: [{ slot: 'eyes', assetId: small.id }] };
    assert.equal(catalog.validateAvatar(player, valid, { shared: true }).metrics.triangles, 30100);
    assert.throws(() => catalog.validateAvatar(player, { ...valid, parts: [...valid.parts, ...valid.parts] }), /SLOT/);
    assert.throws(() => catalog.register(player, manifest({ rigId: 'unknown' }), metrics()), /UNKNOWN_RIG/);
    assert.throws(() => catalog.remove(player, base.id), /ASSET_IN_USE/);
});
