import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Consolida mallas rígidas del generador confiable en una skin por tipo de superficie.
// Conserva los 17 huesos; los colores por vértice evitan un material por pieza.
export function batchProcedural(model, boneMap) {
    const bones = [...boneMap.values()];
    model.updateWorldMatrix(true, true);
    const inverseModel = model.matrixWorld.clone().invert();
    const buckets = new Map();
    model.traverse(object => {
        if (!object.isMesh || object.userData.avatarBatch) return;
        if (Array.isArray(object.material)) throw new Error('El generador procedural requiere un material por malla.');
        let bone = object.parent;
        while (bone && !bone.isBone) bone = bone.parent;
        const index = bones.indexOf(bone);
        if (index < 0) throw new Error('Malla procedural sin hueso.');
        const source = object.material;
        const key = `${source.side}:${source.transparent ? source.opacity : 1}`;
        if (!buckets.has(key)) buckets.set(key, { geometries: [], source });
        const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
        geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverseModel, object.matrixWorld));
        for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal'].includes(name)) geometry.deleteAttribute(name);
        const count = geometry.attributes.position.count;
        const skinIndex = new Uint16Array(count * 4), skinWeight = new Float32Array(count * 4), colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            skinIndex[i * 4] = index; skinWeight[i * 4] = 1;
            colors.set([source.color.r, source.color.g, source.color.b], i * 3);
        }
        geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
        geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        buckets.get(key).geometries.push(geometry);
        object.visible = false; // Los originales siguen siendo propiedad del cuerpo/slot.
    });
    const root = new THREE.Group();
    const skeleton = new THREE.Skeleton(bones);
    for (const { geometries, source } of buckets.values()) {
        const geometry = mergeGeometries(geometries);
        for (const temporary of geometries) temporary.dispose();
        const material = new THREE.MeshStandardMaterial({ vertexColors: true, side: source.side,
            transparent: source.transparent, opacity: source.opacity, roughness: source.transparent ? 0.2 : 0.8 });
        const mesh = new THREE.SkinnedMesh(geometry, material);
        mesh.userData.avatarBatch = true;
        mesh.castShadow = true;
        mesh.frustumCulled = false;
        mesh.bind(skeleton, model.matrixWorld);
        root.add(mesh);
    }
    return { root, skeleton, dispose() {
        root.removeFromParent();
        root.traverse(mesh => { if (mesh.isMesh) { mesh.geometry.dispose(); mesh.material.dispose(); } });
        skeleton.dispose();
    } };
}
