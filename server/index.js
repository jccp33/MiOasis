import { server } from './http.js';
import { attachTransport } from './transport.js';
import { World } from './world.js';
import { Players } from './players.js';
const PORT = process.env.PORT || 3000;
const heartbeatMs = Number(process.env.HEARTBEAT_MS || 15000);
if (!Number.isFinite(heartbeatMs) || heartbeatMs < 50) throw new Error('HEARTBEAT_MS debe ser >= 50');
const transport = attachTransport(server, new World(undefined, process.env.WORLD_ID), new Players(), { heartbeatMs, creatorToken: process.env.CREATOR_TOKEN });
function shutdown() { transport.close(); server.close(); }
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
server.on('error', (error) => {
    console.error('No se pudo iniciar el servidor:', error.code || error.message);
    shutdown(); process.exitCode = 1;
});
server.listen(PORT, () => console.log('MiOasis Nivel 0 -> http://localhost:' + server.address().port));
