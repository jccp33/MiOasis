# Registro de decisiones de MiOasis

Fecha inicial: 13 de octubre de 2026. «Base existente» describe el código actual; «propuesta» no significa decisión confirmada por el propietario. Cada cambio debe conservar el motivo y enlazar la decisión que lo sustituye.

| ID | Estado | Decisión y motivo | Alternativas | Cuándo reconsiderar |
| --- | --- | --- | --- | --- |
| D001 | Base existente | JavaScript ES modules en cliente y Node.js en servidor; facilita compartir protocolo y mantener un prototipo pequeño | TypeScript, motores completos | Cuando los errores de contratos o herramientas justifiquen migración |
| D002 | Base existente | Three.js con WebGL e import maps locales; ya permite validar exploración | WebGPU, motor de juego, bundler | Tras medir limitaciones o necesitar empaquetado y distribución más complejos |
| D003 | Base existente | HTTP para recursos y WebSocket con `ws` para estado y eventos | WebRTC, transporte especializado | Cuando mediciones de red o necesidades de voz lo requieran |
| D004 | Implementada en etapa 2 | Un mundo por proceso con servidor responsable de validar entidades; movimiento físico autoritativo pendiente de etapa 8 | Simulación P2P, varios mundos por proceso | Al medir saturación o iniciar federación |
| D005 | Implementada en etapa 2 | Entidades con esquema y revisión, componentes JSON y sistemas desacoplados; componentes vacíos hasta etapa 4 | Jerarquías de clases, ECS completo | Si el número de sistemas y entidades demuestra necesidad de otro modelo |
| D006 | Propuesta | GLB autocontenido en primera importación; evita resolver dependencias externas | GLTF empaquetado o referencias externas | Cuando exista demanda y validación del paquete completo |
| D007 | Propuesta | SQLite para metadatos y entidades, archivos para assets; facilita transacciones y operación local | JSON con escrituras atómicas, base remota | Antes de implementar persistencia y al requerir múltiples escritores o nodos |
| D008 | Propuesta | Lista de comportamientos admitidos y validación determinista | Scripts libres, IA como único árbitro | Solo al diseñar aislamiento, permisos y cuotas de ejecución |
| D009 | Propuesta | Federación posterior basada en manifiestos y contratos explícitos | Traducir motores automáticamente mediante IA | Después de demostrar viajes entre dos mundos compatibles |
| D010 | Aceptada | MIT para el código, titular appsevolution.com.mx; texto incorporado en `LICENSE`. Contenido y dependencias mantienen sus licencias | Otras licencias permisivas | Si cambia la política de distribución, registrar una nueva decisión |
| D011 | Aceptada | Escritorio y grupo invitado como primera audiencia; un mundo con GLB, comportamientos básicos y persistencia | Público general, móvil y VR desde el inicio | Después de validar recorridos, permisos y capacidad |
| D012 | Implementada en etapa 2 | Protocolo 1 con `hello`, snapshot completo y eventos ordenados; operaciones con `opId` y revisión esperada | Compatibilidad implícita, reanudación por historial de deltas | Al evolucionar el esquema o necesitar recuperación incremental |
| D013 | Implementada en etapa 2 | Almacenamiento y registro de operaciones en memoria, aislados del transporte; confirmaciones explícitas `storage: memory` | Adelantar SQLite | Sustituir por persistencia transaccional en etapa 5 sin confirmar antes de escribir |
| D014 | Implementada en etapa 2 | Un creador lógico local habilitado mediante credencial del operador; visitantes sin permiso de escritura | Creación anónima abierta o cuentas completas desde el inicio | Incorporar identidades individuales y revocación en etapa 7 |

## Preparación de avatares modulares

- **D015 — Base de catálogo implementada:** básicos públicos protegidos en JSON; catálogo personal con propiedad, visibilidad y IDs asignados por servidor. Alternativa descartada: permitir que el editor sobrescriba recursos compartidos. Revisar al instalar el paquete real de Claude y al añadir almacenamiento duradero.
- **D016 — Política inicial de cuotas implementada:** jugador y operador tienen distinta capacidad de catálogo, pero el mismo presupuesto gráfico por avatar. Los tiers los asignará un servicio confiable, sin derivarlos de declaraciones del navegador. Valores provisionales pendientes de medición y límites globales de anfitrión.
- **D017 — Contrato de rig actualizado tras recibir el código:** humanoide procedural de 17 huesos integrado; nombres y anclajes documentados en `AVATAR_ASSETS.md`. Las convenciones de GLB externos aún necesitan pruebas con archivos reales. Se conserva la cápsula como fallback.
- **D018 — Privacidad conservadora:** el catálogo compartido no expone registros privados; una composición compartida solo usa assets públicos hasta implementar permisos explícitos de visualización y entrega autenticada. Alternativa descartada: servir toda la carpeta de assets estáticamente.
- **D019 — Integración procedural implementada:** agrupar geometría rígida en skins con colores por vértice para mantener el presupuesto original, en lugar de elevar límites para aceptar las 39 draw calls iniciales. Preservar independencia de huesos y liberar cada batch reemplazado. Revisar al integrar materiales y deformaciones de GLB.
- **D020 — Apariencia como estado de sesión:** configuración de catálogo validada y replicada, con preferencia local revalidada al conectar. No confundirla con persistencia de cuentas ni con entidades duraderas. La incorporación futura de assets personales necesita un adaptador entre configuración del editor y catálogo de recursos.

Detalles y pendientes: [integración de avatares](avatares-integracion.md).

## Plantilla para ampliar una decisión

- ID y título:
- Fecha y estado: propuesta / aceptada / sustituida.
- Problema y restricciones:
- Decisión:
- Alternativas consideradas:
- Consecuencias y compromisos:
- Evidencia de validación:
- Condiciones de revisión:
- Decisión sustituta, si existe:
