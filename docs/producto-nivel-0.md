# MiOasis: definición del producto y límites del Nivel 0

Fecha: 13 de octubre de 2026. Estado: etapa 0 completada. El propietario confirmó licencia MIT, titular appsevolution.com.mx, alcance y metas iniciales. Equipo de referencia identificado; las capacidades técnicas siguen pendientes de medición.

## 1. Visión y primera entrega

**Actualización autorizada de alcance:** se integró un editor de apariencia procedural como extensión transversal, manteniendo el presupuesto y la cápsula de fallback. Los avatares GLB personalizados, la generación IA y la identidad persistente continúan fuera de la entrega actual. Evidencia en [estado del proyecto](estado-proyecto.md).

MiOasis busca conectar mundos 3D persistentes operados por personas independientes. La comunidad podrá explorar, construir y, progresivamente, crear con IA y viajar entre mundos con identidad y contenido compatible.

El Nivel 0 demuestra una parte concreta: varias personas entran al mismo mundo desde un navegador, colocan objetos GLB con comportamientos permitidos y encuentran esos objetos después de reiniciar el servidor. Se considera un prototipo para pruebas con personas invitadas, no una plataforma pública terminada.

## 2. Audiencia y dispositivos

La audiencia inicial es el propietario del proyecto y un grupo pequeño de personas invitadas que quieran explorar y probar creación de escenas. No se presupone experiencia en programación para explorar o colocar objetos.

La plataforma inicial es una computadora de escritorio o portátil con teclado, mouse y navegador compatible con módulos ES, import maps, WebGL y captura del puntero. Se propone usar Chrome y Edge estables como navegadores de prueba iniciales; registrar su versión exacta al medir. La compatibilidad todavía no se ha certificado.

Móvil, controles táctiles, mandos, VR y WebXR quedan para etapas posteriores. El prototipo debe permitir ajustar sensibilidad y mostrar instrucciones legibles; una revisión completa de accesibilidad se planificará antes de ampliar la audiencia.

## 3. Qué es un mundo y qué significa abierto

Un **mundo** es un espacio lógico con identificador estable, reglas, entidades persistentes, referencias a assets y permisos. Un servidor es responsable de admitir usuarios, validar cambios, conservar el estado y transmitirlo. En el Nivel 0 habrá un mundo por proceso y almacenamiento local; cada conexión representa una sesión temporal, no una identidad portable.

Un **asset** es un recurso reutilizable, como un modelo GLB. Una **entidad** es una instancia dentro del mundo con identificador, transformación, referencia al asset y componentes. Eliminar una instancia no implica borrar un asset todavía usado por otras entidades.

**Abierto** expresa compromisos progresivos: documentar formatos y protocolo, permitir autoalojamiento y exportar el mundo y el contenido que el operador esté autorizado a exportar. Las licencias determinarán los derechos de reutilización del código y los assets. La federación añadirá posteriormente interoperabilidad entre operadores; no forma parte del Nivel 0.

Cada mundo conservará autoridad sobre sus reglas. La portabilidad futura no obligará a aceptar cualquier objeto o comportamiento.

## 4. Roles y permisos

| Rol | Puede hacer | Restricciones |
| --- | --- | --- |
| Visitante | Entrar, moverse, observar e interactuar con acciones públicas permitidas | No carga assets ni cambia entidades persistentes |
| Creador | Lo anterior, cargar GLB y crear, modificar o eliminar sus entidades | Respeta cuotas y no cambia objetos ajenos |
| Moderador | Revisar contenido, retirar entidades problemáticas y expulsar sesiones | No administra infraestructura ni concede administración |
| Administrador | Configurar el mundo, asignar permisos y gestionar respaldo y restauración | Sus acciones sensibles deben quedar registradas cuando exista auditoría |

Para el Nivel 0 se admite un grupo cerrado: visitante por defecto y creación concedida explícitamente por el operador mediante un mecanismo mínimo validado en servidor. La autenticación de cuentas, el panel de moderación y la auditoría completa se desarrollarán después. Hasta entonces, las funciones de moderación y administración se operan desde el servidor; ocultar un botón nunca cuenta como control de acceso.

## 5. Recorridos iniciales

### R1. Entrar y explorar

Precondición: servidor activo y URL accesible.

1. El usuario abre la URL y ve instrucciones y estado de conexión.
2. El servidor asigna una sesión y entrega jugadores y entidades existentes.
3. El cliente carga la escena y permite movimiento con WASD/flechas y cámara con mouse.
4. Otro usuario entra; ambos ven sus avatares y desplazamientos.
5. Al salir, su avatar se retira del resto de las sesiones.

**Aceptación:** dos navegadores observan sus cambios mutuos; el terreno y los objetos aparecen en posiciones coherentes. Una conexión fallida muestra un estado comprensible y puede reintentarse. Un asset ausente usa un sustituto sin impedir explorar el resto.

### R2. Colocar un objeto

Precondición: sesión con permiso de creación y GLB dentro de los límites.

1. El creador selecciona o arrastra un GLB.
2. La interfaz muestra validación, progreso y previsualización.
3. Ajusta posición, rotación y escala; elige un comportamiento permitido.
4. Confirma; el servidor valida permiso, asset y configuración.
5. El servidor guarda la entidad, confirma la operación y la comunica a los demás.

**Aceptación:** dos clientes ven el mismo identificador y transformación. Un archivo inválido o una acción sin permiso se rechaza sin crear estado parcial visible. Reintentar la misma operación no duplica la entidad. Si falla el guardado, la interfaz no informa éxito.

Para el Nivel 0 basta una selección sencilla de transformación y comportamiento; manipuladores avanzados, deshacer y biblioteca visual pertenecen a la etapa de herramientas.

### R3. Regresar y encontrar el mundo guardado

Precondición: existe al menos una entidad confirmada como guardada.

1. Los usuarios salen y el operador reinicia el servidor.
2. El servidor recupera entidades, transformaciones y componentes antes de entregar el mundo.
3. Un usuario vuelve a entrar y descarga los assets requeridos.
4. El objeto conserva su transformación y estado persistente; una entidad eliminada no reaparece.

**Aceptación:** comparar antes y después del reinicio identificadores, referencias, transformaciones y configuración. La recuperación no depende de la caché del navegador. Posición del jugador, conexiones y animaciones transitorias no necesitan persistir en esta entrega.

## 6. Alcance y exclusiones

| Incluido en Nivel 0 | Para etapas posteriores |
| --- | --- |
| Un servidor Node.js y un mundo | Federación y viajes entre mundos |
| Cliente JavaScript/Three.js con WebGL | WebGPU, WebAssembly y VR según necesidad |
| Avatar provisional, cámara, movimiento y salto | Avatares personalizados y rigging automático |
| Multijugador y reconexión | Identidad portable e inventario entre servidores |
| Importación GLB autocontenida | GLTF con dependencias externas y pipelines complejos |
| Entidades con configuración JSON validada | Código arbitrario de usuarios y extensiones aisladas |
| Objeto estático, colisión simple, una interacción y animación compatible | Física avanzada, combate y balance de juegos |
| Persistencia local y recuperación comprobada | Bases distribuidas y distribución P2P |
| Creación restringida a personas autorizadas | Registro público, paneles completos y moderación a escala |
| Copia y exportación básica del mundo y assets autorizados | Mercado, pagos y economía |
| Diagnóstico y comprobaciones de estabilidad esenciales | Voz espacial y generación IA integrada |

El formato general seguirá siendo GLB/GLTF; empezar con GLB autocontenido reduce ambigüedades de carga. La IA es una línea de producto posterior que utilizará la misma validación que cualquier importación manual.

## 7. Metas de aceptación

El propietario aceptó como objetivos iniciales 10 usuarios simultáneos, 100 objetos, máximo 10 MiB por GLB y una meta de 60 FPS en su equipo. Los demás valores de la tabla son presupuestos técnicos iniciales para hacer reproducibles las pruebas. No son resultados medidos ni promesas de capacidad. Si resultan inviables, registrar la medición y revisar el presupuesto antes de ampliar el alcance.

| Métrica | Objetivo inicial | Cómo comprobar |
| --- | --- | --- |
| Sesiones | 10 simultáneas por mundo | Sesión de 30 minutos con movimiento e interacciones; sin caída ni entidades duplicadas |
| Escena | 100 entidades estáticas y hasta 10 avatares | Usar assets reutilizados y registrar totales de geometría y texturas |
| Asset | Máximo 10 MiB por GLB | Rechazar el exceso en servidor antes de incorporarlo |
| Complejidad de asset | Hasta 50 000 triángulos, 8 materiales y texturas de hasta 2048 × 2048 | Inspección del recurso importado; definir también presupuesto total de escena |
| Escena de referencia | Hasta 500 000 triángulos visibles y 256 MiB estimados de texturas sin comprimir | Registrar método de estimación; no equivale a medir toda la memoria GPU |
| Fluidez | Mediana ≥ 60 FPS y percentil 95 del tiempo de fotograma ≤ 33,3 ms | Recorrido repetible de 5 minutos a 1280 × 720, DPR 1 y sombras activas |
| Sincronización | Percentil 95 de recepción de cambios remotos ≤ 200 ms | Red de prueba con RTT ≤ 100 ms; medir llegada de actualizaciones separada del suavizado visual |
| Carga inicial | Mundo utilizable en ≤ 10 s con caché vacía | Escena de referencia de ≤ 20 MiB únicos; red ≥ 50 Mbps y RTT ≤ 100 ms |
| Guardado | Operaciones confirmadas conservadas tras reinicio | Comparar estado; no confirmar antes de guardar |
| Robustez | Mensajes inválidos no terminan el proceso | Probar JSON inválido, `null`, tamaños excesivos y desconexiones |
| Recuperación | Restauración completa desde copia | Probar en directorio limpio con base y assets respaldados |

### Equipo de referencia

Consultado localmente el 13 de octubre de 2026, con autorización del propietario:

| Componente | Especificación detectada |
| --- | --- |
| CPU | AMD Ryzen 7 5800H, 8 núcleos y 16 procesadores lógicos |
| RAM | 15,4 GiB visibles para el sistema |
| GPU dedicada | NVIDIA GeForce RTX 3050 Ti Laptop GPU; controlador 32.0.16.1742 |
| GPU integrada | AMD Radeon(TM) Graphics; controlador 31.0.21925.2001 |
| Sistema | Windows 11 Home Single Language, 64 bits, versión 10.0.26300 |
| Chrome instalado | 155.0.8059.40 |
| Edge instalado | 155.0.4283.45 |
| Node.js | v24.15.0 |

Se propone Chrome como navegador principal y Edge como comprobación secundaria; su instalación no demuestra que el proyecto ya se haya probado en ellos. Antes de medir, registrar navegador elegido, GPU realmente utilizada, alimentación eléctrica, resolución y configuración gráfica. El equipo tiene gráficos híbridos: no asumir que el navegador usa la NVIDIA. La memoria de video no se ha verificado.

Las sesiones sintéticas permiten medir servidor; no reemplazan las mediciones de navegadores reales. Registrar versiones nuevamente si cambian antes de las pruebas.

## 8. Código, contenido y licencias

El propietario confirmó la licencia MIT para el código, con `appsevolution.com.mx` como titular del copyright. El texto se encuentra en [LICENSE](../LICENSE). Las dependencias y el contenido de terceros conservan sus propias licencias.

Los modelos, texturas, sonidos y contenidos de usuarios deben tener metadatos de autor, origen y licencia o permiso. La licencia del repositorio no se aplicará automáticamente a esos assets. La carga debe exigir que el creador tenga permiso para compartirlos y debe respetar restricciones de exportación. El contenido generado con IA también necesita registrar procedencia y condiciones aplicables.

## 9. Cierre de la etapa 0

- [x] Recorridos, roles, conceptos y alcance escritos.
- [x] Metas iniciales aceptadas y métodos de comprobación documentados.
- [x] Registro inicial de decisiones creado en `decisiones-arquitectura.md`.
- [x] Confirmar la preferencia de licencia permisiva, permitiendo usos comerciales y versiones privadas.
- [x] Formalizar MIT y el titular appsevolution.com.mx en `LICENSE`.
- [x] Identificar el equipo de referencia.
- [x] Confirmar con el propietario el alcance y las metas iniciales: grupo invitado, escritorio, un mundo, GLB, comportamientos básicos y persistencia; 10 usuarios, 100 objetos, 10 MiB por GLB y 60 FPS como objetivo.

La etapa 0 queda cerrada con las confirmaciones del propietario del 13 de octubre de 2026. El siguiente trabajo es estabilizar la Fase 1. La aceptación técnica del Nivel 0 se realizará después de implementar y probar sus cuatro fases; cerrar esta definición no implica que las funcionalidades o metas estén alcanzadas.
