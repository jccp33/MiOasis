// Comprobación real en Chrome/Edge mediante CDP, sin dependencias de automatización.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, access, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import WebSocket from 'ws';

const candidates = [process.env.BROWSER_PATH,
    `${process.env.ProgramFiles}/Google/Chrome/Application/chrome.exe`,
    `${process.env['ProgramFiles(x86)']}/Microsoft/Edge/Application/msedge.exe`].filter(Boolean);
let browserPath;
for (const candidate of candidates) { try { await access(candidate); browserPath = candidate; break; } catch {} }
if (!browserPath) throw new Error('Define BROWSER_PATH con la ruta de Chrome o Edge.');
const profile = await mkdtemp(path.join(tmpdir(), 'mioasis-browser-'));
const server = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: '0', CREATOR_TOKEN: 'browser-test-creator' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let browser, cdp;
try {
    const serverURL = await outputMatch(server.stdout, /http:\/\/localhost:\d+/);
    browser = spawn(browserPath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    const endpoint = await outputMatch(browser.stderr, /ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\/[^\s]+/);
    cdp = new WebSocket(endpoint); await once(cdp, 'open');
    let sequence = 0;
    const pending = new Map(), errors = [];
    cdp.on('message', (raw) => {
        const message = JSON.parse(raw);
        if (message.id) {
            const entry = pending.get(message.id); pending.delete(message.id);
            if (message.error) entry?.reject(new Error(message.error.message)); else entry?.resolve(message.result);
        }
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    });
    function call(method, params = {}, sessionId) {
        return new Promise((resolve, reject) => {
            const id = ++sequence;
            const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP sin respuesta: ${method}`)); }, 10000);
            pending.set(id, { resolve: (value) => { clearTimeout(timer); resolve(value); }, reject: (error) => { clearTimeout(timer); reject(error); } });
            cdp.send(JSON.stringify({ id, method, params, sessionId }));
        });
    }
    async function evaluate(session, expression) {
        const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, session);
        if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
        return result.result.value;
    }
    async function until(session, expression) {
        for (let i = 0; i < 80; i++) {
            if (await evaluate(session, expression)) return;
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error(`Tiempo agotado: ${expression}`);
    }
    async function tab(creator = false) {
        const { targetId } = await call('Target.createTarget', { url: 'about:blank' });
        const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
        await call('Runtime.enable', {}, sessionId); await call('Page.enable', {}, sessionId);
        await call('Page.addScriptToEvaluateOnNewDocument', { source: `
            ${creator ? "sessionStorage.setItem('mioasis.creatorToken', 'browser-test-creator');" : ''}
            window.sent = []; window.received = []; window.sockets = [];
            const Original = window.WebSocket;
            window.WebSocket = class extends Original {
                constructor(...args) { super(...args); sockets.push(this); this.addEventListener('message', e => received.push(JSON.parse(e.data))); }
                send(data) { sent.push(JSON.parse(data)); super.send(data); }
            };
        ` }, sessionId);
        await call('Page.navigate', { url: serverURL }, sessionId);
        await until(sessionId, `document.querySelector('#status')?.textContent === 'conectado'`);
        return sessionId;
    }
    console.log('Chrome conectado; abriendo dos clientes');
    const a = await tab(true), b = await tab();
    await until(a, `document.querySelector('#count').textContent === '2'`);
    assert.equal(await evaluate(b, `document.querySelector('#count').textContent`), '2');
    // Editor real: previsualización, aislamiento de controles, cancelación y réplica.
    await evaluate(a, `document.querySelector('#edit-avatar').click()`);
    await until(a, `document.querySelector('#avatar-editor')?.hidden === false && document.querySelector('#avatar-editor canvas')`);
    const statesBeforeEditor = await evaluate(a, `sent.filter(m => m.t === 'state').length`);
    await evaluate(a, `dispatchEvent(new KeyboardEvent('keydown', {code:'KeyW'})); dispatchEvent(new KeyboardEvent('keydown', {code:'Space'}))`);
    await new Promise(resolve => setTimeout(resolve, 250));
    const statesAfterEditor = await evaluate(a, `sent.filter(m => m.t === 'state').length`);
    assert.ok(statesAfterEditor <= statesBeforeEditor + 1);
    await evaluate(a, `(() => {
        const select = document.querySelector('#avatar-editor select');
        select.value = 'long'; select.dispatchEvent(new Event('change'));
        const height = document.querySelector('#avatar-editor input[type=range]');
        height.value = '1.1'; height.dispatchEvent(new Event('input'));
    })()`);
    await new Promise(resolve => setTimeout(resolve, 200));
    const editorScreenshot = await call('Page.captureScreenshot', { format: 'png' }, a);
    await writeFile(path.join(profile, 'avatar-editor.png'), Buffer.from(editorScreenshot.data, 'base64'));
    await evaluate(a, `document.querySelector('#avatar-editor .ae-primary').click()`);
    await until(a, `document.querySelector('#avatar-editor').hidden`);
    await until(b, `received.some(m => m.t === 'avatar.changed' && m.avatar.parts.hair.id === 'long')`);
    assert.equal(await evaluate(a, `JSON.parse(localStorage.getItem('mioasis.avatar.v1')).body.height`), 1.1);
    const changes = await evaluate(b, `received.filter(m => m.t === 'avatar.changed').length`);
    await evaluate(a, `document.querySelector('#edit-avatar').click()`);
    await evaluate(a, `(() => { const select = document.querySelector('#avatar-editor select'); select.value = 'spiky'; select.dispatchEvent(new Event('change')); [...document.querySelectorAll('#avatar-editor button')].find(b => b.textContent === 'Cancelar').click(); })()`);
    assert.equal(await evaluate(b, `received.filter(m => m.t === 'avatar.changed').length`), changes);
    assert.equal(await evaluate(b, `document.querySelector('#create-test').hidden`), true);
    await evaluate(a, `document.querySelector('#create-test').click()`);
    await until(b, `received.some(m => m.t === 'entity.changed')`);
    await until(a, `document.querySelector('#operation-status').textContent.includes('confirmado')`);
    const createdId = await evaluate(a, `received.find(m => m.t === 'entity.changed').entity.id`);
    assert.equal(await evaluate(b, `received.find(m => m.t === 'entity.changed').entity.id`), createdId);
    // Captura fotograma WebGL para inspección visual.
    const screenshot = await call('Page.captureScreenshot', { format: 'png' }, a);
    const screenshotPath = path.join(profile, 'mioasis.png');
    await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    // Eventos reales de teclado: caminar, diagonal y salto.
    const key = (type, code, session = a) => call('Input.dispatchKeyEvent', { type, code, key: code === 'Space' ? ' ' : code.slice(-1).toLowerCase() }, session);
    await call('Page.bringToFront', {}, a);
    await call('Runtime.evaluate', { expression: 'document.querySelector("canvas").requestPointerLock()', userGesture: true, awaitPromise: true }, a);
    await until(a, 'document.pointerLockElement === document.querySelector("canvas")');
    // Movimiento del mouse cambia el fotograma de la cámara.
    await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 350, y: 240 }, a);
    await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 450, y: 260 }, a);
    await evaluate(a, 'document.exitPointerLock()');
    await until(a, '!document.pointerLockElement');
    await call('Runtime.evaluate', { expression: 'document.querySelector("canvas").requestPointerLock()', userGesture: true, awaitPromise: true }, a);
    await until(a, '!!document.pointerLockElement');
    await evaluate(a, 'document.exitPointerLock()');
    await key('keyDown', 'KeyW'); await key('keyDown', 'KeyD'); await key('keyDown', 'Space');
    await until(a, `sent.some(m => m.p?.[1] > 0.3)`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await key('keyUp', 'KeyW'); await key('keyUp', 'KeyD'); await key('keyUp', 'Space');
    await until(a, `sent.at(-1)?.p?.[1] === 0`);
    assert.ok(await evaluate(b, `received.some(m => m.t === 'snapshot' && Object.values(m.players).some(p => p.p[1] > 0))`));
    // Pérdida de foco debe vaciar teclas y salto encolado.
    assert.equal(await evaluate(a, `(async () => {
        const { Input } = await import('/input.js');
        const input = new Input(document.createElement('canvas'));
        dispatchEvent(new KeyboardEvent('keydown', {code:'KeyW'}));
        dispatchEvent(new KeyboardEvent('keydown', {code:'Space'}));
        dispatchEvent(new Event('blur'));
        return input.axis.z === 0 && !input.consumeJump();
    })()`), true);
    // Correr hasta el borde: el cliente debe mantener las coordenadas dentro del terreno.
    await key('keyDown', 'ShiftLeft'); await key('keyDown', 'KeyD');
    await new Promise((resolve) => setTimeout(resolve, 17000));
    await key('keyUp', 'KeyD'); await key('keyUp', 'ShiftLeft');
    assert.equal(await evaluate(a, 'sent.every(m => !m.p || (Math.abs(m.p[0]) <= 100 && Math.abs(m.p[2]) <= 100))'), true);
    assert.ok(await evaluate(a, 'sent.some(m => m.p && (Math.abs(m.p[0]) === 100 || Math.abs(m.p[2]) === 100))'));
    // Una sesión nueva reemplaza la anterior sin jugadores fantasma.
    const oldId = await evaluate(a, `received.find(m => m.t === 'welcome').id`);
    await evaluate(a, 'sockets[0].close()');
    await until(b, `document.querySelector('#count').textContent === '1'`);
    await until(a, `received.filter(m => m.t === 'welcome').length === 2 && document.querySelector('#status').textContent === 'conectado'`);
    assert.notEqual(await evaluate(a, `received.filter(m => m.t === 'welcome').at(-1).id`), oldId);
    assert.equal(await evaluate(a, `received.filter(m => m.t === 'welcome').at(-1).world.entities[0].id`), createdId);
    assert.equal(await evaluate(a, `received.filter(m => m.t === 'welcome').at(-1).avatar.parts.hair.id`), 'long');
    await until(b, `document.querySelector('#count').textContent === '2'`);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'OK', checks: ['WebGL sin excepciones', 'dos clientes', 'editor, guardado, cancelación y apariencia replicada', 'creación y réplica de entidad', 'captura y recaptura de mouse', 'teclado diagonal y salto', 'carrera y límites', 'replicación', 'limpieza de entrada', 'reconexión y recuperación de apariencia y entidades'], screenshot: screenshotPath, profile }, null, 2));
} finally {
    cdp?.terminate(); browser?.kill(); server.kill();
}

function outputMatch(stream, pattern) {
    return new Promise((resolve, reject) => {
        let output = '';
        const timer = setTimeout(() => reject(new Error(`No se detectó ${pattern}: ${output.slice(-1000)}`)), 15000);
        stream.on('data', (data) => {
            output += data;
            const match = output.match(pattern);
            if (match) { clearTimeout(timer); resolve(match[0]); }
        });
    });
}
