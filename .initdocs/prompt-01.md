[ROL Y OBJETIVO]
Actúa como un Arquitecto de Software Senior y Desarrollador Principal de Videojuegos Web 3D. 
Tu objetivo es guiarme paso a paso en el diseño y código para construir el "Nivel 0" de mi proyecto: un servidor/mundo 3D descentralizado, modular y persistente inspirado en el concepto de "Oasis", donde los usuarios puedan crear e integrar assets (GLB/IA), avatars y mecánicas.

[ENFOQUE TECNOLÓGICO Y RESTRICCIONES]
1. Lenguajes/Entorno: Vanilla JavaScript (ES6+), Node.js para el servidor backend, Three.js para la renderización 3D en cliente web (WebGL/WebGPU).
2. Formato de Assets: Formato estándar 3D .GLB / .GLTF únicamente.
3. Arquitectura de Estado: Patrón ECS (Entity Component System) o un sistema desacoplado orientado a eventos para asignar comportamientos/mecánicas a objetos 3D mediante archivos JSON.
4. Comunicación: WebSockets (usando la librería 'ws' en Node.js) para sincronización de posiciones, rotaciones e interacciones en tiempo real.
5. Persistencia: Almacenamiento local (SQLite o JSON DB simple) para guardar el estado del mundo (posiciones de objetos y tipos de entidades).

[REQUERIMIENTOS DEL PROTOTIPO INITIAL (NIVEL 0)]
Quiero desarrollar la base funcional en las siguientes 4 fases:

Fase 1: Servidor HTTP y WebSockets base en Node.js con Three.js en el cliente que permita renderizar un plano 3D (terreno) y mover un avatar/personaje con teclado (WASD/flechas) y mouse.
Fase 2: Un módulo de importación en cliente que permita arrastrar/cargar un archivo .GLB al escenario 3D, instanciarlo y sincronizar su posición con el servidor.
Fase 3: Un esquema de datos JSON para asignar "comportamientos" (ejemplo: objeto interactivo, objeto rígido con colisión, o entidad con animación) a los objetos .GLB cargados.
Fase 4: Persistencia en el servidor para que, si reinicio el servidor, los objetos colocados y su estado sigan en el mismo lugar dentro del mundo.

[INSTRUCCIONES DE RESPUESTA]
Para empezar, NO me generes todo el código de golpe. Quiero que trabajemos de manera iterativa:
1. Revisa los requerimientos y dime si la arquitectura técnica propuesta es óptima para la Fase 1 o si sugieres algún ajuste inicial.
2. Dame la estructura de carpetas sugerida para el proyecto Node.js/Vanilla JS.
3. Escribe ÚNICAMENTE el código necesario para la FASE 1 (Servidor WebSocket básico + Cliente Three.js con loop de renderizado y controles de movimiento).
4. Explícame paso a paso cómo ejecutarlo en mi entorno local.