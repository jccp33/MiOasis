import { randomUUID } from 'node:crypto';
import { WORLD_SIZE } from '../shared/protocol.js';

export class Players {
    entries = new Map();
    dirty = false;
    create() {
        let id;
        do { id = randomUUID(); } while (this.entries.has(id));
        const player = { id, color: Math.floor(Math.random() * 0xffffff), p: [(Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6], r: 0 };
        this.entries.set(id, player);
        return player;
    }
    update(player, { p, r }) {
        if (!Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite) || !Number.isFinite(r)) return;
        const half = WORLD_SIZE / 2;
        const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
        player.p = [clamp(p[0], -half, half), clamp(p[1], 0, 50), clamp(p[2], -half, half)];
        player.r = Math.atan2(Math.sin(r), Math.cos(r));
        this.dirty = true;
    }
    snapshot() {
        if (!this.dirty) return null;
        this.dirty = false;
        return Object.fromEntries([...this.entries].map(([id, p]) => [id, { p: p.p, r: p.r }]));
    }
}
