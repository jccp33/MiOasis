import { WebSocketServer } from 'ws';
import { MSG, PROTOCOL_VERSION, TICK_RATE, isRecord, validId } from '../shared/protocol.js';
import { avatarService } from './avatar-service.js';

export function attachTransport(server, world, players, { heartbeatMs, creatorToken }) {
    const wss = new WebSocketServer({ server, maxPayload: 4096 });
    function send(ws, object) {
        if (ws.readyState !== 1) return;
        if (ws.bufferedAmount > 256 * 1024) return ws.terminate();
        ws.send(JSON.stringify(object), (error) => { if (error) ws.terminate(); });
    }
    function broadcast(object, except) {
        for (const ws of wss.clients) if (ws.session && ws !== except) send(ws, object);
    }
    wss.on('connection', (ws) => {
        ws.alive = true;
        ws.on('error', () => ws.terminate());
        ws.on('pong', () => { ws.alive = true; });
        const handshake = setTimeout(() => ws.close(1008, 'Se requiere hello'), 5000);
        let windowStart = performance.now(), messages = 0;
        ws.on('message', (raw, binary) => {
            if (ws.readyState !== 1) return;
            const now = performance.now();
            if (now - windowStart >= 1000) { windowStart = now; messages = 0; }
            if (++messages > 60) return ws.close(1008, 'Demasiados mensajes');
            if (binary) return ws.close(1003, 'Solo JSON de texto');
            let msg;
            try { msg = JSON.parse(raw); } catch { return; }
            if (!isRecord(msg)) return;
            if (!ws.session) {
                if (msg.t !== MSG.HELLO) {
                    send(ws, { t: MSG.ERROR, code: 'HELLO_REQUIRED', message: 'Envía hello antes de operar.' });
                    return;
                }
                if (msg.v !== PROTOCOL_VERSION) {
                    send(ws, { t: MSG.ERROR, code: 'VERSION_MISMATCH', expectedVersion: PROTOCOL_VERSION, message: 'Versión incompatible; actualiza el cliente.' });
                    return ws.close(1002, 'Version incompatible');
                }
                if (msg.creatorToken !== undefined && (!creatorToken || msg.creatorToken !== creatorToken)) {
                    send(ws, { t: MSG.ERROR, code: 'UNAUTHORIZED', message: 'Credencial de creación inválida.' });
                    return ws.close(1008, 'Credencial invalida');
                }
                clearTimeout(handshake);
                const player = players.create();
                try { player.avatar = avatarService.validate(msg.avatar); }
                catch { player.avatar = structuredClone(avatarService.default); }
                player.avatarRevision = 1;
                const creator = Boolean(creatorToken && msg.creatorToken === creatorToken);
                ws.session = { player, userId: creator ? 'user:local-creator' : `user:guest:${player.id}`, role: creator ? 'creator' : 'visitor', operations: creator ? world.creatorOperations : new Map() };
                send(ws, { t: MSG.WELCOME, v: PROTOCOL_VERSION, ...player,
                    userId: ws.session.userId, role: ws.session.role,
                    avatarCatalog: avatarService.publicCatalog(),
                    players: [...players.entries.values()].filter(p => p.id !== player.id), world: world.snapshot() });
                broadcast({ t: MSG.JOIN, player }, ws);
                return;
            }
            if (msg.t === MSG.STATE) return players.update(ws.session.player, msg);
            if (msg.t === MSG.AVATAR_SET) {
                if (!validId(msg.opId)) return send(ws, { t: MSG.RESULT, opId: null, ok: false, code: 'INVALID_OPERATION', message: 'opId inválido.' });
                try {
                    const avatar = avatarService.validate(msg.avatar);
                    const player = ws.session.player;
                    player.avatar = avatar;
                    player.avatarRevision++;
                    broadcast({ t: MSG.AVATAR_CHANGED, id: player.id, avatar, avatarRevision: player.avatarRevision });
                    send(ws, { t: MSG.RESULT, opId: msg.opId, ok: true, storage: 'session' });
                } catch {
                    send(ws, { t: MSG.RESULT, opId: msg.opId, ok: false, code: 'INVALID_AVATAR', message: 'Configuración de avatar no admitida.' });
                }
                return;
            }
            if ([MSG.CREATE, MSG.UPDATE, MSG.DELETE].includes(msg.t)) {
                try {
                    const { reply, event } = world.apply(ws.session, msg);
                    send(ws, reply);
                    if (event) broadcast(event);
                } catch (error) {
                    console.error('Operación de mundo fallida:', error.message);
                    send(ws, { t: MSG.RESULT, opId: msg.opId ?? null, ok: false, code: 'STORAGE_ERROR', message: 'No se pudo confirmar el cambio.' });
                }
            } else send(ws, { t: MSG.ERROR, code: 'UNKNOWN_MESSAGE', message: 'Mensaje no admitido.' });
        });
        ws.on('close', () => {
            clearTimeout(handshake);
            if (!ws.session) return;
            players.entries.delete(ws.session.player.id);
            broadcast({ t: MSG.LEAVE, id: ws.session.player.id });
        });
    });
    const tick = setInterval(() => {
        const snapshot = players.snapshot();
        if (snapshot) broadcast({ t: MSG.SNAPSHOT, players: snapshot });
    }, 1000 / TICK_RATE);
    const heartbeat = setInterval(() => {
        for (const ws of wss.clients) {
            if (!ws.alive || ws.bufferedAmount > 256 * 1024) { ws.terminate(); continue; }
            ws.alive = false;
            if (ws.readyState === 1) ws.ping(undefined, undefined, (error) => { if (error) ws.terminate(); });
        }
    }, heartbeatMs);
    return { close() {
        clearInterval(tick); clearInterval(heartbeat);
        for (const ws of wss.clients) ws.terminate();
        wss.close();
    } };
}
