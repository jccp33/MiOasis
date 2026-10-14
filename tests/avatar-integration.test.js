import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Avatar } from '../client/avatar/avatar.js';
import { avatarService } from '../server/avatar-service.js';
import { AVATAR_BUDGET } from '../shared/avatars.js';
import { defaultAvatar, sanitizeAvatar } from '../shared/avatar-schema.js';

test('esquema instalado descarta URLs, opciones deshabilitadas y proporciones arbitrarias', () => {
    const catalog = avatarService.publicCatalog();
    const input = { v: 1, body: { height: 99, build: -1, skin: 'invalid' },
        parts: { hair: { id: 'custom_example', url: 'https://invalid.test/evil.glb' }, unknown: { id: 'bad' } } };
    const clean = avatarService.validate(input);
    assert.equal(clean.body.height, 1.15);
    assert.equal(clean.body.build, 0.8);
    assert.equal(clean.parts.hair.id, 'short');
    assert.equal(JSON.stringify(clean).includes('https:'), false);
    assert.equal(clean.parts.unknown, undefined);
    assert.throws(() => avatarService.validate({ ...input, v: 99 }), /VERSION/);
    const modified = avatarService.publicCatalog(); modified.slots.hair.options[0].immutable = false;
    assert.equal(avatarService.publicCatalog().slots.hair.options[0].immutable, true);
    assert.equal(sanitizeAvatar([], catalog).v, 1);
    catalog.slots.hair.options.find(o => o.id === 'short').enabled = false;
    assert.equal(defaultAvatar(catalog).parts.hair.id, 'none');
});

test('humanoide independiente, batch dentro del presupuesto y cambios rápidos sin reconstrucciones tardías', async () => {
    const catalog = avatarService.publicCatalog();
    const a = new Avatar(catalog), b = new Avatar(catalog);
    try {
        await Promise.all([a.apply(defaultAvatar(catalog)), b.apply(defaultAvatar(catalog))]);
        assert.equal(a.bones.size, 17);
        assert.notEqual(a.bones.get('Head'), b.bones.get('Head'));
        const config = defaultAvatar(catalog); config.body.skin = '#123456'; config.parts.hair.id = 'long';
        const latest = structuredClone(config); latest.parts.hair.id = 'spiky';
        await Promise.all([a.apply(config), a.apply(latest)]);
        assert.equal(a.config.parts.hair.id, 'spiky');
        assert.equal(a.skinMats[0].color.getHexString(), '123456');
        assert.notEqual(b.skinMats[0].color.getHexString(), '123456');
        let triangles = 0, calls = 0; const materials = new Set();
        a.batch.root.traverse(mesh => {
            if (!mesh.isMesh) return;
            calls++; materials.add(mesh.material);
            triangles += mesh.geometry.attributes.position.count / 3;
            assert.ok(mesh.isSkinnedMesh);
        });
        assert.ok(triangles < AVATAR_BUDGET.triangles);
        assert.ok(calls <= AVATAR_BUDGET.drawCalls);
        assert.ok(materials.size <= AVATAR_BUDGET.materials);
        a.update(0.1, 5, false); b.update(0.1, 0, false);
        assert.notEqual(a.bones.get('LeftUpperLeg').rotation.x, b.bones.get('LeftUpperLeg').rotation.x);
        const heaviest = defaultAvatar(catalog);
        for (const [slot, def] of Object.entries(catalog.slots)) {
            heaviest.parts[slot].id = def.options.filter(o => o.enabled !== false).sort((x, y) =>
                avatarService.optionMetrics.get(`${slot}:${y.id}`).triangles - avatarService.optionMetrics.get(`${slot}:${x.id}`).triangles)[0].id;
        }
        await a.apply(avatarService.validate(heaviest));
        assert.ok(a.batch.root.children.length <= AVATAR_BUDGET.drawCalls);
        assert.ok(a.batch.root.children.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count / 3, 0) <= AVATAR_BUDGET.triangles);
        const pending = a.apply(defaultAvatar(catalog)); a.dispose(); await pending;
        assert.equal(a.root.parent, null);
        assert.equal(a.batch.root.parent, null);
    } finally { a.dispose(); b.dispose(); }
});
