import { MSG, PROTOCOL_VERSION } from '../shared/protocol.js';

export class Network {
    /** handlers: { onMessage(msg), onStatus(connected:boolean) } */
    constructor(handlers) {
        this.handlers = handlers;
        this.ws = null;
        this.ready = false;
        this.stopped = false;
        this.retry = null;
        this.pending = new Map();
        this.connect();
    }

    connect() {
        if (this.stopped) return;
        const proto = location.protocol === 'https:' ? 'wss' : 'ws';
        this.ws = new WebSocket(`${proto}://${location.host}`);
        this.ws.onopen = () => {
            let creatorToken;
            let avatar;
            try { creatorToken = sessionStorage.getItem('mioasis.creatorToken') || undefined; } catch {}
            try { avatar = JSON.parse(localStorage.getItem('mioasis.avatar.v1')); } catch {}
            this.ws.send(JSON.stringify({ t: MSG.HELLO, v: PROTOCOL_VERSION, creatorToken, avatar }));
        };
        // La conexión está lista después del estado inicial, no solo del handshake.
        this.ws.onerror = () => this.ws.close();
        this.ws.onclose = () => {
            this.ready = false;
            this.rejectPending('Conexión perdida; recuperar el snapshot y reintentar con el mismo opId.');
            this.handlers.onStatus?.(false);
            if (!this.stopped) this.retry = setTimeout(() => this.connect(), 2000);
        };
        this.ws.onmessage = (ev) => {
            let msg;
            try { msg = JSON.parse(ev.data); } catch { return; }
            if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return;
            if (msg.t === MSG.ERROR) {
                if (['VERSION_MISMATCH', 'UNAUTHORIZED'].includes(msg.code)) this.stopped = true;
                this.handlers.onError?.(msg);
                return;
            }
            if (msg.t === MSG.WELCOME) {
                if (msg.v !== PROTOCOL_VERSION) {
                    this.stop();
                    this.handlers.onError?.({ code: 'VERSION_MISMATCH', message: 'Actualiza el cliente.' });
                    return;
                }
                this.handlers.onMessage(msg);
                this.ready = true;
                this.handlers.onStatus?.(true);
                return;
            }
            if (!this.ready) return;
            if (msg.t === MSG.RESULT) {
                const pending = this.pending.get(msg.opId);
                if (pending) {
                    clearTimeout(pending.timer);
                    this.pending.delete(msg.opId);
                    if (msg.ok) pending.resolve(msg);
                    else pending.reject(Object.assign(new Error(msg.message), { code: msg.code }));
                }
            }
            this.handlers.onMessage(msg);
        };
    }

    send(obj) {
        if (!this.ready || this.ws?.readyState !== WebSocket.OPEN) return false;
        if (this.ws.bufferedAmount > 64 * 1024) { this.ws.close(); return false; }
        this.ws.send(JSON.stringify(obj));
        return true;
    }

    stop() {
        this.stopped = true;
        this.ready = false;
        clearTimeout(this.retry);
        this.ws?.close();
        this.rejectPending('Conexión cerrada.');
    }

    request(message) {
        const opId = message.opId || crypto.randomUUID();
        if (this.pending.has(opId)) return Promise.reject(new Error('La operación ya está pendiente.'));
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(opId);
                reject(new Error(`Sin confirmación para ${opId}; recuperar estado antes de reintentar.`));
            }, 5000);
            this.pending.set(opId, { resolve, reject, timer });
            if (!this.send({ ...message, opId })) {
                clearTimeout(timer); this.pending.delete(opId); reject(new Error('No hay conexión lista.'));
            }
        });
    }

    rejectPending(message) {
        for (const pending of this.pending.values()) {
            clearTimeout(pending.timer); pending.reject(new Error(message));
        }
        this.pending.clear();
    }
}
