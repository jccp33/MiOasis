# MiOasis — Nivel 0

Prototipo de mundo 3D multijugador en JavaScript, Three.js y Node.js. Permite explorar con un avatar y ver otros jugadores. La etapa 2 añade entidades, operaciones confirmadas y un cubo integrado de prueba; importación de assets, comportamientos y persistencia siguen pendientes.

## Ejecutar

Requiere Node.js 18 o posterior y npm. Verificado en este equipo con Node.js 24.15.0 y Chrome instalado.

```powershell
npm ci
npm run dev
```

Abrir <http://localhost:3000> en dos ventanas. No abrir `client/index.html` directamente ni mediante otro servidor: los módulos compartidos, Three.js y WebSocket se sirven desde Node.js. Para ejecutar sin reinicio automático: `npm start`. Detener con Ctrl+C.

Puerto alternativo en PowerShell:

```powershell
$env:PORT = '3001'
npm start
```

El servidor admite `PORT=0` para elegir un puerto disponible y muestra el puerto real al arrancar. `HEARTBEAT_MS` controla el intervalo de comprobación de conexiones (15000 ms por defecto, mínimo 50); valores pequeños se reservan para pruebas. Una conexión sin respuesta se termina en un máximo aproximado de dos intervalos.

## Controles

| Acción | Control |
| --- | --- |
| Mover | WASD o flechas |
| Girar cámara | Clic en el mundo y mover mouse |
| Correr | Shift |
| Saltar | Espacio |
| Soltar mouse | Esc |
| Editar avatar | Botón «Editar avatar» o V |

La pérdida de foco o captura limpia las teclas y saltos pendientes. Al desconectarse, el movimiento local se pausa y se retiran avatares remotos; el cliente reintenta cada dos segundos. Al regresar recibe una nueva sesión y posición inicial. No hay identidad o posición persistente del jugador todavía.

## Estructura

- `client/index.html`: página, HUD e import map.
- `client/main.js`: entrada del cliente, escena, movimiento y sincronización.
- `client/input.js`: teclado y captura del puntero.
- `client/avatar.js`: creación y liberación de avatares.
- `client/network.js`: conexión, reconexión y envío.
- `server/index.js`: composición y configuración del servidor.
- `server/http.js`, `server/transport.js`: HTTP y WebSocket.
- `server/players.js`: estado transitorio de jugadores.
- `server/world.js`, `server/entity-store.js`: entidades, validación y almacenamiento en memoria.
- `client/entities.js`: representación visual de entidades confirmadas.
- `shared/protocol.js`: mensajes, frecuencia y tamaño del mundo.
- `tests/server.test.js`: regresiones HTTP y multijugador.
- `scripts/verify-browser.js`: prueba con dos clientes Chrome/Edge mediante CDP.
- `docs/`: producto, decisiones y hoja de ruta.
- `assets/`, `data/`: reservados para etapas posteriores; actualmente no almacenan el mundo.

## Verificación

```powershell
npm test
npm run test:browser
```

La segunda prueba requiere Chrome o Edge instalado. Puede indicarse otra ruta con `$env:BROWSER_PATH = 'C:\ruta\chrome.exe'`. Usa un servidor con puerto temporal y un perfil aislado en la carpeta temporal; no usa tu perfil personal. Guarda allí una captura y muestra su ubicación. En entornos restringidos puede necesitar permiso para iniciar el navegador. Los perfiles temporales se conservan para inspección. La prueba dura aproximadamente 25 segundos y no mide la capacidad de 10 usuarios ni el objetivo de 60 FPS.

Resultados y procedimiento manual: [validación de la etapa 1](docs/validacion-etapa-1.md).

## Modelo de mundo y creación de prueba

El protocolo requiere `hello` con versión 1 antes de recibir `welcome`. El cliente incluido negocia automáticamente. Cada reconexión recupera el mundo completo y una sesión nueva; las entidades permanecen mientras siga vivo el proceso.

Sin configuración adicional todas las sesiones son visitantes. Para habilitar el botón **Crear cubo de prueba**, configurar `CREATOR_TOKEN` en el servidor y la misma credencial en el almacenamiento de sesión de la pestaña creadora. El procedimiento completo, esquemas, permisos y operaciones de creación/edición/eliminación están en [modelo de mundo y protocolo](docs/modelo-mundo-protocolo.md).

`WORLD_ID` permite fijar el identificador del mundo (por defecto `world:local`); conservarlo entre ejecuciones. Los cambios confirmados indican `storage: "memory"`: reiniciar el servidor borra las entidades. No hay carga GLB ni cuentas individuales todavía.

## Diagnóstico

- `EADDRINUSE`: detener el servidor que ocupa el puerto o elegir otro con `PORT`.
- Página vacía: revisar consola del navegador y solicitudes de `/main.js`, `/shared/protocol.js` y `/vendor/three/build/three.module.js`; ejecutar `npm ci` si faltan dependencias.
- Mouse sin capturar: usar localhost, hacer clic sobre el lienzo y comprobar permisos del navegador. Para otro equipo o despliegue remoto se debe configurar HTTPS/WSS.
- Estado «reconectando»: comprobar que Node.js siga activo y que la URL corresponda a su puerto.
- Desconexión de clientes modificados: el servidor admite solo JSON de texto, hasta 4096 bytes y 60 mensajes por segundo; el cliente normal transmite a 20 Hz.

El servidor limita coordenadas y normaliza rotación, pero todavía acepta posiciones propuestas por el cliente: autoridad de movimiento y prevención de teletransporte pertenecen a la etapa 8. No usar este prototipo como servicio público terminado.

## Preparación de avatares modulares

Ya se integró el humanoide procedural con 17 huesos, 10 slots de piezas y editor con vista previa. Cualquier visitante puede cambiar su apariencia sin editar los básicos ni obtener permisos de construcción. **Guardar** espera la validación del servidor y replica el resultado; **Cancelar** descarta el borrador. La preferencia aceptada se guarda localmente en el navegador y se valida otra vez al conectar.

Se conserva la cápsula como fallback. El catálogo de apariencia solo admite generadores instalados: GLB reales, cargas propias, perfiles privados y persistencia de cuentas siguen pendientes. Las cuotas diferenciadas de jugador/operador continúan como servicios internos para la futura importación. Ver [estado actual y pruebas](docs/estado-proyecto.md), [contrato de integración](docs/avatares-integracion.md) y [guía para preparar GLB](docs/AVATAR_ASSETS.md).

## Licencia

Código bajo [MIT](LICENSE), copyright 2026 appsevolution.com.mx. Dependencias y contenido de terceros conservan sus licencias.
