# Modelo de mundo y protocolo — versión 1

Estado: base de la etapa 2. Implementación de referencia en `shared/protocol.js`, `server/world.js`, `server/transport.js` y `server/entity-store.js`. El protocolo versiona la conexión completa; cada entidad tiene además su versión de esquema.

## Responsabilidades

| Módulo | Responsabilidad |
| --- | --- |
| `server/index.js` | Configuración, composición y cierre |
| `server/http.js` | Entrega de recursos HTTP y confinamiento de rutas |
| `server/transport.js` | WebSocket, negociación, sesiones, límites, heartbeat y distribución |
| `server/players.js` | Estado transitorio y actualización acotada de jugadores; no implementa aún física autoritativa |
| `server/world.js` | Assets conocidos, validación de entidades, propiedad, revisiones e idempotencia |
| `server/entity-store.js` | Contrato síncrono `list/get/put/delete`, inicialmente en memoria y con copias aisladas |
| `client/entities.js` | Representación visual del estado confirmado; no decide reglas |

Se eligen entidades con componentes JSON y sistemas desacoplados. `components` debe estar vacío en esta versión: los comportamientos concretos se incorporan en la etapa 4 con sus esquemas y sistemas. El renderizador no ejecuta código aportado por el cliente. El cubo integrado prueba el contrato de asset sin adelantar la importación GLB.

## Identificadores y autoridad

| Dato | Formato inicial | Responsable |
| --- | --- | --- |
| Mundo | `world:local`, configurable mediante `WORLD_ID` | Operador; conservar el mismo valor al reiniciar |
| Entidad | `entity:<UUID>` | Servidor; no cambia al editar |
| Asset integrado | `asset:builtin:cube` | Catálogo del servidor |
| Usuario creador local | `user:local-creator` | Credencial configurada por el operador |
| Visitante | `user:guest:<UUID de sesión>` | Servidor; temporal, sin identidad recuperable |
| Sesión/jugador | UUID completo | Servidor; cambia al reconectar |
| Operación | UUID recomendado, identificador de hasta 100 caracteres | Cliente; conservarlo al reintentar |

Los identificadores generales admiten letras ASCII, números, `:`, `_` y `-`, entre 1 y 100 caracteres. Los IDs de entidad son estables durante su existencia, pero desaparecen con el estado del proceso hasta implementar persistencia. Los futuros assets importados usarán identificadores estables ligados al contenido; no se aceptan URLs o IDs de assets desconocidos.

La credencial `CREATOR_TOKEN` habilita un único creador lógico local, compartido por las sesiones que la presenten. No es todavía un sistema de cuentas: quienes comparten esa credencial comparten identidad y propiedad. Sin credencial configurada solo se admite exploración. Una identidad individual y recuperable pertenece a la etapa 7.

El cliente propone cambios; el servidor asigna IDs, valida permisos, assets y transformaciones y emite el estado aceptado. `ownerId`, revisiones y `worldId` no los decide el cliente. El movimiento de jugadores todavía acepta posiciones acotadas: su autoridad física queda pendiente de la etapa 8.

## Convenciones espaciales

- Una unidad equivale a un metro; sistema diestro, Y hacia arriba.
- Terreno de 200 × 200 m, X y Z entre −100 y 100.
- Posición de entidades: X/Z dentro del terreno y Y entre 0 y 50.
- Rotación Euler XYZ, tres radianes entre −π y π.
- Escala por eje entre 0,01 y 100; sin escala negativa o cero.
- Transformaciones absolutas de mundo, sin jerarquías en esta versión.
- Origen del cubo en su centro: posición Y=0,5 apoya un cubo unitario sobre el suelo.
- El avatar conserva su pivote en los pies y frente local +Z; avanzar con la cámara inicial apunta hacia −Z.
- En entidades, posiciones fuera de rango se rechazan; el movimiento temporal de jugadores conserva el acotado existente.

## Entidad canónica

```json
{
  "id": "entity:UUID-asignado-por-servidor",
  "worldId": "world:local",
  "schemaVersion": 1,
  "revision": 1,
  "ownerId": "user:local-creator",
  "assetId": "asset:builtin:cube",
  "transform": {
    "position": [2, 0.5, 0],
    "rotation": [0, 0, 0],
    "scale": [1, 1, 1]
  },
  "components": {}
}
```

`schemaVersion` identifica la estructura, `revision` aumenta al editar esa entidad y `worldRevision` aumenta en cada creación, edición o eliminación aceptada. Son conceptos distintos. La cuota inicial es 100 entidades por mundo.

## Apertura y compatibilidad

El cliente envía al abrir WebSocket:

```json
{"t":"hello","v":1}
```

Un creador incluye `creatorToken` como campo opcional en ese mensaje. Nunca se incluye en la URL ni en broadcasts. En conexiones remotas debe usarse HTTPS/WSS; localhost permite pruebas sin TLS. No guardar credenciales en el repositorio.

El servidor espera `hello` hasta cinco segundos. Una versión distinta o ausente recibe `error` con código `VERSION_MISMATCH`, `expectedVersion: 1` y una explicación, seguido de cierre 1002. Una credencial enviada pero inválida recibe `UNAUTHORIZED` y cierre 1008. Un mensaje previo a `hello` recibe `HELLO_REQUIRED`.

Un cliente aceptado recibe `welcome` con `v`, `id` de jugador, `color`, `p`, `r`, `userId`, `role`, los demás `players` y `world`:

```json
{
  "id": "world:local",
  "revision": 0,
  "entities": [],
  "assets": [{"id":"asset:builtin:cube","kind":"builtin","primitive":"cube"}]
}
```

Ese bloque es el campo `world`, no un mensaje independiente. Se instala completo antes de procesar actualizaciones. El cliente se declara conectado solo después de aceptar `welcome`. Ante incompatibilidad detiene reintentos y muestra el error. Los clientes anteriores sin negociación deben actualizarse; los mensajes de movimiento conservan sus formatos.

## Mensajes transitorios

Se conservan `join`, `leave`, `state` y `snapshot` de la Fase 1. `state` transporta `p: [x,y,z]` y `r` del jugador; `snapshot` agrupa posiciones de jugadores a 20 Hz cuando hay cambios. No genera operaciones, revisiones de entidades ni guardados. No confundir este snapshot de jugadores con el snapshot completo de mundo en `welcome`.

## Operaciones sobre entidades

Crear:

```json
{
  "t": "entity.create",
  "opId": "UUID-del-cliente",
  "schemaVersion": 1,
  "assetId": "asset:builtin:cube",
  "transform": {"position":[2,0.5,0],"rotation":[0,0,0],"scale":[1,1,1]},
  "components": {}
}
```

Editar reemplaza la transformación completa; no permite cambiar propietario, asset ni componentes:

```json
{
  "t": "entity.update",
  "opId": "otro-UUID",
  "entityId": "entity:UUID-asignado-por-servidor",
  "expectedRevision": 1,
  "transform": {"position":[5,0.5,0],"rotation":[0,0,0],"scale":[1,1,1]}
}
```

Eliminar:

```json
{"t":"entity.delete","opId":"otro-UUID-mas","entityId":"entity:UUID-asignado-por-servidor","expectedRevision":2}
```

La respuesta privada `operation.result` contiene `opId`, `ok` y, si se acepta, `entityId`, `entityRevision`, `worldRevision` y `storage: "memory"`. Si se rechaza contiene `code` y `message`. Un rechazo no modifica el estado ni aumenta revisiones. Los códigos incluyen `INVALID_OPERATION`, `INVALID_ENTITY`, `FORBIDDEN`, `NOT_FOUND`, `REVISION_CONFLICT`, `OPERATION_CONFLICT`, `ENTITY_LIMIT`, `OPERATION_LIMIT` y `STORAGE_ERROR`.

Después de escribir, el servidor confirma al solicitante y transmite a todos, incluido el creador:

- `entity.changed`: `worldId`, `worldRevision` y entidad completa, al crear o editar.
- `entity.removed`: `worldId`, `worldRevision` y `entityId`, al eliminar.

El cliente renderiza el evento confirmado; no crea entidades optimistas. La confirmación actual significa aceptación en memoria, **no guardado en disco**. En la etapa 5 el adaptador y el flujo deberán garantizar escritura duradera antes de confirmar; si se usa almacenamiento asíncrono habrá que esperar la escritura y serializar cambios.

## Reintentos, concurrencia y recuperación

- Repetir el mismo mensaje con el mismo `opId` devuelve el resultado original sin volver a mutar ni emitir el evento.
- El mismo `opId` con contenido distinto devuelve `OPERATION_CONFLICT`. La comparación ordena las claves de objetos; cambiar únicamente su orden no crea un conflicto.
- El registro del creador se conserva entre reconexiones durante la vida del proceso. Está limitado a 1000 operaciones; al alcanzar el límite se rechazan operaciones nuevas en vez de desalojar resultados y permitir duplicados. Aún no hay retención o registro duradero.
- Los rechazos se recuerdan también: después de corregir una operación o refrescar una revisión, usar un `opId` nuevo.
- `expectedRevision` impide sobrescribir silenciosamente una entidad cambiada por otra sesión. Ante conflicto, recuperar snapshot y decidir el cambio nuevamente.
- Si se pierde la confirmación, el resultado es incierto: reconectar, revisar el snapshot y, si corresponde, repetir exactamente la operación con su ID original. No reenviar automáticamente operaciones pendientes.
- La reconexión siempre reemplaza el estado visual con el snapshot completo. No hay historial de deltas ni reanudación parcial.
- Los eventos viajan ordenados por WebSocket. El cliente espera revisiones consecutivas; si detecta un salto, cierra y recupera el snapshot al reconectar.
- Reiniciar el proceso borra entidades, revisiones y registro de operaciones. No reintentar operaciones antiguas automáticamente después de un reinicio; la persistencia y recuperación de ese registro se diseñarán en la etapa 5.

## Demostración local

1. Iniciar el servidor con una credencial elegida por el operador:

```powershell
$env:CREATOR_TOKEN = 'reemplaza-por-una-credencial-local'
npm run dev
```

2. En una ventana de localhost, abrir consola y guardar esa misma credencial para esa pestaña; después recargar:

```js
sessionStorage.setItem('mioasis.creatorToken', 'reemplaza-por-una-credencial-local');
location.reload();
```

3. Abrir otra ventana como visitante, sin configurar credencial. Pulsar **Crear cubo de prueba** en la ventana creadora: ambas deben ver el cubo.
4. Recargar el visitante y comprobar que el snapshot incluye el cubo. Reiniciar el servidor elimina el cubo, como se espera en esta etapa.
5. Para retirar la credencial de la pestaña: `sessionStorage.removeItem('mioasis.creatorToken')` y recargar. No compartir capturas de consola con credenciales.

El botón sirve para validar el modelo; herramientas de edición y gestión de permisos tendrán interfaz propia más adelante.

## Validación de la etapa

### Extensión de apariencia procedural

El protocolo 1 admite ahora una extensión aditiva de apariencia: `hello` puede incluir `avatar` como preferencia; `welcome` incluye `avatar`, `avatarRevision` y el catálogo `avatarCatalog`. Las entradas de jugadores en welcome/join incluyen su apariencia. Un cliente anterior puede omitirla y recibe el predeterminado; el cliente actual conserva fallback si falta esta extensión.

`avatar.set` contiene `opId` y `avatar` (configuración `v: 1`, `body`, `parts` definida en `shared/avatar-schema.js`). Cada sesión puede modificar solo su propia apariencia, sin elegir otro ID de jugador. El servidor sanea y valida catálogo y presupuesto, transmite `avatar.changed` con `id`, `avatar` y `avatarRevision` y responde `operation.result` con `storage: "session"`. Versión o presupuesto inválidos devuelven `INVALID_AVATAR` sin cambiar la selección. Los IDs desconocidos o deshabilitados se sustituyen por el básico correspondiente.

Es estado cosmético de sesión: no crea entidades, no modifica `worldRevision`, no usa el registro de operaciones duraderas y no persiste en disco. Repetir una asignación conserva la misma apariencia, pero aumenta la revisión cosmética; no tiene la garantía de reproducción de respuesta de `entity.create`. Los cambios aceptados se guardan como preferencia local y se vuelven a validar al reconectar. [Detalles y pruebas](estado-proyecto.md).

`npm test` cubre regresiones de etapa 1, negociación incompatible, permisos, creación y réplica, reintento en la misma sesión y otra conexión, snapshot, edición, conflicto y eliminación; también validación de entidades, aislamiento del almacenamiento y falla de escritura sin confirmación.

`npm run test:browser` comprueba los controles anteriores y agrega creación mediante el botón, recepción del mismo ID en otro cliente y recuperación de la entidad tras reconectar. No certifica persistencia, GLB ni capacidad de carga.
