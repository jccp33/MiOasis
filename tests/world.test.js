import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../server/world.js';
import { MemoryEntityStore } from '../server/entity-store.js';

const create = () => ({ t: 'entity.create', opId: 'op:1', schemaVersion: 1, assetId: 'asset:builtin:cube', components: {},
    transform: { position: [0, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } });
const session = () => ({ userId: 'user:a', role: 'creator', operations: new Map() });

test('rechazar entidades inválidas y proteger propiedad y revisiones', () => {
    for (const patch of [{ schemaVersion: 2 }, { assetId: 'missing' }, { components: { script: 'code' } }, { transform: null },
        { transform: { ...create().transform, scale: [0, 1, 1] } },
        { transform: { ...create().transform, position: [101, 0, 0] } }]) {
        const world = new World();
        assert.equal(world.apply(session(), { ...create(), ...patch }).reply.code, 'INVALID_ENTITY');
        assert.equal(world.revision, 0);
    }
    const world = new World(), owner = session();
    const { reply } = world.apply(owner, create());
    const { opId, t, ...rest } = create();
    assert.deepEqual(world.apply(owner, { ...rest, opId, t }).reply, reply);
    assert.equal(world.apply(owner, { ...create(), assetId: 'other' }).reply.code, 'OPERATION_CONFLICT');
    assert.equal(world.snapshot().entities.length, 1);
    const deletion = { t: 'entity.delete', opId: 'delete', entityId: reply.entityId, expectedRevision: 1 };
    assert.equal(world.apply({ ...session(), userId: 'user:b' }, deletion).reply.code, 'FORBIDDEN');
    assert.equal(world.apply(owner, { ...deletion, expectedRevision: 0 }).reply.code, 'REVISION_CONFLICT');
    const copy = world.snapshot(); copy.entities[0].transform.position[0] = 50;
    assert.equal(world.snapshot().entities[0].transform.position[0], 0);
});

test('no confirmar ni aumentar revisión si falla almacenamiento', () => {
    class BrokenStore extends MemoryEntityStore { put() { throw new Error('disk'); } }
    const world = new World(new BrokenStore()), owner = session();
    assert.throws(() => world.apply(owner, create()), /disk/);
    assert.equal(world.revision, 0);
    assert.equal(owner.operations.size, 0);
});
