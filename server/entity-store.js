// Contrato de almacenamiento independiente del transporte. Volátil hasta la etapa 5.
export class MemoryEntityStore {
    #entities = new Map();
    list() { return structuredClone([...this.#entities.values()]); }
    get(id) { return structuredClone(this.#entities.get(id)); }
    put(entity) { this.#entities.set(entity.id, structuredClone(entity)); }
    delete(id) { this.#entities.delete(id); }
}
