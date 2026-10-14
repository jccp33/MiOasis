import * as THREE from 'three';
import { Avatar } from './avatar.js';
import { createAvatar, disposeAvatar } from '../avatar.js';

// Mantiene el root de movimiento y un fallback mientras se construye la apariencia.
export class AvatarController {
    constructor(color) {
        this.root = new THREE.Group();
        this.fallback = createAvatar(color);
        this.root.add(this.fallback);
        this.disposed = false;
        this.sequence = 0;
    }
    async apply(catalog, config) {
        if (this.disposed || !catalog || !config) return;
        const sequence = ++this.sequence;
        if (!this.avatar) {
            this.avatar = new Avatar(catalog);
            this.avatar.root.visible = false;
            this.root.add(this.avatar.root);
        }
        await this.avatar.apply(config);
        if (this.disposed || sequence !== this.sequence) return;
        this.avatar.root.visible = true;
        this.root.userData.avatarReady = true;
        if (this.fallback) { disposeAvatar(this.fallback); this.fallback = null; }
    }
    update(dt, speed, airborne) { this.avatar?.update(dt, speed, airborne); }
    dispose() {
        this.disposed = true;
        this.avatar?.dispose();
        if (this.fallback) disposeAvatar(this.fallback);
        this.root.removeFromParent();
    }
}
