import * as THREE from 'three';
import { MSG, TICK_RATE, WORLD_SIZE } from '/shared/protocol.js';
import { Input } from './input.js';
import { AvatarController } from './avatar/controller.js';
import { AvatarEditor } from './avatar/editor.js';
import { Network } from './network.js';
import { EntityView } from './entities.js';

/* ---------- Renderer / Escena / Cámara ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b8e8);
scene.fog = new THREE.Fog(0x87b8e8, 60, 160);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 500);

addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

/* ---------- Luces ---------- */
scene.add(new THREE.HemisphereLight(0xffffff, 0x445533, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
scene.add(sun, sun.target);

/* ---------- Terreno ---------- */
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
    new THREE.MeshStandardMaterial({ color: 0x4f8a4b })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(WORLD_SIZE, WORLD_SIZE / 2, 0x000000, 0x000000);
grid.material.opacity = 0.15;
grid.material.transparent = true;
grid.position.y = 0.01;
scene.add(grid);

/* ---------- Estado local ---------- */
const input = new Input(renderer.domElement);
const localAvatar = new AvatarController();
const me = { id: null, mesh: localAvatar.root, vy: 0, grounded: true };
let avatarCatalog = null, avatarConfig = null, editor = null;
const editButton = document.getElementById('edit-avatar');
scene.add(me.mesh);
const remotes = new Map(); // id -> { mesh, targetPos: Vector3, targetRot }
const entities = new EntityView(scene);
const createButton = document.getElementById('create-test');
const operationStatus = document.getElementById('operation-status');
let fatalError = '';

/* ---------- Red ---------- */
const statusEl = document.getElementById('status');
const countEl = document.getElementById('count');
const updateCount = () => { countEl.textContent = remotes.size + (me.id ? 1 : 0); };
let netAcc = 0, lastSent = '';

function addRemote(data) {
    if (remotes.has(data.id)) return;
    const avatar = new AvatarController(data.color);
    const mesh = avatar.root;
    mesh.position.fromArray(data.p);
    scene.add(mesh);
    remotes.set(data.id, { mesh, avatar, targetPos: mesh.position.clone(), targetRot: data.r });
    avatar.apply(avatarCatalog, data.avatar).catch(error => console.warn('Avatar remoto: se conserva fallback.', error));
    updateCount();
}

function removeRemote(id) {
    const r = remotes.get(id);
    if (!r) return;
    r.avatar.dispose();
    remotes.delete(id);
    updateCount();
}

const net = new Network({
  onError(error) {
    fatalError = error.message;
    statusEl.textContent = fatalError;
    statusEl.className = 'off';
  },
  onStatus(connected) {
    statusEl.textContent = connected ? 'conectado' : (fatalError || 'reconectando…');
    statusEl.className = connected ? 'ok' : 'off';
    if (!connected) {
        me.id = null;
        editButton.disabled = true;
        editor?.close();
        createButton.hidden = true;
        entities.clear();
        input.reset();
        for (const id of [...remotes.keys()]) removeRemote(id);
        updateCount();
    }
  },
  onMessage(msg) {
        switch (msg.t) {
        case MSG.WELCOME:
            fatalError = '';
            entities.reset(msg.world);
            createButton.hidden = msg.role !== 'creator';
            me.id = msg.id;
            avatarCatalog = msg.avatarCatalog;
            avatarConfig = msg.avatar;
            localAvatar.apply(avatarCatalog, avatarConfig).catch(error => { operationStatus.textContent = 'No se pudo construir el avatar; se conserva el básico.'; console.warn(error); });
            if (!editor && avatarCatalog) editor = new AvatarEditor({ catalog: avatarCatalog, getConfig: () => avatarConfig,
                onToggle(open) { input.enabled = !open; input.reset(); },
                async onSave(config) {
                    await net.request({ t: MSG.AVATAR_SET, avatar: config });
                    try { localStorage.setItem('mioasis.avatar.v1', JSON.stringify(avatarConfig)); } catch {}
                } });
            editButton.disabled = !editor;
            me.mesh.position.fromArray(msg.p);
            me.mesh.rotation.y = 0;
            me.vy = 0;
            me.grounded = msg.p[1] <= 0;
            input.reset();
            netAcc = 0;
            lastSent = '';
            for (const id of [...remotes.keys()]) removeRemote(id); // limpia tras reconexión
            msg.players.forEach(addRemote);
            updateCount();
            break;
        case MSG.AVATAR_CHANGED:
            if (msg.id === me.id) {
                avatarConfig = msg.avatar;
                localAvatar.apply(avatarCatalog, avatarConfig).catch(error => console.warn(error));
            } else {
                const remote = remotes.get(msg.id);
                remote?.avatar.apply(avatarCatalog, msg.avatar).catch(error => console.warn(error));
            }
            break;
        case MSG.ENTITY:
            if (msg.worldRevision !== entities.revision + 1) { net.ws.close(); break; }
            entities.upsert(msg.entity);
            entities.revision = msg.worldRevision;
            break;
        case MSG.REMOVED:
            if (msg.worldRevision !== entities.revision + 1) { net.ws.close(); break; }
            entities.remove(msg.entityId);
            entities.revision = msg.worldRevision;
            break;
        case MSG.JOIN:
            addRemote(msg.player);
            break;
        case MSG.LEAVE:
            removeRemote(msg.id);
            break;
        case MSG.SNAPSHOT:
            for (const [id, s] of Object.entries(msg.players)) {
            const r = remotes.get(id);
            if (!r) continue;
            r.targetPos.fromArray(s.p);
            r.targetRot = s.r;
            }
            break;
        }
    },
});

editButton.addEventListener('click', () => editor?.toggle());
addEventListener('keydown', event => {
    if (event.code === 'KeyV' && !event.repeat && me.id && !['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) editor?.toggle();
});

createButton.addEventListener('click', async () => {
    const p = me.mesh.position;
    createButton.disabled = true;
    try {
        await net.request({ t: MSG.CREATE, schemaVersion: 1, assetId: 'asset:builtin:cube', components: {},
            transform: { position: [Math.max(-100, Math.min(100, p.x + 2)), 0.5, p.z], rotation: [0, 0, 0], scale: [1, 1, 1] } });
        operationStatus.textContent = 'Cubo confirmado (memoria temporal).';
    } catch (error) { operationStatus.textContent = error.message; }
    finally { createButton.disabled = false; }
});

/* ---------- Utilidades ---------- */
const lerpAngle = (a, b, t) => {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
};

/* ---------- Actualización del jugador local ---------- */
const WALK = 5, RUN = 9, JUMP = 7, GRAVITY = 20;
const half = WORLD_SIZE / 2;

function updateLocal(dt) {
    const { x: ax, z: az } = input.axis;
    const sin = Math.sin(input.yaw), cos = Math.cos(input.yaw);
    // forward = (-sin, -cos), right = (cos, -sin) respecto a la cámara
    let dx = cos * ax - sin * az;
    let dz = -sin * ax - cos * az;
    const len = Math.hypot(dx, dz);
    if (len > 0) {
        dx /= len; dz /= len;
        const speed = input.running ? RUN : WALK;
        me.mesh.position.x += dx * speed * dt;
        me.mesh.position.z += dz * speed * dt;
        me.mesh.rotation.y = lerpAngle(me.mesh.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-14 * dt));
    }
    if (input.consumeJump() && me.grounded) { 
        me.vy = JUMP; 
        me.grounded = false; 
    }
    me.vy -= GRAVITY * dt;
    me.mesh.position.y += me.vy * dt;
    if (me.mesh.position.y <= 0) { 
        me.mesh.position.y = 0; 
        me.vy = 0; 
        me.grounded = true; 
    }
    me.mesh.position.x = Math.max(-half, Math.min(half, me.mesh.position.x));
    me.mesh.position.z = Math.max(-half, Math.min(half, me.mesh.position.z));
}

function updateCamera() {
    const t = me.mesh.position;
    const d = 7, cp = Math.cos(input.pitch);
    camera.position.set(
        t.x + Math.sin(input.yaw) * cp * d,
        t.y + 1.5 + Math.sin(input.pitch) * d,
        t.z + Math.cos(input.yaw) * cp * d
    );
    camera.lookAt(t.x, t.y + 1.5, t.z);
    // El "sol" sigue al jugador para que las sombras siempre cubran su zona
    sun.position.set(t.x + 30, 50, t.z + 20);
    sun.target.position.copy(t);
}

/* ---------- Envío de estado (20 Hz, solo si cambió) ---------- */
function sendState(dt) {
    netAcc += dt;
    if (netAcc < 1 / TICK_RATE) return;
    netAcc = 0;
    const p = me.mesh.position;
    const payload = { 
        t: MSG.STATE, 
        p: [
            +p.x.toFixed(2), 
            +p.y.toFixed(2), 
            +p.z.toFixed(2)], 
        r: +me.mesh.rotation.y.toFixed(3) 
    };
    const key = JSON.stringify(payload);
    if (key === lastSent) return;
    if (net.send(payload)) lastSent = key;
}

/* ---------- Loop principal ---------- */
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    const previous = me.mesh.position.clone();
    if (me.id && input.enabled) updateLocal(dt);
    localAvatar.update(dt, Math.hypot(me.mesh.position.x - previous.x, me.mesh.position.z - previous.z) / Math.max(dt, 0.001), !me.grounded);
    sendState(dt);
    // Interpolación de jugadores remotos
    const k = 1 - Math.exp(-12 * dt);
    for (const r of remotes.values()) {
        const previous = r.mesh.position.clone();
        r.mesh.position.lerp(r.targetPos, k);
        r.mesh.rotation.y = lerpAngle(r.mesh.rotation.y, r.targetRot, k);
        r.avatar.update(dt, Math.hypot(r.mesh.position.x - previous.x, r.mesh.position.z - previous.z) / Math.max(dt, 0.001), r.mesh.position.y > 0.05);
    }
    updateCamera();
    renderer.render(scene, camera);
});

addEventListener('pagehide', () => net.stop());
addEventListener('pageshow', (event) => { if (event.persisted) location.reload(); });
