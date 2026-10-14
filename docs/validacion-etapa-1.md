# Validación de la etapa 1

Fecha: 13 de octubre de 2026. Estado: implementación y comprobaciones completadas en el equipo de referencia. Estas pruebas validan estabilidad funcional de la Fase 1; no certifican capacidad ni rendimiento del Nivel 0 completo.

## Cambios

- Validación de objetos JSON antes de acceder al tipo de mensaje; rechazo de arreglos, `null`, tipos y coordenadas no finitas.
- Mensajes de texto de hasta 4096 bytes; máximo 60 por conexión en una ventana de un segundo.
- Coordenadas acotadas al terreno y altura de 0 a 50; rotación normalizada.
- UUID completo como sesión temporal, comprobación de colisiones, nueva sesión tras reconectar.
- Heartbeat cada 15 segundos; cierre de sockets sin respuesta y retiro de sus jugadores.
- Manejo de errores por socket y callbacks de envío; terminación de conexiones con más de 256 KiB pendientes. El cliente evita acumular más de 64 KiB.
- Conexión del cliente lista después de `welcome`; reinicio de salto, velocidad vertical, rotación, entrada y caché de envío. La caché se actualiza solamente si se envió el estado.
- Limpieza de teclas y salto pendiente al perder foco, visibilidad o captura; errores de captura gestionados.
- Liberación de geometrías y materiales de avatares retirados.
- Rutas HTTP limitadas a sus montajes y comprobación de ruta real para impedir escapes mediante enlaces. Solo GET/HEAD.
- Cierre del servidor y temporizadores al recibir señales; diagnóstico de puerto ocupado.
- Eliminación de `client/index.js` vacío; entrada documentada en `client/main.js`.

## Evidencia automatizada

`npm test` pasó. La prueba crea un servidor aislado con puerto dinámico y comprueba:

1. HTML y módulos publicados responden; recursos fuera de los montajes y rutas manipuladas no son accesibles.
2. Dos clientes reciben `welcome`, `join`, movimiento y `leave` coherentes.
3. JSON inválido, `null`, arreglos, primitivas y estados mal formados no terminan el proceso.
4. Las coordenadas se limitan y la rotación queda dentro del rango normalizado.
5. La reconexión recibe una sesión distinta y no conserva la sesión retirada.
6. Un cliente que no responde a `ping` es desconectado y se comunica su salida.
7. Exceso de tamaño, frecuencia y mensajes binarios cierran la conexión correspondiente; el servidor sigue respondiendo.

`npm run test:browser` pasó en Chrome con un perfil temporal independiente y dos páginas reales:

1. Ambos clientes muestran conexión y dos jugadores, sin excepciones JavaScript.
2. El lienzo WebGL renderiza terreno, avatares y sombras. Se inspeccionó visualmente una captura.
3. Se ejecutan teclado diagonal, salto y recepción de estados remotos con altura positiva.
4. La carrera alcanza el borde sin enviar posiciones fuera de los límites.
5. Se adquiere, libera y vuelve a adquirir la captura del puntero; se envían eventos de mouse al cliente.
6. La pérdida de foco limpia teclas y salto pendiente.
7. Se cierra una conexión, el otro cliente reduce su contador y la reconexión vuelve a dos jugadores con un identificador nuevo.

El primer intento de Chrome bajo restricciones del entorno quedó sin respuesta en CDP. La ejecución autorizada fuera de esa restricción completó la comprobación. No se requiere modificar la configuración del producto por esa restricción de pruebas.

## Repetición manual de experiencia

1. Ejecutar `npm run dev` y abrir dos ventanas en localhost.
2. En cada ventana comprobar terreno, avatar, sombras, estado conectado y contador 2.
3. Probar WASD y flechas, diagonal, Shift y Espacio; observar movimiento desde la otra ventana.
4. Capturar mouse, girar horizontal y verticalmente, pulsar Esc y capturar otra vez. Comprobar que la cámara no atraviesa el suelo.
5. Mantener una tecla y cambiar de ventana: al volver no debe continuar la entrada anterior ni producir un salto pendiente.
6. Correr al borde: no salir del terreno. Volver caminando y comprobar el control.
7. Detener y reiniciar el servidor: ambos clientes muestran reconexión y vuelven a tener exactamente dos jugadores.
8. Cerrar una ventana y comprobar que la otra muestra uno. Abrir de nuevo y comprobar dos.

## Límites de la validación

No se han certificado Edge, móvil o VR, ni 10 usuarios, 100 objetos o 60 FPS. La inspección visual de una captura y automatización de mouse no reemplazan una evaluación humana de comodidad de cámara. El control de acumulación de envíos está implementado; no se ha simulado un transporte que permanezca saturado durante mucho tiempo. La persistencia y la autoridad del servidor sobre movimiento pertenecen a etapas posteriores.
