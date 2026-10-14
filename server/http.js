import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { avatarService } from './avatar-service.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- Servidor HTTP estático ---------- */
const MOUNTS = [
    ['/shared/', path.join(ROOT, 'shared')],
    ['/vendor/three/', path.join(ROOT, 'node_modules', 'three')],
    ['/', path.join(ROOT, 'client')],
];

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.png': 'image/png',
};

function resolveFile(urlPath) {
    for (const [prefix, dir] of MOUNTS) {
        if (!urlPath.startsWith(prefix)) continue;
        const rel = urlPath.slice(prefix.length) || 'index.html';
        const full = path.resolve(dir, rel);
        // Protección contra path traversal
        return full.startsWith(dir + path.sep) ? { full, dir } : null;
    }
    return null;
}

export const server = http.createServer(async (req, res) => {
    try {
        if (!['GET', 'HEAD'].includes(req.method)) return res.writeHead(405, { Allow: 'GET, HEAD' }).end();
        const { pathname } = new URL(req.url, 'http://localhost');
        if (pathname === '/assets/avatars/catalog.json') {
            res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-cache' });
            return res.end(req.method === 'HEAD' ? undefined : JSON.stringify(avatarService.publicCatalog()));
        }
        const resolved = resolveFile(decodeURIComponent(pathname));
        if (!resolved) return res.writeHead(403).end('Forbidden');
        const [file, dir] = await Promise.all([realpath(resolved.full), realpath(resolved.dir)]);
        if (!file.startsWith(dir + path.sep)) return res.writeHead(403).end('Forbidden');
        const data = await readFile(file);
        res.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
        });
        res.end(req.method === 'HEAD' ? undefined : data);
    } catch {
        res.writeHead(404).end('Not found');
    }
});

