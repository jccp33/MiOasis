import { randomUUID } from 'node:crypto';
import { ENTITY_SCHEMA_VERSION, MSG, WORLD_ID, isRecord, validId, validTransform } from '../shared/protocol.js';
import { MemoryEntityStore } from './entity-store.js';
import { AssetCatalog } from './asset-catalog.js';

function canonical(value) {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (isRecord(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
}

export class World {
    constructor(store = new MemoryEntityStore(), id = WORLD_ID, catalog = new AssetCatalog()) {
        if (!validId(id)) throw new Error('WORLD_ID inválido');
        this.id = id;
        this.store = store;
        this.revision = 0;
        this.creatorOperations = new Map();
        this.catalog = catalog;
    }

    snapshot() {
        return { id: this.id, revision: this.revision, entities: this.store.list(), assets: this.catalog.list() };
    }

    apply(session, msg) {
        const reject = (code, message) => ({ reply: { t: MSG.RESULT, opId: msg.opId ?? null, ok: false, code, message } });
        if (!validId(msg.opId)) return reject('INVALID_OPERATION', 'opId debe ser un identificador de 1 a 100 caracteres.');
        const fingerprint = canonical(msg);
        const previous = session.operations.get(msg.opId);
        if (previous) return previous.fingerprint === fingerprint
            ? { reply: previous.reply }
            : reject('OPERATION_CONFLICT', 'Ese opId ya fue usado con otros datos.');
        // No desalojar respuestas: evitar que un reintento cree duplicados al agotar la caché.
        if (session.operations.size >= 1000) return reject('OPERATION_LIMIT', 'Límite del registro de operaciones alcanzado.');
        let result;
        if (session.role !== 'creator') result = reject('FORBIDDEN', 'Esta sesión no tiene permiso de creación.');
        else result = this.#mutate(session, msg, reject);
        session.operations.set(msg.opId, { fingerprint, reply: result.reply });
        return result;
    }

    #mutate(session, msg, reject) {
        let entity;
        if (msg.t === MSG.CREATE) {
            const asset = this.catalog.get(msg.assetId, session);
            if (msg.schemaVersion !== ENTITY_SCHEMA_VERSION || !validTransform(msg.transform)
                || !asset || asset.category !== 'prop' || asset.visibility !== 'public' || asset.kind !== 'builtin'
                || !isRecord(msg.components) || Object.keys(msg.components).length !== 0) {
                return reject('INVALID_ENTITY', 'Se requiere esquema 1, transformación válida, asset conocido y componentes vacíos.');
            }
            if (this.store.list().length >= 100) return reject('ENTITY_LIMIT', 'El mundo admite hasta 100 entidades.');
            entity = { id: `entity:${randomUUID()}`, worldId: this.id, schemaVersion: ENTITY_SCHEMA_VERSION,
                revision: 1, ownerId: session.userId, assetId: msg.assetId,
                transform: structuredClone(msg.transform), components: {} };
        } else {
            if (!validId(msg.entityId)) return reject('INVALID_ENTITY', 'entityId inválido.');
            entity = this.store.get(msg.entityId);
            if (!entity) return reject('NOT_FOUND', 'La entidad no existe.');
            if (entity.ownerId !== session.userId) return reject('FORBIDDEN', 'La entidad pertenece a otro usuario.');
            if (!Number.isSafeInteger(msg.expectedRevision) || msg.expectedRevision !== entity.revision) {
                return reject('REVISION_CONFLICT', 'La entidad cambió; recuperar el estado actual antes de editar.');
            }
            if (msg.t === MSG.UPDATE) {
                if (!validTransform(msg.transform)) return reject('INVALID_ENTITY', 'Transformación inválida.');
                entity.transform = structuredClone(msg.transform);
                entity.revision++;
            }
        }
        const revision = this.revision + 1;
        // Escribir antes de confirmar. Un futuro adaptador duradero deberá preservar este contrato.
        if (msg.t === MSG.DELETE) this.store.delete(entity.id); else this.store.put(entity);
        this.revision = revision;
        const event = msg.t === MSG.DELETE
            ? { t: MSG.REMOVED, worldId: this.id, worldRevision: revision, entityId: entity.id }
            : { t: MSG.ENTITY, worldId: this.id, worldRevision: revision, entity };
        return { reply: { t: MSG.RESULT, opId: msg.opId, ok: true, worldRevision: revision,
            entityId: entity.id, entityRevision: entity.revision, storage: 'memory' }, event };
    }
}
