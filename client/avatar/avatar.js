import * as THREE from 'three';
import { BUILDERS } from './builders.js';
import { buildProceduralBody, HIPS_Y } from './rig.js';
import { batchProcedural } from './batch.js';
import {
  instantiate, collectBones, collectTintables, rebindSkinned, setMorphs,
  canon, newOwned, collectOwned, disposeOwned,
} from './loader.js';

/**
 * Un avatar = cuerpo (esqueleto) + piezas por slot (pelo, ojos, ropa...).
 *
 *   root   -> lo mueve/rota main.js (posición del jugador, pies en y = 0, frente +Z)
 *   model  -> escala de altura
 *
 * El cuerpo es procedural por defecto, o un GLB humanoide si catalog.body.model.url existe.
 * apply(config) es incremental: solo reconstruye los slots cuyo id/color cambió.
 */
export class Avatar {
  constructor(catalog) {
    this.catalog = catalog;
    this.root = new THREE.Group();
    this.model = new THREE.Group();
    this.root.add(this.model);

    this.bones = new Map();
    this.skinMats = [];
    this.bodyOwned = newOwned();
    this.slots = {};        // slot -> { key, attachments, owned }
    this._want = {};        // slot -> key solicitado (para descartar cargas obsoletas)
    this._ver = {};
    this.config = null;
    this._bodyReady = null;

    this.mixer = null;
    this.actions = {};
    this.currentAction = null;

    this.t = 0; this.phase = 0; this.amp = 0; this.air = 0; this.build = 1;
    this.disposed = false;
    this.batch = null;
  }

  /* ---------------- Cuerpo ---------------- */
  _initBody() {
    return (this._bodyReady ??= (async () => {
      const url = this.catalog.body?.model?.url;
      if (url) {
        try {
          const { scene, animations } = await instantiate(url);
          this.bones = collectBones(scene);
          for (const m of collectTintables(scene, 'Skin')) {
            this.skinMats.push(m);
            this.bodyOwned.mats.add(m);
          }
          this._setupClips(scene, animations);
          this._shadows(scene);
          this.model.add(scene);
          return;
        } catch (e) {
          console.warn('[avatar] GLB base no disponible, uso rig procedural:', e);
        }
      }
      const body = buildProceduralBody();
      this.procedural = true;
      this.bones = body.bones;
      this.skinMats = body.skinMaterials;
      collectOwned(body.root, this.bodyOwned);
      this._shadows(body.root);
      this.model.add(body.root);
      this.restPose = [...this.bones.values()].map(bone => ({ bone, p: bone.position.clone(), q: bone.quaternion.clone(), s: bone.scale.clone() }));
    })());
  }

  _setupClips(scene, clips) {
    if (!clips?.length) return;
    const mixer = new THREE.AnimationMixer(scene);
    for (const clip of clips) {
      const n = clip.name.toLowerCase();
      for (const key of ['idle', 'walk', 'run', 'jump']) {
        if (n.includes(key) && !this.actions[key]) this.actions[key] = mixer.clipAction(clip);
      }
    }
    if (!Object.keys(this.actions).length) return; // clips sin nombres reconocibles: animación procedural
    this.mixer = mixer;
    this.currentAction = this.actions.idle ?? null;
    this.currentAction?.play();
  }

  _shadows(obj) {
    obj.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }

  /* ---------------- Aplicar configuración ---------------- */
  apply(cfg) {
    this.config = cfg;
    const previous = this._applying ?? Promise.resolve();
    return (this._applying = previous.catch(() => {}).then(() => this._apply(cfg)));
  }

  async _apply(cfg) {
    if (this.disposed || this.config !== cfg) return;
    await this._initBody();
    if (this.disposed || this.config !== cfg) return; // llegó una config más nueva mientras cargaba

    this.model.scale.setScalar(cfg.body.height);
    this.build = cfg.body.build;
    for (const m of this.skinMats) m.color.set(cfg.body.skin);
    setMorphs(this.model, cfg.body.morphs);

    await Promise.all(
      Object.entries(this.catalog.slots).map(([slot, def]) => this._applySlot(slot, def, cfg)),
    );
    if (this.disposed || this.config !== cfg || !this.procedural) return;
    this.batch?.dispose();
    for (const { bone, p, q, s } of this.restPose) { bone.position.copy(p); bone.quaternion.copy(q); bone.scale.copy(s); }
    this.batch = batchProcedural(this.model, this.bones);
    this.model.add(this.batch.root);
  }

  async _applySlot(slot, def, cfg) {
    const sel = cfg.parts[slot];
    const opt = def.options.find((o) => o.id === sel?.id) ?? null;
    const color = sel?.color ?? def.defaultColor ?? '#ffffff';
    const key = `${opt?.id}|${color}|${def.usesSkin ? cfg.body.skin : ''}`;
    if (this._want[slot] === key) return;
    this._want[slot] = key;
    const ver = (this._ver[slot] = (this._ver[slot] ?? 0) + 1);

    let built = null;
    if (opt && (opt.builder || opt.url)) {
      try {
        built = await this._build(def, opt, color, cfg.body.skin);
      } catch (e) {
        console.warn(`[avatar] no se pudo construir ${slot}/${opt.id}:`, e);
      }
    }
    if (this.disposed || ver !== this._ver[slot]) { // otra petición más reciente para este slot
      if (built) this._discard(built);
      return;
    }
    if (this.slots[slot]) this._discard(this.slots[slot]);
    this.slots[slot] = { key, attachments: [], owned: newOwned(), ...(built ?? {}) };
    for (const { obj, parent } of this.slots[slot].attachments) parent.add(obj);
  }

  async _build(def, opt, color, skin) {
    const owned = newOwned();
    const attachments = [];
    const bone = (name) => this.bones.get(canon(name)) ?? null;

    if (opt.type === 'glb') {
      const { scene } = await instantiate(opt.url);
      for (const m of collectTintables(scene, 'Tint')) { m.color.set(color); owned.mats.add(m); }

      if (opt.skinned) {
        // Ropa con skinning: se re-vincula al esqueleto base y se cuelga del modelo
        const meshes = [];
        scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
        for (const m of meshes) {
          rebindSkinned(m, this.bones);
          m.removeFromParent();
          attachments.push({ obj: m, parent: this.model });
        }
      } else {
        // Pieza rígida: se pega a un hueso con un offset opcional
        scene.position.set(...(opt.position ?? [0, 0, 0]));
        scene.rotation.set(...(opt.rotation ?? [0, 0, 0]));
        const sc = opt.scale ?? 1;
        if (Array.isArray(sc)) scene.scale.set(...sc); else scene.scale.setScalar(sc);
        attachments.push({ obj: scene, parent: bone(opt.attach ?? def.attach) ?? this.model });
      }
    } else {
      const out = BUILDERS[opt.builder]?.({ color, skin });
      if (!out) throw new Error(`builder desconocido: ${opt.builder}`);
      const entries = out.isObject3D ? [[def.attach, out]] : Object.entries(out);
      for (const [name, obj] of entries) {
        const parent = bone(name);
        if (!parent) continue; // el esqueleto no tiene ese hueso
        collectOwned(obj, owned);
        attachments.push({ obj, parent });
      }
    }
    for (const { obj } of attachments) this._shadows(obj);
    return { attachments, owned };
  }

  _discard(entry) {
    for (const { obj } of entry.attachments) obj.removeFromParent();
    disposeOwned(entry.owned);
  }

  /* ---------------- Animación ---------------- */
  /** speed en m/s sobre el suelo; airborne = en el aire. Llamar cada frame. */
  update(dt, speed = 0, airborne = false) {
    if (!this.bones.size) return; // cuerpo aún cargando
    this.t += dt;
    const state = airborne ? 'jump' : speed > 6.5 ? 'run' : speed > 0.3 ? 'walk' : 'idle';

    if (this.mixer) this._animateClips(dt, state);
    else this._animateProcedural(dt, state, speed);

    // "Complexión": ensancha caderas/torso y contrarresta en la cabeza para que no se deforme.
    // Se aplica DESPUÉS de animar, así los clips no la pisan.
    const b = this.build;
    this.bones.get('Hips')?.scale.set(b, 1, b);
    this.bones.get('Head')?.scale.set(1 / b, 1, 1 / b);
  }

  _animateClips(dt, state) {
    const next = this.actions[state] ?? (state === 'run' ? this.actions.walk : null) ?? this.actions.idle;
    if (next && next !== this.currentAction) {
      next.reset().fadeIn(0.2).play();
      this.currentAction?.fadeOut(0.2);
      this.currentAction = next;
    }
    this.mixer.update(dt);
  }

  _animateProcedural(dt, state, speed) {
    const k = 1 - Math.exp(-12 * dt);
    const moving = state === 'walk' || state === 'run';
    this.amp += ((moving ? Math.min(speed / 5, 1.5) * 0.65 : 0) - this.amp) * k;
    this.air += ((state === 'jump' ? 1 : 0) - this.air) * k;
    this.phase += dt * Math.max(speed, 0) * 1.6;

    const a = this.air, ia = 1 - a;
    const s = Math.sin(this.phase) * this.amp;
    const kneeL = Math.max(0, Math.cos(this.phase)) * this.amp * 1.3;
    const kneeR = Math.max(0, -Math.cos(this.phase)) * this.amp * 1.3;
    // Convención: rotación X negativa = el miembro se mueve hacia delante (+Z)
    const set = (name, x, z = 0) => {
      const b = this.bones.get(name);
      if (b) { b.rotation.x = x; b.rotation.z = z; }
    };

    set('LeftUpperLeg', ia * -s + a * -0.5);
    set('RightUpperLeg', ia * s + a * -0.9);
    set('LeftLowerLeg', ia * kneeL + a * 0.9);
    set('RightLowerLeg', ia * kneeR + a * 0.5);
    set('LeftUpperArm', ia * s * 0.9 + a * -1.2, 0.08 + a * 0.6);
    set('RightUpperArm', ia * -s * 0.9 + a * -1.2, -0.08 - a * 0.6);
    const elbow = -(0.2 + this.amp * 0.5) * ia - 0.4 * a;
    set('LeftLowerArm', elbow);
    set('RightLowerArm', elbow);

    const hips = this.bones.get('Hips');
    if (hips) hips.position.y = HIPS_Y + Math.cos(this.phase * 2) * 0.02 * (this.amp / 0.65);
    const spine = this.bones.get('Spine');
    if (spine) spine.rotation.x = Math.sin(this.t * 2) * 0.015 + this.amp * 0.08;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.batch?.dispose();
    for (const e of Object.values(this.slots)) this._discard(e);
    disposeOwned(this.bodyOwned);
    this.mixer?.stopAllAction();
    this.root.removeFromParent();
  }
}
