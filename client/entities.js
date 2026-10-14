import * as THREE from 'three';

// Solo transforma entidades confirmadas. Los comportamientos se añadirán como sistemas aparte.
export class EntityView {
    constructor(scene) { this.scene = scene; this.entries = new Map(); this.revision = 0; }
    reset(snapshot) {
        this.clear();
        for (const entity of snapshot.entities) this.upsert(entity);
        this.revision = snapshot.revision;
    }
    upsert(entity) {
        let entry = this.entries.get(entity.id);
        if (!entry) {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xe4ad40 }));
            mesh.castShadow = true; mesh.receiveShadow = true;
            mesh.userData.entityId = entity.id;
            this.scene.add(mesh);
            entry = { mesh }; this.entries.set(entity.id, entry);
        }
        entry.entity = entity;
        entry.mesh.position.fromArray(entity.transform.position);
        entry.mesh.rotation.set(...entity.transform.rotation, 'XYZ');
        entry.mesh.scale.fromArray(entity.transform.scale);
    }
    remove(id) {
        const entry = this.entries.get(id);
        if (!entry) return;
        entry.mesh.removeFromParent(); entry.mesh.geometry.dispose(); entry.mesh.material.dispose();
        this.entries.delete(id);
    }
    clear() { for (const id of this.entries.keys()) this.remove(id); this.revision = 0; }
}
