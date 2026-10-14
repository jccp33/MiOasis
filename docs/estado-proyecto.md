# Estado actual y primera integración de avatares

Revisión: 13 de octubre de 2026. Se leyeron las reglas de `.initdocs/reglas.md`, la documentación de producto/protocolo y el código de cliente, servidor, contratos y pruebas, incluidos los archivos nuevos de avatares.

## Repositorio y entorno

La carpeta de trabajo no es un repositorio Git: `git status` y `git remote -v` devuelven «not a git repository». No hay remoto configurado que se pueda inspeccionar desde este directorio. No se ha inicializado Git ni creado un remoto como parte de esta tarea.

El paquete usa módulos ES, Node.js, `three` 0.170.0 y `ws`. No hay bundler ni framework. Las pruebas se ejecutan con `node --test`; la comprobación de navegador usa Chrome real mediante CDP y un perfil temporal.

El código recibido está en `client/avatar/`, el catálogo en `assets/avatars/catalog.json`, el esquema en `shared/avatar-schema.js` y la guía en `docs/AVATAR_ASSETS.md`. No existe actualmente `avatar/AVATAR_ASSETS.md` en la raíz; la guía de `docs` es la referencia. Los subdirectorios de GLB solo contienen `.gitkeep`: no hay archivos GLB reales que certificar.

## Diagnóstico y cambios

| Área | Estado encontrado | Estado después de integrar |
| --- | --- | --- |
| Etapas 1 y 2 | Multijugador, controles, entidades y protocolo funcionales | Se conservan; regresiones aprobadas |
| Avatar | Cliente principal todavía usaba cápsulas | Humanoide procedural de 17 huesos; cápsula como fallback |
| Editor | Código presente pero sin abrirse desde la aplicación | Botón «Editar avatar (V)», vista previa, guardar/cancelar, pausa de controles |
| Apariencia compartida | No había mensajes de selección | `avatar.set` validado y `avatar.changed`; apariencia en welcome/join |
| Catálogo de piezas | JSON sin servicio de validación conectado | Catálogo público protegido, opciones/IDs validables y presupuesto calculado en servidor |
| Rendimiento procedural | Predeterminado: 39 draw calls, 12 materiales | Predeterminado: 2 draw calls/materiales; colores por vértice y skins agrupadas |
| Cambios rápidos y cierre | Riesgo de resultados asíncronos tardíos | Aplicaciones serializadas, descarte de resultados obsoletos, cierre seguro |
| GLB y skinning externo | Cargador y funciones presentes | Permanecen sin habilitar; faltan inspección, entrega y pruebas reales |
| Privacidad y cuotas | Biblioteca interna de políticas | Se conserva; no se abren endpoints de subida o archivos privados |

El generador tenía muchas mallas rígidas por hueso. `batch.js` agrupa sus geometrías en mallas skinned con pesos rígidos al hueso correspondiente, compartiendo materiales por tipo de superficie y usando colores por vértice. El rig sigue animándose por huesos; no se aumentó el presupuesto. En este primer adaptador se normaliza el acabado superficial procedural; no pretende conservar todas las propiedades de materiales GLB arbitrarios.

El código procedural y sus builders se consideran código confiable instalado por el operador. El servidor genera sus medidas sin WebGL y libera los recursos de inspección. No evalúa código enviado por usuarios.

## Funciones utilizables

1. Ejecutar `npm run dev` y abrir localhost en dos ventanas.
2. Pulsar **Editar avatar (V)** en cualquiera, incluidos visitantes.
3. Modificar cuerpo, color de piel, cabello, cejas, ojos, nariz, boca, torso, pantalón, calzado, gorro o lentes.
4. **Cancelar** descarta el borrador. **Guardar** solicita aprobación al servidor; el otro usuario recibe la configuración aceptada.
5. La configuración aceptada se guarda como preferencia en `localStorage` (`mioasis.avatar.v1`). Al reconectar se propone nuevamente y el servidor vuelve a validarla.

Cambiar apariencia propia no concede permiso de construcción de entidades. Los básicos son públicos y no consumen cuota personal. El editor no modifica sus originales ni registra assets nuevos.

La preferencia es local al navegador y origen, no una cuenta portable. Varias pestañas comparten ese almacenamiento; no hay perfil privado individual ni sincronización entre dispositivos. El servidor conserva la apariencia de cada sesión mientras está conectada; las entidades del mundo siguen desapareciendo al reiniciar.

## Contratos y límites

`shared/avatar-schema.js` es la configuración activa de apariencia (`v`, `body`, `parts` por slot), basada en IDs del catálogo. `shared/avatars.js` conserva los presupuestos y el contrato de recursos/composición para futuras cargas personales. No se deben enviar ambos esquemas indistintamente: el primero expresa una selección del editor y el segundo recursos con propiedad y acceso. Su unión futura necesita un adaptador de IDs y medidas verificadas.

El servidor descarta campos no admitidos, corrige colores y proporciones y sustituye IDs desconocidos o deshabilitados por el valor básico del slot. Un esquema de apariencia con versión incompatible se rechaza al cambiar; una preferencia inválida en hello usa el predeterminado. No se admiten URLs del cliente.

Solo se sirve públicamente el JSON validado del catálogo de avatar mediante una ruta exacta. No hay montaje estático de toda la carpeta `assets`. Los GLB habilitados en el catálogo o un cuerpo externo hacen fallar explícitamente la validación de arranque hasta implementar el inspector. La plantilla GLB deshabilitada no se carga.

El rig procedural mide aproximadamente 1,75 m en proporciones base, usa metros, Y arriba, frente +Z y pies próximos a Y=0. Las variaciones estéticas no cambian todavía velocidad, salto o colisiones.

## Evidencia

- `npm test`: 9 pruebas aprobadas, incluidas privacidad/cuotas, protocolo y entidades, esquema de apariencia, presupuestos, cambios rápidos, liberación e independencia de esqueletos.
- `npm run test:browser`: dos clientes Chrome; editor/vista previa, guardado, cancelación, bloqueo de entrada al editar, réplica y recuperación de apariencia, cubos, captura de mouse, salto, carrera, límites y reconexión.
- Capturas del editor y del mundo inspeccionadas visualmente; no hubo excepciones JavaScript en la prueba.
- Catálogo actual: 10 slots y 32 opciones habilitadas. Avatar predeterminado: 11 152 triángulos, 17 huesos y 2 materiales/draw calls de geometría. Seleccionando la opción con más triángulos por slot: 14 440 triángulos y 3 materiales/draw calls.

Estos recuentos no incluyen las pasadas adicionales de sombras ni certifican 60 FPS con diez usuarios. No se ha medido todavía capacidad, VR o compatibilidad con GLB reales.

## Próximo trabajo

1. Validación de archivos GLB, hashes y límites de geometría, texturas, skinning, clips y morph targets.
2. Instalación de un GLB real de prueba y comprobación de rig, pesos, matrices de bind, alias y animaciones.
3. Adaptar el catálogo de apariencia a referencias del catálogo de recursos, manteniendo propiedad y núcleo protegido.
4. Entrega pública/autorizada de archivos, cuotas globales y reservas de cargas concurrentes.
5. Cuentas individuales, presets persistentes y permisos de visualización de recursos privados.

La etapa 3 de importación de GLB y la persistencia de etapa 5 siguen pendientes. La integración procedural es una extensión transversal autorizada del prototipo.
