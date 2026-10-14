import * as THREE from 'three';
import { Avatar } from './avatar.js';
import { defaultAvatar, sanitizeAvatar } from '/shared/avatar-schema.js';

const el = (tag, props = {}, ...kids) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const between = ([lo, hi]) => lo + Math.random() * (hi - lo);
const randomHex = () => `#${new THREE.Color().setHSL(Math.random(), 0.6, 0.5).getHexString()}`;

/**
 * Editor de avatar: panel modal con vista previa 3D.
 *   new AvatarEditor({ catalog, getConfig, onSave, onToggle })
 *   editor.toggle() / open() / close() / isOpen
 */
export class AvatarEditor {
  constructor({ catalog, getConfig, onSave, onToggle }) {
    this.catalog = catalog;
    this.getConfig = getConfig;
    this.onSave = onSave;
    this.onToggle = onToggle;
    this.cfg = null;
    this.isOpen = false;
    this.ui = { body: {}, morphs: {}, slots: {} };
    this._build();
  }

  /* ---------------- DOM ---------------- */
  _build() {
    const { catalog } = this;
    const controls = el('div', { className: 'ae-controls' });

    controls.append(el('h3', { textContent: 'Cuerpo' }));
    const b = catalog.body;
    this.ui.body.height = this._slider(controls, 'Altura', b.heightRange, 0.01, (v) => this._change((c) => { c.body.height = v; }));
    this.ui.body.build = this._slider(controls, 'Complexión', b.buildRange, 0.01, (v) => this._change((c) => { c.body.build = v; }));
    this.ui.body.skin = this._color(controls, 'Piel', b.skinTones, (v) => this._change((c) => { c.body.skin = v; }));
    for (const m of b.morphs ?? []) {
      this.ui.morphs[m.id] = this._slider(controls, m.label, [0, 1], 0.01, (v) => this._change((c) => { c.body.morphs[m.id] = v; }));
    }

    controls.append(el('h3', { textContent: 'Apariencia' }));
    for (const [slot, def] of Object.entries(catalog.slots)) {
      const select = el('select');
      for (const o of def.options) {
        if (o.enabled !== false) select.append(el('option', { value: o.id, textContent: o.label }));
      }
      select.onchange = () => {
        this._change((c) => { c.parts[slot].id = select.value; });
        this._syncSlot(slot);
      };
      controls.append(el('div', { className: 'ae-row' }, el('label', { textContent: def.label }), select));
      const color = def.colorable
        ? this._color(controls, null, def.palette ?? [], (v) => this._change((c) => { c.parts[slot].color = v; }))
        : null;
      this.ui.slots[slot] = { select, color };
    }

    const btn = (text, cls, fn) => el('button', { textContent: text, className: cls, onclick: fn });
    const footer = el('div', { className: 'ae-footer' },
      btn('Aleatorio', 'ae-ghost', () => this._randomize()),
      btn('Restablecer', 'ae-ghost', () => this._reset()),
      el('span', { className: 'ae-spacer' }),
      btn('Cancelar', 'ae-ghost', () => this.close()),
      (this.saveButton = btn('Guardar', 'ae-primary', () => this._save())),
    );

    this.canvasHost = el('div', { className: 'ae-preview' },
      el('p', { className: 'ae-hint', textContent: 'Arrastra para girar' }));
    const panel = el('div', { className: 'ae-panel', role: 'dialog', ariaLabel: 'Editor de avatar' },
      this.canvasHost, el('div', { className: 'ae-side' }, controls, footer));
    this.root = el('div', { id: 'avatar-editor', hidden: true }, panel);
    panel.setAttribute('aria-modal', 'true');
    this.status = el('p', { className: 'ae-status', role: 'status' });
    footer.before(this.status);
    this.root.addEventListener('keydown', event => {
      if (event.code === 'Escape') { event.preventDefault(); event.stopPropagation(); this.close(); }
      if (event.key === 'Tab') {
        const controls = [...this.root.querySelectorAll('button:not(:disabled),input,select')].filter(node => node.offsetParent !== null);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    });
    document.body.append(this.root);
  }

  _slider(host, label, [min, max], step, onInput) {
    const input = el('input', { type: 'range', min, max, step });
    input.oninput = () => onInput(parseFloat(input.value));
    host.append(el('div', { className: 'ae-row' }, el('label', { textContent: label }), input));
    return input;
  }

  /** Paleta de muestras + selector libre. Devuelve { wrap, input }. */
  _color(host, label, palette, onPick) {
    const input = el('input', { type: 'color', ariaLabel: label ?? 'Color' });
    input.oninput = () => onPick(input.value);
    const wrap = el('div', { className: 'ae-colors' });
    for (const c of palette) {
      const sw = el('button', { className: 'ae-swatch', title: c, ariaLabel: `Color ${c}` });
      sw.style.background = c;
      sw.onclick = () => { input.value = c; onPick(c); };
      wrap.append(sw);
    }
    wrap.append(input);
    host.append(label
      ? el('div', { className: 'ae-row' }, el('label', { textContent: label }), wrap)
      : wrap);
    return { wrap, input };
  }

  /* ---------------- Vista previa ---------------- */
  _initPreview() {
    if (this.renderer) return;
    const W = 300, H = 400;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(W, H);
    this.canvasHost.prepend(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 50);
    this.camera.position.set(0, 1.15, 4.6);
    this.camera.lookAt(0, 0.9, 0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2, 4, 3);
    this.scene.add(key);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40), new THREE.MeshStandardMaterial({ color: 0x2a3142 }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    this.preview = new Avatar(this.catalog);
    this.preview.root.rotation.y = 0.35;
    this.scene.add(this.preview.root);
    this.clock = new THREE.Clock();

    let drag = null;
    const cv = this.renderer.domElement;
    cv.onpointerdown = (e) => { drag = e.clientX; cv.setPointerCapture(e.pointerId); };
    cv.onpointermove = (e) => {
      if (drag === null) return;
      this.preview.root.rotation.y += (e.clientX - drag) * 0.01;
      drag = e.clientX;
    };
    cv.onpointerup = () => { drag = null; };

    this._loop = () => {
      if (!this.isOpen) return;
      this.preview.update(Math.min(this.clock.getDelta(), 0.1), 0, false);
      this.renderer.render(this.scene, this.camera);
      this.frame = requestAnimationFrame(this._loop);
    };
  }

  /* ---------------- Estado ---------------- */
  _change(mutator) {
    mutator(this.cfg);
    this.preview.apply(structuredClone(this.cfg)).catch(error => { this.status.textContent = 'No se pudo actualizar la vista previa.'; console.warn(error); });
  }

  _syncSlot(slot) {
    const { select, color } = this.ui.slots[slot];
    select.value = this.cfg.parts[slot].id;
    if (color) {
      color.input.value = this.cfg.parts[slot].color;
      color.wrap.hidden = this.cfg.parts[slot].id === 'none';
    }
  }

  _syncUI() {
    const { body } = this.cfg;
    this.ui.body.height.value = body.height;
    this.ui.body.build.value = body.build;
    this.ui.body.skin.input.value = body.skin;
    for (const [id, input] of Object.entries(this.ui.morphs)) input.value = body.morphs[id] ?? 0;
    for (const slot of Object.keys(this.ui.slots)) this._syncSlot(slot);
    this.preview.apply(structuredClone(this.cfg)).catch(error => { this.status.textContent = 'No se pudo actualizar la vista previa.'; console.warn(error); });
  }

  _randomize() {
    const { body } = this.catalog;
    const c = this.cfg;
    c.body.height = between(body.heightRange);
    c.body.build = between(body.buildRange);
    c.body.skin = pick(body.skinTones);
    for (const m of body.morphs ?? []) c.body.morphs[m.id] = Math.random();
    for (const [slot, def] of Object.entries(this.catalog.slots)) {
      c.parts[slot].id = pick(def.options.filter((o) => o.enabled !== false)).id;
      c.parts[slot].color = def.palette ? pick(def.palette) : randomHex();
    }
    this._syncUI();
  }

  _reset() {
    this.cfg = defaultAvatar(this.catalog);
    this._syncUI();
  }

  async _save() {
    if (this.saving) return;
    this.saving = true;
    this.saveButton.disabled = true;
    this.status.textContent = 'Aplicando apariencia…';
    try {
      await this.onSave(sanitizeAvatar(this.cfg, this.catalog));
      this.close();
    } catch (error) { this.status.textContent = error.message; }
    finally { this.saving = false; this.saveButton.disabled = false; }
  }

  /* ---------------- Abrir / cerrar ---------------- */
  open() {
    if (this.isOpen) return;
    this._initPreview();
    this.previousFocus = document.activeElement;
    document.exitPointerLock?.();
    this.cfg = structuredClone(this.getConfig());
    this.isOpen = true;
    this.root.hidden = false;
    this.status.textContent = '';
    this._syncUI();
    this.clock.getDelta();
    this.frame = requestAnimationFrame(this._loop);
    this.onToggle?.(true);
    this.ui.body.height.focus();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.hidden = true;
    cancelAnimationFrame(this.frame);
    this.onToggle?.(false);
    this.previousFocus?.focus();
  }

  toggle() { this.isOpen ? this.close() : this.open(); }
}
