# Preparación del sistema modular de avatares

## Requisito y alcance

Se recibieron los archivos preparados con Claude y se integró la primera versión procedural: rig de 17 huesos, editor, catálogo básico protegido y apariencia compartida. Los GLB externos siguen pendientes de validación e integración real. El diagnóstico, comprobaciones y límites actuales están en [estado del proyecto](estado-proyecto.md).

El catálogo básico debe estar disponible para cualquiera, con contenido que los usuarios no puedan sobrescribir o eliminar. Cada persona podrá componer su apariencia usando las piezas autorizadas sin modificar los originales. Después podrá incorporar contenido propio, público o privado, sujeto a límites. Operar un mundo permite mantener un catálogo mayor, pero no aumenta el costo permitido de un avatar visible.

«Público» significa disponible en el producto: no equivale por sí solo a una licencia de redistribución. La licencia y procedencia del contenido deberán indicarse al incorporar cada paquete real.

## Preparado en código

| Archivo | Función |
| --- | --- |
| `assets/catalog/core.json` | Catálogo básico versionado del cubo y avatar procedural actuales |
| `shared/avatars.js` | Slots, esquema de composición, límites y validación acumulada |
| `server/asset-catalog.js` | Lectura del catálogo, protección del núcleo, acceso público/privado, cuotas, rigs y registro interno |
| `server/world.js` | Utiliza el catálogo; solo publica assets públicos y sigue admitiendo el cubo integrado como entidad |
| `client/avatar.js` | Conserva geometría y controles; identifica la base mediante `DEFAULT_AVATAR_ID` |
| `tests/assets.test.js` | Regresiones de protección, privacidad, cuotas, compatibilidad y coste compuesto |
| `assets/avatars/catalog.json` | Slots y opciones del editor instalado; solo generadores confiables habilitados |
| `shared/avatar-schema.js` | Configuración activa del editor, distinta del manifiesto de recursos personales |
| `server/avatar-service.js` | Validación del catálogo, configuración y coste procedural; catálogo público con protección impuesta |
| `client/avatar/` | Rig, piezas, ensamblador, agrupación gráfica, controlador con fallback y editor |
| `tests/avatar-integration.test.js` | Esquema activo, presupuesto, independencia y ciclo de vida del humanoide |

Las funciones de registro y eliminación son servicios internos. No existe un endpoint para cargar assets ni un mensaje WebSocket que permita registrar o borrar recursos. Tampoco se han publicado carpetas de assets por HTTP: un montaje público indiscriminado expondría archivos privados.

## Catálogo y autoridad

- Los registros del núcleo provienen exclusivamente de archivos instalados por el operador. El servidor impone `ownerId: system:core`, `visibility: public`, `core: true` e `immutable: true`.
- `get/list` entregan copias; modificar una respuesta no cambia el catálogo.
- No se acepta `id`, propietario, indicadores de protección, métricas, tier, ruta o URL desde un manifiesto de usuario. El servidor asigna `asset:user:<UUID>`.
- Los registros futuros tienen categoría `avatar`, `avatarPart` o `prop`, versión, propietario, visibilidad, rig, hash, autor y licencia.
- El registro acepta solamente GLB para contenido de usuarios. Los generadores procedurales pertenecen a código instalado y revisado; nunca se ejecuta JavaScript subido por un usuario.
- No hay edición destructiva de binarios. Una revisión de geometría o esqueleto debe crear un recurso nuevo y actualizar referencias de forma controlada. La interfaz futura editará una composición o copia autorizada, sin alterar piezas básicas.
- Eliminar requiere propiedad y ausencia comprobada de referencias. Por defecto el servicio niega la eliminación hasta que se conecte un comprobador de referencias del mundo, presets e inventarios.
- Un operador no obtiene acceso a recursos privados de otras personas ni permiso para modificar el núcleo por tener más cuota.

Las estructuras actuales son volátiles: el registro interno, cuotas consumidas y assets incorporados desaparecen al reiniciar. El núcleo vuelve a cargarse del JSON. El almacenamiento duradero de archivos, metadatos, consumo y referencias debe implementarse conjuntamente en las etapas de importación y persistencia.

## Cuotas iniciales propuestas

| Presupuesto | Jugador | Operador de mundo |
| --- | --- | --- |
| Assets propios almacenados | 25 | 500 |
| Bytes propios almacenados | 100 MiB | 1 GiB |
| Tamaño de un GLB | 10 MiB | 10 MiB |
| Avatar equipado | Mismo presupuesto gráfico | Mismo presupuesto gráfico |

`storageTier` es un dato confiable de la cuenta en servidor, independiente del rol de edición. No se lee de `hello`, de una operación ni del manifiesto del cliente. Ser `creator` no convierte automáticamente al usuario en operador. Actualmente no existe flujo de altas o verificación de operadores: antes de habilitar cargas, el servicio de identidad deberá asignar el tier.

Una declaración «tengo un servidor» no concede cuota. En la primera implementación podrá habilitarla el administrador local. Una futura federación necesitará verificar propiedad, salud, recursos aportados y revocación. Ese proceso queda pendiente.

Los básicos no consumen cuota personal. Los recursos propios consumen cuota tanto si son públicos como privados. El servidor anfitrión también necesitará una cuota global de disco, reservas para cargas simultáneas y límites de ancho de banda: 1 GiB por operador no autoriza usar espacio que el anfitrión no tiene. Al agotarse capacidad global se rechazan cargas nuevas; no se eliminan recursos en uso ni se convierten privados en públicos.

### Presupuesto gráfico

Por asset: máximo 50 000 triángulos, 8 materiales, 64 huesos, 16 draw calls estimadas, texturas de hasta 2048 por lado y 128 MiB estimados de texturas en memoria. Por avatar **completo**: máximo 12 piezas, 50 000 triángulos, 8 materiales, 64 huesos, 16 draw calls estimadas y 128 MiB estimados de texturas. El avatar básico cuenta en ese total.

La validación suma base y piezas de forma conservadora, incluidos materiales y huesos compartidos. Solo podrá descontarse deduplicación cuando el ensamblador real la garantice. Los bytes de un GLB comprimido no equivalen a memoria GPU.

Son valores de partida para medir en el equipo de referencia, no una promesa de 60 FPS con diez avatares. Faltan presupuestos por escena, LOD, animaciones, morph targets, influencias por vértice y frecuencia de actualización. No se deben habilitar cargas del público antes de cubrir esos límites y el análisis del archivo real.

## Contrato con el sistema de Claude

### Rigs

El registro interno acepta rigs con ID versionado, nombres reales de huesos y slots asociados a un hueso. No se imponen nombres como `Head` o `mixamorig:Head` antes de inspeccionar los archivos.

Ejemplo ilustrativo, no rig instalado:

```json
{
  "id": "rig:humanoid:1",
  "bones": ["Root", "Head"],
  "sockets": {"hair":"Head","eyes":"Head","nose":"Head"}
}
```

Este ejemplo solo muestra la forma de los datos; un humanoide real necesitará su lista completa. Los rigs se instalan desde configuración confiable. Cambiar su jerarquía o pose de referencia requiere una nueva versión y no modifica avatares existentes silenciosamente.

Slots activos del editor: `hair`, `eyebrows`, `eyes`, `nose`, `mouth`, `top`, `bottom`, `shoes`, `headwear` y `glasses`. El contrato de recursos también reserva otras categorías. Se admite una pieza por slot por ahora; una pieza de ojos puede contener ambos ojos. Ampliar a varias piezas por slot requerirá versionar y validar el contrato.

Una pieza indica `binding: rigid` para anclaje rígido o `binding: skinned` para compartir deformación de esqueleto. Debe declarar el mismo `rigId` de la base y un slot presente en sus sockets. Esto valida metadatos; comparar jerarquías, bind matrices, pesos y pose del GLB corresponde al futuro inspector real.

### Manifiesto de usuario para el servicio interno

```json
{
  "schemaVersion": 1,
  "kind": "glb",
  "category": "avatarPart",
  "visibility": "private",
  "sha256": "hash-sha256-hexadecimal-real-de-64-caracteres",
  "rigId": "rig:humanoid:1",
  "slot": "hair",
  "binding": "rigid",
  "author": "Autor del recurso",
  "license": "Licencia o permiso aplicable"
}
```

Antes de llamar `AssetCatalog.register(principal, manifest, measured)`, el servidor debe verificar archivo, hash y medidas a partir de los bytes, no del navegador. `measured` contiene enteros no negativos: `bytes`, `triangles`, `materials`, `bones`, `textureBytes`, `drawCalls` y `textureSize` (mayor dimensión de textura). La función actual aplica presupuestos a medidas confiables; **no inspecciona GLB** ni prueba por sí sola que el hash coincida.

### Composición

La composición tiene ID de base y referencias a piezas; no copia geometría ni modifica el catálogo:

```json
{
  "schemaVersion": 1,
  "baseAssetId": "asset:builtin:avatar-capsule",
  "parts": []
}
```

Este ejemplo pertenece al contrato de recursos personales, no al mensaje activo del editor. La cápsula no tiene rig y se conserva como fallback. El humanoide instalado se identifica como `asset:core:avatar:procedural`, con rig `rig:core:humanoid:1`; el catálogo del editor deriva IDs `asset:core:avatar:<slot>:<opción>`. La unión con recursos personales e IDs `asset:user:UUID` sigue pendiente y no debe hacerse aceptando referencias arbitrarias del navegador.

El ensamblador procedural ya mantiene esqueletos independientes, animación y liberación de recursos. El editor permite colores, altura y complexión acotados por catálogo. Los morph targets están previstos en el código recibido, pero el catálogo instalado no declara ninguno y no se han certificado con GLB. Clonación, vinculación de skins y propiedad de recursos GLB requieren pruebas específicas antes de habilitar archivos externos.

## Privado, público y apariencia visible

Un catálogo público es consultable por todos. Un recurso privado solo es consultable por su propietario mediante el servicio interno; no se incluye en el snapshot compartido.

Eso no resuelve por sí solo cómo otros jugadores ven un avatar que usa una pieza privada. Descargar/renderizar una pieza exige acceso a sus bytes: se necesita un permiso de visualización limitado a la sesión y una política explícita que no conceda edición o reutilización. Ningún mecanismo puede garantizar que bytes entregados a un navegador sean imposibles de copiar.

Hasta implementar esos permisos y entrega autenticada, `validateAvatar(..., {shared:true})` solo admite referencias públicas. La edición privada local puede validarse para el propietario; no se difunde automáticamente. Un operador con más cuota tampoco evita esta regla.

## Pendientes antes de integrar archivos reales

- [x] Recibir y revisar código procedural, catálogo y dependencias, preservando fallback y pruebas existentes.
- [x] Comparar APIs, versión de Three.js, unidades, orientación, pivote y rig procedural. GLB reales todavía pendientes.
- [x] Adoptar el rig procedural instalado y sus anclajes por hueso.
- [ ] Certificar vinculación rígida/skinned y clips de animación con GLB reales.
- [ ] Definir y medir límites adicionales de skinning, animaciones y morph targets.
- [x] Crear adaptador de generadores locales conservando fallback e independencia de esqueletos.
- [ ] Habilitar y certificar cargador GLB con esas mismas garantías.
- [x] Instalar piezas procedurales básicas protegidas. La procedencia/licencia de futuros GLB debe revisarse por separado.
- [x] Validar selección procedural en servidor y sincronizar apariencia sin aceptar URLs arbitrarias.
- [ ] Añadir inspección GLB, cuota global, reservas transaccionales y almacenamiento de archivos antes de habilitar cargas.
- [ ] Conectar identidades individuales, asignación de tier, entrega privada autorizada y permisos de visualización.
- [ ] Persistir catálogo personal, presets, referencias y cuotas; probar respaldo y restauración.
- [x] Verificar dos usuarios con esqueletos procedurales independientes. El controlador conserva cápsula hasta completar una construcción válida.
- [ ] Comprobar recuperación ante fallos de GLB reales y cargas externas canceladas.

## Comprobaciones realizadas

`npm test` cubre núcleo inmutable, copias aisladas, disponibilidad del avatar actual, métricas de su geometría, privacidad, propiedad, rechazo de campos de autoridad, cuotas por conteo/bytes, mayor capacidad de operador sin mayor coste gráfico y validación de composición/rig.

Las pruebas anteriores de mundo y protocolo siguen formando parte de la suite. La prueba de navegador verifica además editor, vista previa, guardado, cancelación, controles pausados al editar y réplica de apariencia. Hay pruebas del rig procedural independiente, cambios rápidos y presupuesto después de agrupar mallas. Los modelos GLB y sus esqueletos externos requieren comprobaciones nuevas cuando estén disponibles. Resultados en [estado del proyecto](estado-proyecto.md).
