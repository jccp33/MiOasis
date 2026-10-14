import * as THREE from 'three';
import { DEFAULT_AVATAR_ID } from '../shared/avatars.js';

/** Avatar placeholder: cápsula + "nariz" que indica el frente (+Z local). */
export function createAvatar(color = 0x4aa3ff) {
    const group = new THREE.Group();
    group.userData.avatarAssetId = DEFAULT_AVATAR_ID;
    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.4, 0.8, 6, 12),
        new THREE.MeshStandardMaterial({ color })
    );
    body.position.y = 0.8; // la base queda en y = 0
    body.castShadow = true;
    const nose = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    nose.position.set(0, 1.1, 0.4);
    nose.castShadow = true;
    group.add(body, nose);
    group.userData.body = body;
    return group;
}

export function setAvatarColor(avatar, color) {
    avatar.userData.body.material.color.set(color);
}

export function disposeAvatar(avatar) {
    avatar.removeFromParent();
    avatar.traverse((object) => {
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material?.dispose();
    });
}
