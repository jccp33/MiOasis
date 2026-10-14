// Compartido entre servidor (Node) y cliente (navegador).
export const MSG = Object.freeze({
    HELLO: 'hello',
    AVATAR_SET: 'avatar.set',
    AVATAR_CHANGED: 'avatar.changed',
    ERROR: 'error',
    CREATE: 'entity.create',
    UPDATE: 'entity.update',
    DELETE: 'entity.delete',
    RESULT: 'operation.result',
    ENTITY: 'entity.changed',
    REMOVED: 'entity.removed',
    WELCOME: 'welcome',   // server -> client: tu id + jugadores existentes
    JOIN: 'join',         // server -> clients: entró un jugador
    LEAVE: 'leave',       // server -> clients: salió un jugador
    STATE: 'state',       // client -> server: mi posición/rotación
    SNAPSHOT: 'snapshot', // server -> clients: posiciones de todos
});

export const TICK_RATE = 20;     // Hz de red
export const WORLD_SIZE = 200;   // lado del terreno (metros)
export const PROTOCOL_VERSION = 1;
export const ENTITY_SCHEMA_VERSION = 1;
export const WORLD_ID = 'world:local';

export const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
export const validId = (value) => typeof value === 'string' && /^[a-zA-Z0-9:_-]{1,100}$/.test(value);

export function validTransform(value) {
    const vector = (v, min, max) => Array.isArray(v) && v.length === 3 && v.every(n => Number.isFinite(n) && n >= min && n <= max);
    return isRecord(value) && vector(value.position, -WORLD_SIZE / 2, WORLD_SIZE / 2)
        && value.position[1] >= 0 && value.position[1] <= 50
        && vector(value.rotation, -Math.PI, Math.PI) && vector(value.scale, 0.01, 100);
}
