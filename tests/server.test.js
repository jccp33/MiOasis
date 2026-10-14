import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';
import WebSocket from 'ws';
import { PROTOCOL_VERSION } from '../shared/protocol.js';

test('HTTP y ciclo multijugador resisten entradas inválidas y conexiones perdidas', { timeout: 15000 }, async (t) => {
    const child = spawn(process.execPath, ['server/index.js'], {
        env: { ...process.env, PORT: '0', HEARTBEAT_MS: '150', CREATOR_TOKEN: 'test-creator' }, windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    const clients = [];
    t.after(async () => {
        for (const client of clients) client.terminate();
        if (child.exitCode === null) { child.kill(); await once(child, 'exit'); }
    });
    let output = '';
    const port = await new Promise((resolve, reject) => {
        child.stdout.on('data', (data) => {
            output += data;
            const match = output.match(/localhost:(\d+)/);
            if (match) resolve(Number(match[1]));
        });
        child.once('error', reject);
        child.once('exit', (code) => reject(new Error(`Servidor terminó: ${code}`)));
    });
    const base = `http://localhost:${port}`;
    async function connect(options, creatorToken) {
        const ws = new WebSocket(`ws://localhost:${port}`, options);
        clients.push(ws);
        const inbox = [];
        ws.on('message', (data) => inbox.push(JSON.parse(data)));
        await once(ws, 'open');
        ws.send(JSON.stringify({ t: 'hello', v: PROTOCOL_VERSION, creatorToken }));
        return { ws, inbox, welcome: await waitFor(inbox, (m) => m.t === 'welcome') };
    }
    for (const route of ['/', '/main.js', '/shared/protocol.js', '/vendor/three/build/three.module.js']) {
        assert.equal((await fetch(base + route)).status, 200, route);
    }
    assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
    for (const route of ['/server/index.js', '/package.json', '/%2e%2e%5cpackage.json', '/shared/%2e%2e%5cpackage.json', '/%00']) {
        const status = await new Promise((resolve, reject) => {
            http.get(base + route, (res) => { res.resume(); resolve(res.statusCode); }).on('error', reject);
        });
        assert.ok(status >= 400, `${route}: ${status}`);
    }
    const a = await connect(), b = await connect();
    assert.equal(a.welcome.avatar.v, 1);
    assert.equal(a.welcome.avatarCatalog.immutable, true);
    assert.equal((await fetch(base + '/assets/avatars/catalog.json')).status, 200);
    assert.equal((await fetch(base + '/assets/avatars/hair/private.glb')).status, 404);
    assert.match(a.welcome.id, /^[0-9a-f-]{36}$/);
    assert.notEqual(a.welcome.id, b.welcome.id);
    assert.equal(b.welcome.players[0].id, a.welcome.id);
    await waitFor(a.inbox, (m) => m.t === 'join' && m.player.id === b.welcome.id);
    for (const data of ['null', '[]', '42', '"text"', '{', '{}', '{"t":"state","p":[1,2],"r":0}', '{"t":"state","p":[0,0,0],"r":null}']) a.ws.send(data);
    a.ws.send(JSON.stringify({ t: 'state', p: [999, -10, -999], r: 20 }));
    const snapshot = await waitFor(b.inbox, (m) => m.t === 'snapshot');
    assert.deepEqual(snapshot.players[a.welcome.id].p, [100, 0, -100]);
    assert.ok(Math.abs(snapshot.players[a.welcome.id].r) <= Math.PI);
    const departure = once(b.ws, 'close'); b.ws.close(); await departure;
    await waitFor(a.inbox, (m) => m.t === 'leave' && m.id === b.welcome.id);
    const reconnected = await connect();
    assert.notEqual(reconnected.welcome.id, b.welcome.id);
    assert.equal(reconnected.welcome.players.length, 1);
    const silent = await connect({ autoPong: false });
    await once(silent.ws, 'close');
    await waitFor(a.inbox, (m) => m.t === 'leave' && m.id === silent.welcome.id);
    const big = await connect();
    const bigClosed = once(big.ws, 'close');
    big.ws.send('x'.repeat(4097));
    assert.equal((await bigClosed)[0], 1009);
    const flood = await connect();
    const floodClosed = once(flood.ws, 'close');
    for (let i = 0; i < 65; i++) flood.ws.send('{}');
    assert.equal((await floodClosed)[0], 1008);
    const binary = await connect();
    const binaryClosed = once(binary.ws, 'close'); binary.ws.send(Buffer.from('{}'));
    assert.equal((await binaryClosed)[0], 1003);
    assert.equal((await fetch(base)).status, 200);
    assert.equal(child.exitCode, null);

    // Negociación incompatible no crea jugadores.
    const incompatible = new WebSocket(`ws://localhost:${port}`);
    clients.push(incompatible);
    const versionError = once(incompatible, 'message');
    await once(incompatible, 'open');
    const incompatibleClosed = once(incompatible, 'close');
    incompatible.send(JSON.stringify({ t: 'hello', v: 999 }));
    assert.equal(JSON.parse((await versionError)[0]).code, 'VERSION_MISMATCH');
    assert.equal((await incompatibleClosed)[0], 1002);

    const creator = await connect(undefined, 'test-creator');
    assert.equal(creator.welcome.role, 'creator');
    assert.equal(creator.welcome.world.id, 'world:local');
    const creation = { t: 'entity.create', opId: 'create-1', schemaVersion: 1, assetId: 'asset:builtin:cube', components: {},
        transform: { position: [2, 0.5, 2], rotation: [0, 0, 0], scale: [1, 1, 1] } };
    a.ws.send(JSON.stringify({ ...creation, opId: 'forbidden' }));
    assert.equal((await waitFor(a.inbox, m => m.opId === 'forbidden')).code, 'FORBIDDEN');
    creator.ws.send(JSON.stringify(creation));
    const confirmation = await waitFor(creator.inbox, m => m.opId === creation.opId);
    assert.equal(confirmation.ok, true);
    const created = await waitFor(a.inbox, m => m.t === 'entity.changed');
    assert.equal(created.entity.id, confirmation.entityId);
    assert.deepEqual(created.entity.transform, creation.transform);
    // El mismo intento no vuelve a mutar el mundo.
    creator.ws.send(JSON.stringify(creation));
    assert.deepEqual(await waitFor(creator.inbox, m => m.opId === creation.opId), confirmation);
    const returning = await connect(undefined, 'test-creator');
    assert.equal(returning.welcome.world.entities.length, 1);
    assert.equal(returning.welcome.userId, creator.welcome.userId);
    returning.ws.send(JSON.stringify(creation));
    assert.deepEqual(await waitFor(returning.inbox, m => m.opId === creation.opId), confirmation);
    const update = { t: 'entity.update', opId: 'update-1', entityId: confirmation.entityId, expectedRevision: 1,
        transform: { ...creation.transform, position: [5, 0.5, 2] } };
    creator.ws.send(JSON.stringify(update));
    assert.equal((await waitFor(creator.inbox, m => m.opId === update.opId)).entityRevision, 2);
    assert.equal((await waitFor(a.inbox, m => m.t === 'entity.changed')).entity.transform.position[0], 5);
    returning.ws.send(JSON.stringify({ ...update, opId: 'stale-update' }));
    assert.equal((await waitFor(returning.inbox, m => m.opId === 'stale-update')).code, 'REVISION_CONFLICT');
    creator.ws.send(JSON.stringify({ t: 'entity.delete', opId: 'delete-1', entityId: confirmation.entityId, expectedRevision: 2 }));
    assert.equal((await waitFor(creator.inbox, m => m.opId === 'delete-1')).ok, true);
    assert.equal((await waitFor(a.inbox, m => m.t === 'entity.removed')).entityId, confirmation.entityId);
    const final = await connect();
    assert.equal(final.welcome.world.entities.length, 0);
    const avatar = structuredClone(a.welcome.avatar);
    avatar.parts.hair.id = 'long'; avatar.body.height = 999;
    a.ws.send(JSON.stringify({ t: 'avatar.set', opId: 'avatar-change', avatar }));
    const appearance = await waitFor(final.inbox, m => m.t === 'avatar.changed');
    assert.equal(appearance.id, a.welcome.id);
    assert.equal(appearance.avatar.parts.hair.id, 'long');
    assert.equal(appearance.avatar.body.height, 1.15);
    assert.equal((await waitFor(a.inbox, m => m.opId === 'avatar-change')).ok, true);
    const late = await connect();
    assert.equal(late.welcome.players.find(p => p.id === a.welcome.id).avatar.parts.hair.id, 'long');
    a.ws.send(JSON.stringify({ t: 'avatar.set', opId: 'avatar-invalid', avatar: { v: 99 } }));
    assert.equal((await waitFor(a.inbox, m => m.opId === 'avatar-invalid')).code, 'INVALID_AVATAR');
});

async function waitFor(inbox, predicate) {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
        const index = inbox.findIndex(predicate);
        if (index !== -1) return inbox.splice(index, 1)[0];
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('No llegó el mensaje esperado');
}
