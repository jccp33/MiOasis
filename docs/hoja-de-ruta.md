# MiOasis: hoja de ruta hacia un universo abierto

Documento de trabajo basado en `.initdocs/prompt-01.md`, `.initdocs/gemini-resp.md` y el código existente. Las casillas representan trabajo pendiente; tener código parcial no significa que una etapa esté validada.

## Objetivo

Construir un universo de mundos 3D persistentes, operados por personas independientes y conectados mediante un protocolo abierto. Los usuarios podrán explorar con su avatar, crear contenido con ayuda de IA y trasladar identidad y contenido compatible entre mundos, respetando las reglas de cada servidor.

La primera entrega es un mundo pequeño y confiable. La federación, la portabilidad y la creación asistida se incorporan después, mediante pruebas concretas. No se presupone que IA, blockchain, WebGPU o una base de datos distribuida sean requisitos para todas las etapas.

## Punto de partida

Ya existen un servidor HTTP/WebSocket en Node.js, cliente Three.js, terreno, avatar básico, controles, reconexión y sincronización de jugadores a 20 Hz. Se comprobó el arranque, la entrega de recursos HTTP y una captura del mundo renderizado. El cierre ante JSON `null` fue corregido y cubierto por regresión en la etapa 1; también se verificó el renderizado con dos clientes Chrome.

Las etapas 1 y 2 están implementadas y verificadas: multijugador estabilizado, modelo de entidades y protocolo versionado con operaciones confirmadas. Todavía faltan importación de modelos, comportamientos configurables, persistencia, cuentas individuales, herramientas de construcción, integración de IA y federación.

Se inició además la integración transversal de avatares: humanoide procedural de 17 huesos, editor, catálogo público protegido y apariencia sincronizada, con preferencia local del navegador. [Análisis actualizado y evidencia](estado-proyecto.md). Esta entrega no completa importación GLB, cuentas ni persistencia del mundo.

## Cómo usar esta lista

- Completar las etapas en orden, salvo las tareas explícitamente paralelas.
- Convertir cada tarea grande en una incidencia con responsable, dependencias y evidencia de aceptación.
- Cerrar tareas con una demostración o comprobación reproducible.
- Registrar decisiones y cambios de alcance en `docs`; revisar esta hoja después de cada hito.
- Definir presupuestos de rendimiento, capacidad y costo antes de probarlos; los valores propuestos aquí son objetivos iniciales, no capacidades comprobadas.

## 0. Definir el producto y sus límites

Documentación: [especificación del Nivel 0](producto-nivel-0.md) y [registro de decisiones](decisiones-arquitectura.md). **Estado: completada el 13 de octubre de 2026.** El propietario confirmó licencia MIT con titular appsevolution.com.mx, alcance y metas iniciales. Equipo de referencia identificado. La implementación y las mediciones pertenecen a las etapas siguientes.

- [x] Escribir tres recorridos iniciales: entrar y explorar; colocar un objeto; regresar y encontrarlo guardado.
- [x] Definir los roles iniciales: visitante, creador, moderador y administrador del mundo.
- [x] Especificar qué significa «mundo»: servidor responsable de sus reglas, estado, usuarios conectados y permisos.
- [x] Definir qué significa «abierto»: documentación del protocolo, posibilidad de alojar un servidor y exportar contenido autorizado.
- [x] Decidir la licencia del código y distinguirla de las licencias de modelos, texturas y contenido creado por usuarios. MIT incorporada en `LICENSE`.
- [x] Definir la audiencia y los dispositivos iniciales. Confirmado: escritorio con teclado y mouse, grupo invitado.
- [x] Separar el alcance del Nivel 0 de objetivos posteriores: federación, economía, voz, VR y generación de contenido en vivo.
- [x] Definir metas medibles para la primera versión: jugadores simultáneos, objetos por mundo, peso máximo por asset, latencia y FPS en un equipo de referencia. Metas principales aceptadas; validación técnica pendiente.
- [x] Crear un registro de decisiones de arquitectura con alternativas, motivos y condiciones para reconsiderarlas.

**Aceptación:** existe una especificación breve del Nivel 0 con recorridos, límites y objetivos verificables.

## 1. Estabilizar la Fase 1 existente

Dependencia: etapa 0.

**Estado: completada el 13 de octubre de 2026.** Implementación y pruebas de servidor y dos clientes Chrome aprobadas. Evidencia, límites y repetición manual en [validación de la etapa 1](validacion-etapa-1.md).

- [x] Validar que cada mensaje recibido sea un objeto válido antes de acceder a sus propiedades; rechazar `null`, arreglos y tipos inesperados.
- [x] Validar tipos, rangos y tamaño de los mensajes del protocolo.
- [x] Gestionar errores de sockets y desconexiones sin terminar el proceso.
- [x] Agregar heartbeat `ping/pong` para detectar conexiones perdidas y retirar sus jugadores.
- [x] Limitar la frecuencia de mensajes por conexión y controlar clientes con acumulación de envíos pendientes.
- [x] Revisar identificadores de jugadores para evitar colisiones y mantener separadas conexión e identidad futura.
- [x] Reiniciar correctamente velocidad vertical, estado de salto y caché de envíos al reconectar.
- [x] Limpiar entrada de teclado y saltos pendientes al perder foco o captura del mouse.
- [x] Liberar geometrías y materiales al eliminar avatares.
- [x] Verificar movimiento diagonal, límites del terreno, salto, cámara y recuperación de la captura del mouse.
- [x] Probar altas, bajas, movimiento y reconexión entre dos o más clientes.
- [x] Verificar rutas estáticas y que no sea posible leer archivos fuera de los directorios publicados.
- [x] Documentar instalación, ejecución, controles, puerto y diagnóstico básico en `README.md`.
- [x] Eliminar o justificar archivos vacíos y dejar claro que `client/main.js` es el punto de entrada.
- [x] Agregar comprobaciones de regresión para mensajes malformados y ciclo de conexión.

**Aceptación:** dos clientes interactúan sin errores; enviar JSON inválido o `null` no detiene el servidor; perder la red y regresar no deja jugadores fantasma.

## 2. Consolidar el modelo de mundo y protocolo

Dependencia: etapa 1.

**Estado: completada.** Esquema, autoridad, revisiones, permisos y recuperación documentados en [modelo de mundo y protocolo](modelo-mundo-protocolo.md). Creación, edición y eliminación verificadas por WebSocket; creación y reconexión comprobadas con dos clientes Chrome. El almacenamiento sigue en memoria hasta la etapa 5.

- [x] Separar responsabilidades de transporte, simulación, entidades y almacenamiento en el servidor.
- [x] Definir identificadores estables de mundo, entidad, asset y usuario.
- [x] Definir una entidad con versión de esquema, transformación, referencia al asset y componentes de comportamiento.
- [x] Establecer unidades, ejes, orientación, escala, límites de coordenadas y convenciones de transformación.
- [x] Elegir componentes y sistemas sencillos o eventos desacoplados; evitar comportamientos incrustados en el código del renderizador.
- [x] Definir mensajes de creación, modificación y eliminación de entidades, con confirmación o rechazo.
- [x] Versionar el protocolo y devolver un error comprensible ante versiones incompatibles.
- [x] Documentar la propiedad y autoridad de cada dato: cliente propone; servidor valida y confirma el estado compartido.
- [x] Separar mensajes transitorios, como movimiento, de operaciones duraderas, como colocar un objeto.
- [x] Agregar identificadores de operación para evitar creaciones duplicadas al reintentar.
- [x] Definir snapshot inicial, actualizaciones posteriores y recuperación tras reconexión.

**Aceptación:** el esquema y los mensajes están documentados; es posible crear una entidad de prueba desde un cliente y verla en otro mediante el servidor.

## AV. Sistema de avatares — línea transversal

Esta línea se añadió después de la etapa 2 por solicitud del propietario. Conserva la numeración de las etapas existentes. **AV.1 está completada; el sistema completo sigue en desarrollo.** Las siguientes entregas comparten infraestructura con las etapas 3, 5, 7, 8 y 10–11; no deben crear un segundo sistema incompatible de assets, permisos o almacenamiento.

Referencias: [estado y evidencia](estado-proyecto.md), [contrato de integración](avatares-integracion.md) y [preparación de modelos GLB](AVATAR_ASSETS.md).

### AV.1. Base procedural y edición básica — completada

Dependencia: etapas 1 y 2. Evidencia: pruebas automatizadas y dos clientes Chrome, documentadas en `estado-proyecto.md`.

- [x] Revisar e incorporar los archivos preparados con Claude.
- [x] Integrar humanoide procedural con 17 huesos y animación de reposo, movimiento y salto.
- [x] Conservar cápsula de fallback mientras se construye una apariencia válida.
- [x] Integrar catálogo público de piezas básicas protegido contra modificaciones desde el editor.
- [x] Incorporar 10 slots: cabello, cejas, ojos, nariz, boca, torso, pantalón, calzado, gorro y lentes.
- [x] Abrir editor mediante botón o V, con vista previa y controles de cuerpo y color.
- [x] Separar borrador, cancelación y apariencia confirmada; pausar controles del mundo al editar.
- [x] Validar IDs, colores, proporciones y presupuesto en servidor; no aceptar URLs del navegador.
- [x] Sincronizar apariencia en conexión, entrada de otros jugadores y cambios durante la sesión.
- [x] Guardar la preferencia en el navegador y revalidarla al reconectar.
- [x] Agrupar geometría y usar colores por vértice sin elevar límites: predeterminado de 39 a 2 draw calls de geometría.
- [x] Verificar esqueletos independientes, cambios rápidos y liberación de recursos procedurales.

**Aceptación alcanzada:** dos usuarios personalizan su avatar y observan la apariencia aceptada del otro sin perder controles, creación de cubos ni reconexión. La preferencia local no equivale a persistencia de cuenta.

### AV.2. Cuerpos y piezas GLB — pendiente

Dependencia: AV.1 y validación/almacenamiento/entrega de assets de la etapa 3. Puede prepararse un paquete de prueba antes, pero no habilitar sus archivos en el catálogo operativo sin validarlos.

- [ ] Recibir al menos un cuerpo GLB, una pieza rígida y una prenda skinned con autoría y permisos registrados.
- [ ] Comparar escala, orientación, pivote, jerarquía, nombres, pose de reposo y matrices de bind con el rig instalado.
- [ ] Certificar alias de huesos con archivos reales; rechazar rigs incompatibles o usar fallback explícito.
- [ ] Validar pesos, influencias por vértice, número de huesos, clips y morph targets además de geometría y texturas.
- [ ] Conectar la configuración del editor con IDs y versiones del catálogo de recursos; resolver la coexistencia actual de ambos contratos.
- [ ] Entregar únicamente assets públicos instalados y validados mediante rutas controladas; mantener privados fuera del montaje público.
- [ ] Habilitar cuerpo GLB, anclajes rígidos y ropa skinned por separado, con pruebas para cada modalidad.
- [ ] Asegurar clonación independiente de esqueletos y materiales, caché acotada y propiedad correcta de recursos GPU.
- [ ] Verificar clips de reposo, marcha, carrera y salto, y fallback de animación cuando falte un clip.
- [ ] Probar cambios durante una descarga, cancelación, archivo ausente y descarte de cargas obsoletas.
- [ ] Medir el presupuesto del avatar completo después de ensamblarlo; no asumir que la optimización procedural funciona con GLB arbitrarios.

**Aceptación:** dos clientes ven el mismo avatar GLB con una pieza rígida y una prenda animada; cambiar uno no altera al otro y un fallo de carga conserva una representación utilizable.

### AV.3. Catálogo personal público/privado y cuotas — pendiente

Dependencia: AV.2, cargas de etapa 3 e identidades/autorización de etapa 7. Las políticas internas ya preparadas no equivalen a un servicio de cargas habilitado.

- [x] Preparar biblioteca interna de propiedad, acceso público/privado y protección de básicos.
- [x] Preparar cuotas diferenciadas de almacenamiento y un presupuesto gráfico común, con pruebas de ambas políticas.
- [ ] Conectar esas políticas a cada carga, publicación, consulta y eliminación reales.
- [ ] Asignar el perfil jugador/operador desde una identidad confiable; no aceptar una declaración del navegador como prueba de que opera un servidor.
- [ ] Validar con mediciones las cuotas iniciales propuestas: jugador 25 assets/100 MiB; operador 500 assets/1 GiB.
- [ ] Aplicar cuota global del anfitrión, reservas de cargas simultáneas, límites de tráfico y liberación de reservas fallidas.
- [ ] Excluir básicos de la cuota personal y contabilizar contenido propio tanto público como privado.
- [ ] Crear biblioteca personal con filtros de propiedad, visibilidad y compatibilidad de rig.
- [ ] Implementar permisos de visualización para piezas privadas equipadas: permitir renderizarlas en una sesión sin volverlas públicas ni conceder reutilización.
- [ ] Crear revisiones o copias autorizadas sin sobrescribir originales del núcleo ni recursos ajenos.
- [ ] Impedir eliminación de recursos referenciados por presets, usuarios o mundos; definir revocación y fallback.

**Aceptación:** un jugador y un operador tienen cuotas distintas comprobables, los básicos siguen intactos y ningún cliente recibe metadatos o archivos privados sin autorización.

### AV.4. Perfiles persistentes y rendimiento — pendiente

Dependencia: AV.2–AV.3 para contenido personal, persistencia de etapa 5 e identidad de etapa 7. Medición y optimización se coordinan con etapa 8. Se puede persistir antes un preset de básicos cuando existan cuentas.

- [ ] Guardar selección, versiones de recursos y presets por usuario en servidor.
- [ ] Recuperar apariencia desde otra sesión/dispositivo y tras reiniciar, sin depender de `localStorage`.
- [ ] Migrar configuraciones cuando cambien esquemas, catálogos o versiones de rig.
- [ ] Incluir perfiles, assets, permisos, referencias y consumo de cuota en respaldos y restauración.
- [ ] Implementar LOD o sustitutos según distancia y presupuesto total de escena.
- [ ] Probar 10 usuarios con diferentes composiciones y medir FPS, memoria, red y costo de animación en el equipo de referencia.
- [ ] Ajustar límites mediante evidencia; tener un catálogo mayor nunca amplía automáticamente el presupuesto del avatar equipado.

**Aceptación:** el perfil se recupera con su identidad y permisos después de un reinicio, y las composiciones admitidas cumplen las metas medidas de la escena multijugador.

### AV.5. Portabilidad y creación asistida — posterior

Dependencia: AV.4, generación de etapa 9 y federación/portabilidad de etapas 10–11, según la función.

- [ ] Aplicar a avatares generados con IA el mismo inspector, licencias y límites que a importaciones manuales.
- [ ] Negociar rig, capacidades, escala y permisos de avatar al viajar entre mundos.
- [ ] Conservar una apariencia de sustitución cuando el destino no admita una pieza o su comportamiento.
- [ ] Transportar únicamente referencias y permisos autorizados; respetar privacidad y reglas del destino.

**Aceptación:** un avatar permitido viaja entre dos mundos independientes o usa fallback explícito, sin perder propiedad ni eludir límites del destino.

## 3. Importar GLB/GLTF — Fase 2

**Consideración transversal añadida:** el catálogo y la importación deben respetar [el contrato de avatares y assets](avatares-integracion.md): básicos públicos e inmutables, contenido propio público/privado, cuota por perfil y presupuesto gráfico acumulado. Políticas, editor y rig procedural están integrados. GLB externos, cargas propias, acceso privado y persistencia siguen pendientes. Esta integración no completa la etapa 3.

Dependencia: etapa 2.

- [ ] Implementar selector y arrastre de archivos con previsualización local.
- [ ] Empezar por GLB autocontenido; definir posteriormente cómo empaquetar GLTF con recursos externos.
- [ ] Integrar `GLTFLoader` y mostrar errores de carga comprensibles.
- [ ] Definir límites de bytes, triángulos, materiales, texturas, dimensiones y animaciones.
- [ ] Validar el archivo en el servidor; no confiar únicamente en extensión o comprobaciones del navegador.
- [ ] Rechazar referencias externas no autorizadas y evitar que el servidor descargue URLs arbitrarias.
- [ ] Implementar almacenamiento de archivos con nombres internos seguros, hash y metadatos.
- [ ] Separar la carga del archivo por HTTP de la sincronización de entidades por WebSocket.
- [ ] Publicar los assets mediante identificadores y rutas estables que otros clientes puedan resolver.
- [ ] Incorporar posición, rotación y escala en la previsualización antes de confirmar.
- [ ] Enviar la solicitud de colocación al servidor y replicar la entidad confirmada.
- [ ] Reutilizar assets idénticos por hash y gestionar carga fallida o cancelada.
- [ ] Solicitar autoría, origen y licencia del contenido importado.

**Aceptación:** un usuario carga un GLB, lo coloca y un segundo usuario descarga y ve la misma entidad con idéntica transformación.

## 4. Comportamientos configurables — Fase 3

Dependencia: etapas 2 y 3.

- [ ] Definir esquemas JSON versionados para los componentes admitidos.
- [ ] Implementar un registro de comportamientos conocidos y rechazar los desconocidos.
- [ ] Crear componentes iniciales: transformación, renderizado, colisión, interacción y animación.
- [ ] Definir parámetros acotados para cada comportamiento y valores predeterminados.
- [ ] Implementar una interacción sencilla, como activar un objeto o abrir una puerta.
- [ ] Sincronizar el resultado de las interacciones a través del servidor.
- [ ] Definir el ciclo de vida de los sistemas: creación, actualización y eliminación.
- [ ] Definir cómo se carga, reproduce y sincroniza una animación disponible en el GLB.
- [ ] Implementar primero colisiones estáticas simples; evaluar un motor físico solo si los recorridos lo requieren.
- [ ] Definir capas de colisión y separación entre geometría visual y volumen físico.
- [ ] Aplicar permisos a las acciones que alteran entidades.
- [ ] Preparar ejemplos JSON documentados y rechazar configuraciones inválidas sin romper el mundo.
- [ ] Mantener fuera de esta fase la ejecución de JavaScript arbitrario aportado por usuarios.

**Aceptación:** dos instancias del mismo modelo pueden tener comportamientos distintos por configuración; una interacción se refleja en todos los clientes autorizados.

## 5. Persistencia y recuperación — Fase 4

Dependencia: etapas 2 a 4.

- [ ] Elegir almacenamiento inicial y documentar la decisión; SQLite es una opción inicial para entidades y metadatos, con assets en archivos.
- [ ] Separar estado persistente del mundo y estado temporal de conexiones.
- [ ] Diseñar tablas o documentos para mundos, entidades, componentes y referencias a assets.
- [ ] Implementar migraciones de esquema con versiones.
- [ ] Guardar creaciones, cambios y eliminaciones mediante operaciones atómicas.
- [ ] Confirmar operaciones duraderas al cliente después de completar la escritura correspondiente.
- [ ] Definir frecuencia de guardado del estado dinámico y pérdida máxima aceptable ante caída.
- [ ] Restaurar el mundo antes de aceptar sesiones que necesiten su estado.
- [ ] Detectar referencias rotas o assets ausentes y mostrar sustitutos sin impedir la carga global.
- [ ] Evitar sobrescrituras silenciosas mediante versiones de entidad o una política explícita de concurrencia.
- [ ] Implementar exportación e importación del mundo con manifiesto de assets.
- [ ] Crear copias de seguridad coherentes de base de datos y archivos.
- [ ] Probar restauración en una instalación limpia y recuperación después de una interrupción abrupta.

**Aceptación:** colocar, editar y eliminar objetos; reiniciar el servidor; comprobar el mismo estado. Una copia de seguridad permite reconstruir el mundo en otra carpeta o máquina.

## 6. Herramientas de construcción y creación colaborativa

Dependencia: etapa 5.

- [ ] Crear un modo de construcción separado del modo exploración.
- [ ] Incorporar selección visual y manipuladores de posición, rotación y escala.
- [ ] Añadir ajuste a cuadrícula, duplicado y eliminación con confirmación contextual.
- [ ] Crear un inspector de componentes y propiedades con validación visible.
- [ ] Implementar deshacer y rehacer con reglas explícitas cuando otro usuario haya editado la entidad.
- [ ] Crear una biblioteca de assets con búsqueda, miniaturas, autoría y licencia.
- [ ] Mostrar progreso de carga, errores y operaciones pendientes.
- [ ] Definir permisos por mundo y, si es necesario, por zona u objeto.
- [ ] Resolver edición simultánea mediante bloqueo temporal o control de versiones.
- [ ] Registrar quién cambió qué y permitir restaurar versiones de contenido.
- [ ] Construir un mundo de demostración que enseñe importación, comportamiento y persistencia.

**Aceptación:** una persona puede construir y guardar una escena pequeña desde la interfaz sin editar código ni JSON manualmente.

## 7. Identidad, permisos y operación de un mundo público

Dependencia: etapa 5; puede desarrollarse en paralelo con la etapa 6.

- [ ] Separar cuenta, sesión, avatar e identificador de conexión.
- [ ] Elegir autenticación inicial y definir inicio, expiración y revocación de sesiones.
- [ ] Autorizar cada operación en el servidor, independientemente de lo que muestre la interfaz.
- [ ] Definir roles y límites de almacenamiento, carga y creación por usuario.
- [ ] Definir consentimiento, datos personales guardados, retención y eliminación.
- [ ] Incorporar bloqueo, expulsión, reportes y un registro de moderación accesible solo a los roles correspondientes.
- [ ] Preparar despliegue con HTTPS/WSS, configuración por entorno y secretos fuera del código.
- [ ] Configurar orígenes admitidos, límites de carga y acceso a endpoints administrativos.
- [ ] Añadir registros estructurados y métricas de conexiones, mensajes, latencia, memoria y errores.
- [ ] Implementar apagado ordenado, comprobación de salud y reinicio supervisado.
- [ ] Documentar despliegue, actualización, migración, respaldo y restauración.
- [ ] Probar el proceso de instalación con una persona que no haya desarrollado el proyecto.

**Aceptación:** un operador puede alojar el mundo siguiendo la documentación y administrar accesos, incidentes y copias de seguridad.

## 8. Autoridad del servidor y rendimiento

Dependencia: etapa 2; completar antes de una apertura pública amplia.

- [ ] Migrar de posiciones confiadas a entradas o movimientos validados por el servidor.
- [ ] Establecer límites de velocidad, salto, aceleración y frecuencia de acciones.
- [ ] Mantener simulación del servidor con paso temporal definido.
- [ ] Agregar predicción local y reconciliación si la latencia percibida lo requiere.
- [ ] Definir interpolación remota con una ventana y tolerancia explícitas.
- [ ] Medir rendimiento gráfico y de red con escenas y equipos reproducibles.
- [ ] Incorporar niveles de detalle, instancias, compresión y carga progresiva según las mediciones.
- [ ] Distribuir entidades por zonas de interés para evitar enviar todo el mundo a cada cliente.
- [ ] Establecer presupuestos de memoria GPU, texturas y entidades activas.
- [ ] Ejecutar pruebas con latencia, pérdida de red, clientes lentos y ráfagas de conexiones.
- [ ] Probar escalones de concurrencia, por ejemplo 10, 25 y 50 clientes, sin asumir de antemano que se alcanzarán.
- [ ] Registrar el punto de saturación y definir límites de admisión por mundo.

**Aceptación:** se cumplen las metas acordadas en la etapa 0 y los clientes no pueden imponer movimientos o interacciones fuera de las reglas del mundo.

## 9. IA para creación de contenido

Dependencia: etapas 3 a 7. La investigación de proveedores puede adelantarse; la integración depende de una importación segura.

- [ ] Elegir un primer caso acotado: generar un objeto estático mediante texto.
- [ ] Evaluar generación externa y local con ejemplos propios, midiendo calidad, tiempo, costo, licencias y formato exportado.
- [ ] Crear una interfaz de proveedor para cambiar de servicio sin modificar el modelo de mundo.
- [ ] Procesar solicitudes mediante trabajos asíncronos con progreso, cancelación y reintento.
- [ ] Proteger credenciales en servidor y establecer cuotas y presupuestos por usuario.
- [ ] Pasar todo resultado por el mismo proceso de validación y optimización que los archivos importados.
- [ ] Mostrar una previsualización y requerir una acción del creador antes de incorporarlo al mundo.
- [ ] Registrar proveedor, prompt, fecha, licencia y procedencia del asset cuando corresponda.
- [ ] Añadir generación de configuraciones JSON usando exclusivamente componentes permitidos.
- [ ] Validar de forma determinista las configuraciones; la evaluación de una IA no sustituye permisos ni límites del servidor.
- [ ] Evaluar después avatares y animaciones con un contrato explícito de esqueleto y compatibilidad.
- [ ] Si se admiten scripts en el futuro, diseñar primero aislamiento, capacidades, límites de CPU/memoria y terminación; tratarlo como proyecto independiente.

**Aceptación:** una persona solicita un objeto, revisa el resultado y lo publica con un comportamiento permitido, dentro de un costo y tiempo medidos.

## 10. Federación mínima entre dos mundos

Dependencia: etapas 7 y 8; la IA no es requisito para federar.

- [ ] Publicar una especificación abierta del manifiesto de un mundo: identidad, URL, versión, capacidades, reglas y estado de acceso.
- [ ] Crear dos servidores independientes con bases de datos y administradores separados.
- [ ] Definir un endpoint de descubrimiento y un directorio inicial que pueda reemplazarse o autoalojarse.
- [ ] Establecer identidades verificables de servidor, autenticación entre nodos y protección ante repetición de mensajes.
- [ ] Diseñar el proceso de viaje: solicitar destino, validar acceso, reservar sesión, transferir datos admitidos y confirmar llegada.
- [ ] Implementar primero portales con transición visible y carga explícita.
- [ ] Acordar qué acepta el destino: apariencia del avatar, escala, componentes y límites de assets.
- [ ] Implementar un avatar de sustitución si el original no es compatible.
- [ ] Mantener cada servidor como autoridad de su mundo y evitar escrituras remotas sin permiso.
- [ ] Definir rechazo, expiración, caída del destino y regreso seguro al origen.
- [ ] Probar versiones incompatibles, servidores no confiables y manifiestos inválidos.
- [ ] Publicar una implementación de referencia y una suite de conformidad del protocolo.

**Aceptación:** un usuario viaja entre dos mundos operados por separado; ambos aplican sus propias reglas y una falla del destino no bloquea la sesión indefinidamente.

## 11. Identidad y contenido portables

Dependencia: etapa 10.

- [ ] Definir la portabilidad mínima: identidad verificable y apariencia antes que inventario con valor o logros.
- [ ] Evaluar identidad federada y claves del usuario, incluyendo recuperación de cuenta y revocación.
- [ ] Evitar que un identificador portable obligue a compartir datos personales innecesarios.
- [ ] Crear manifiestos de contenido con hashes, versiones, autoría, licencia y dependencias.
- [ ] Separar propiedad declarada, permiso de uso y reconocimiento por parte de cada mundo.
- [ ] Diseñar negociación de capacidades y conversiones explícitas entre reglas compatibles.
- [ ] Definir exportación e importación de inventario y prevención de duplicados cuando exista transferencia exclusiva.
- [ ] Resolver conflictos, reintentos y caídas durante transferencias mediante estados y operaciones idempotentes.
- [ ] Establecer políticas para assets revocados, contenido eliminado y enlaces que dejan de estar disponibles.
- [ ] Evaluar firmas o registros adicionales únicamente según el modelo de confianza; no introducir una cadena de bloques por defecto.

**Aceptación:** el usuario usa una identidad verificable en dos mundos y presenta contenido cuyo origen e integridad pueden comprobarse; el destino decide si lo admite.

## 12. Distribución de assets y descubrimiento descentralizado

Dependencia: etapas 10 y 11.

- [ ] Separar la ubicación de descarga del identificador del contenido.
- [ ] Añadir caché local y réplicas con verificación por hash.
- [ ] Comparar almacenamiento HTTP replicado y P2P mediante disponibilidad, costo, privacidad y facilidad operativa.
- [ ] Probar un backend P2P opcional con política explícita de retención y réplicas responsables.
- [ ] Definir cómo obtener contenido cuando el creador o el servidor de origen esté desconectado.
- [ ] Evitar cargar assets completos en cada viaje cuando ya estén presentes y verificados.
- [ ] Permitir múltiples directorios de mundos y listas de confianza elegidas por el usuario.
- [ ] Verificar estado y capacidades de mundos sin dar por verdaderos todos los datos anunciados.
- [ ] Diseñar controles contra spam y abuso del descubrimiento.
- [ ] Incorporar búsqueda semántica o recomendaciones con IA después de contar con metadatos y controles de privacidad.

**Aceptación:** un asset autorizado sigue disponible mediante una réplica cuando cae su origen; el usuario puede descubrir mundos sin depender de un único directorio.

## 13. Ecosistema extensible y gobierno comunitario

Dependencia: una federación mínima operativa.

- [ ] Publicar documentación para operadores, creadores y desarrolladores de componentes.
- [ ] Definir un proceso público de propuestas y evolución del protocolo.
- [ ] Establecer versiones compatibles, plazos de migración y políticas de retirada de funciones.
- [ ] Publicar ejemplos de mundos y paquetes de contenido con licencias claras.
- [ ] Crear herramientas de diagnóstico y certificación de compatibilidad entre servidores.
- [ ] Diseñar un sistema de extensiones con capacidades explícitas y aislamiento antes de permitir código de terceros.
- [ ] Definir moderación local por mundo y mecanismos voluntarios de confianza entre operadores.
- [ ] Definir sostenibilidad: costos de alojamiento, almacenamiento, generación IA y mantenimiento.
- [ ] Evaluar economía o intercambio solo si existe una necesidad de producto; definir antes fraude, disputas y reglas aplicables.
- [ ] Probar que una persona externa puede crear un mundo compatible sin modificar el núcleo del cliente.

**Aceptación:** un tercero opera un mundo y publica contenido compatible usando documentación y herramientas públicas.

## 14. Experiencia avanzada: móvil, VR y continuidad

Dependencia: rendimiento medido y federación estable. Son líneas opcionales según la prioridad del producto.

- [ ] Diseñar controles táctiles y presupuestos gráficos para móvil.
- [ ] Evaluar WebXR con locomoción, interacción y comodidad específicas para VR.
- [ ] Añadir accesibilidad: reasignación de controles, sensibilidad, legibilidad y alternativas de interacción.
- [ ] Evaluar voz espacial con permisos, bloqueo y costos operativos definidos.
- [ ] Comparar WebGL y WebGPU mediante necesidades y mediciones reales del cliente.
- [ ] Medir si hace falta WebAssembly en subsistemas concretos antes de incorporarlo.
- [ ] Precargar destinos cuando el usuario se acerque a un portal, respetando consumo de datos y memoria.
- [ ] Investigar transiciones continuas solo entre mundos con contratos compatibles de física, coordenadas y autoridad.
- [ ] Evaluar asistencia de IA para creación o descubrimiento sin ponerla en la ruta crítica de cada fotograma o acción.

**Aceptación:** cada nueva plataforma tiene recorridos probados y metas propias; las mejoras de continuidad no comprometen la autoridad ni la recuperación de sesiones.

## Hitos y orden recomendado

| Hito | Etapas necesarias | Evidencia de finalización |
| --- | --- | --- |
| A. Multijugador confiable | 0–1 | Dos clientes, desconexión y mensajes inválidos sin caída |
| AV.1. Personalización procedural — completado | 1–2 y AV.1 | Editor, apariencia replicada y presupuesto verificados con dos clientes |
| AV.2. Avatares GLB | 3 y AV.2 | Cuerpo, pieza rígida y prenda skinned certificados |
| AV.3–4. Avatares personales persistentes | 3, 5, 7–8 y AV.3–4 | Privacidad, cuotas, perfiles recuperables y rendimiento medido |
| B. Nivel 0 completo | 2–5 | Cargar GLB, asignar comportamiento y conservarlo tras reiniciar |
| C. Mundo creador utilizable | 6–8 | Construcción desde interfaz, permisos y capacidad medida |
| D. Creación asistida | 9 | Prompt → previsualización → objeto validado y persistente |
| E. Primer universo federado | 10 | Viaje entre dos servidores independientes |
| F. Portabilidad y resiliencia | 11–12 | Identidad verificable, contenido compatible y réplicas |
| G. Ecosistema abierto | 13 | Un tercero aloja un mundo interoperable |
| H. Experiencia expandida | 14 | Móvil, VR o continuidad según prioridades comprobadas |

Las etapas 9 y 10 son ramas independientes después de consolidar el mundo: federación y creación con IA pueden avanzar en el orden que aporte más valor. No se fija un calendario hasta estimar tareas con disponibilidad del equipo y resultados del primer hito.

La base procedural AV.1 ya acompaña al prototipo. AV.2 comparte el siguiente trabajo con la etapa 3; AV.3–4 se completarán conforme estén disponibles cuentas, permisos y persistencia. No es necesario terminar todo el sistema de avatares antes de avanzar el mundo.

## Próxima tanda concreta de trabajo

Las etapas 1–2 y AV.1 están completadas. La siguiente tanda une la infraestructura de etapa 3 con la preparación de AV.2:

1. Definir el contrato HTTP de carga GLB y los metadatos de autoría y licencia.
2. Validar tamaño, estructura y complejidad de assets en servidor.
3. Incorporar almacenamiento y catálogo de assets con hash e identificadores estables.
4. Implementar selector, arrastre y previsualización mediante `GLTFLoader`.
5. Instanciar el asset mediante las operaciones de entidades existentes y comprobar su visualización desde otro cliente.
6. Usar esa infraestructura para certificar un cuerpo y piezas GLB de avatar, antes de habilitarlos en el editor. Mantener el humanoide procedural disponible durante toda la integración.

## Riesgos que requieren decisiones explícitas

- **Interoperabilidad:** un protocolo compartido y contratos de capacidades son la base; no se asume que una IA pueda traducir motores o físicas arbitrarias de manera confiable.
- **Generación:** calidad, rigging, costo y tiempos deben medirse con modelos reales; no se promete generación instantánea universal.
- **Portabilidad:** trasladar un objeto no implica que todos los mundos acepten su poder, comportamiento o valor.
- **Disponibilidad:** direccionar contenido por hash no garantiza que alguien lo almacene; hacen falta responsables de réplicas y costos.
- **Escala:** un mundo grande y muchos mundos pequeños son problemas diferentes; medir antes de distribuir la simulación.
- **Confianza:** un nodo federado o una configuración generada por IA no reciben permisos automáticamente.

El sueño se considera demostrado cuando operadores independientes pueden alojar mundos compatibles, usuarios pueden viajar entre ellos y crear contenido portable permitido, y la continuidad del ecosistema no depende de un único servidor, directorio o proveedor de IA.
