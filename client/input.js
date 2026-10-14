const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export class Input {
    constructor(canvas) {
        this.keys = new Set();
        this.enabled = true;
        this.yaw = 0;
        this.pitch = 0.4;
        this.locked = false;
        this.jumpQueued = false;
        const blocked = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        addEventListener('keydown', (e) => {
            if (!this.enabled || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(e.target?.tagName) || e.target?.isContentEditable) return;
            if (blocked.includes(e.code)) e.preventDefault();
            if (e.code==='Space' && !e.repeat) this.jumpQueued = true;
            this.keys.add(e.code);
        });
        addEventListener('keyup', (e) => this.keys.delete(e.code));
        addEventListener('blur', () => this.reset());
        document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset(); });
        canvas.addEventListener('click', () => { 
            if (!this.enabled) return;
            if (!this.locked) {
                try { canvas.requestPointerLock()?.catch(() => this.reset()); }
                catch { this.reset(); }
            }
        });
        document.addEventListener('pointerlockchange', () => {
            this.locked = document.pointerLockElement === canvas;
            if (!this.locked) this.reset();
        });
        document.addEventListener('mousemove', (e) => {
            if (!this.locked) return;
            this.yaw -= e.movementX * 0.0025;
            this.pitch = clamp(this.pitch + e.movementY * 0.0025, 0.05, 1.35);
        });
    }

    reset() {
        this.keys.clear();
        this.jumpQueued = false;
    }

    /** x: derecha(+)/izquierda(-), z: adelante(+)/atrás(-) */
    get axis() {
        const k = this.keys;
        const x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
        const z = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
        return { x, z };
    }

    get running() {
        return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    }

    consumeJump() {
        const j = this.jumpQueued;
        this.jumpQueued = false;
        return j;
    }
}
