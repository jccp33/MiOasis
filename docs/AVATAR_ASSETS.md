# Especificación de assets de avatar

Esta guía define cómo debe construirse un GLB para que encaje en el sistema de avatares.
El catálogo está en `assets/avatars/catalog.json`. **Estado actual:** editor y piezas procedurales integrados; estas instrucciones de GLB son el contrato de exportación para la siguiente fase. No hay GLB reales instalados, no se sirven carpetas de assets y el servidor rechaza al arrancar un GLB habilitado sin validación. Añadir un archivo al JSON todavía no lo integra automáticamente.

Diagnóstico, pruebas y pendientes: [estado del proyecto](estado-proyecto.md). No usar las rutas propuestas para publicar contenido privado.

## 1. Reglas generales (todos los GLB)

| Tema | Regla |
|---|---|
| Formato | `.glb` (glTF binario) |
| Unidades | 1 unidad = 1 metro. Un humano mide ~1.75 |
| Orientación | Pies en `y = 0`, el frente mira a **+Z**, arriba es **+Y** |
| Transformaciones | Aplicar escala/rotación antes de exportar (Blender: Ctrl+A > All Transforms). Objetos en el origen, sin rotar |
| Materiales | PBR estándar (`MeshStandardMaterial`). Sin extensiones exóticas |
| Peso | Orientativo: cuerpo < 15k tris, cada pieza < 3k tris, texturas ≤ 1024 px |

## 2. Esqueleto

Nombres de hueso estándar del proyecto (sensibles a mayúsculas):

```
Hips
├─ Spine ─ Chest ─ Neck ─ Head
│            ├─ LeftUpperArm  ─ LeftLowerArm  ─ LeftHand
│            └─ RightUpperArm ─ RightLowerArm ─ RightHand
├─ LeftUpperLeg  ─ LeftLowerLeg  ─ LeftFoot
└─ RightUpperLeg ─ RightLowerLeg ─ RightFoot
```

- Izquierda del avatar = **+X** (mirando a +Z).
- **Mixamo**: los nombres `mixamorig:*` se convierten automáticamente
  (`LeftArm` → `LeftUpperArm`, `LeftForeArm` → `LeftLowerArm`, `LeftUpLeg` → `LeftUpperLeg`,
  `LeftLeg` → `LeftLowerLeg`, `Spine1` → `Chest`). Cuidado: el FBX de Mixamo suele salir en centímetros;
  conviértelo a metros antes de exportar el GLB.
- Se pueden añadir huesos extra (dedos, ojos...). El sistema ignora los que no conoce.

## 3. Cuerpo base (opcional)

El sistema usa actualmente el cuerpo procedural. Cuando se habilite el inspector y la entrega de GLB, el contrato previsto para usar un cuerpo propio es:

1. Exporta `assets/avatars/base/humanoid.glb` con el esqueleto de arriba.
2. En `catalog.json`: `"body": { "model": { "url": "/assets/avatars/base/humanoid.glb" }, ... }`.

Convenciones dentro del GLB:

- **Material `Skin`**: se tiñe con el tono de piel elegido (cada avatar recibe su propio clon).
- **Animaciones**: clips cuyo nombre contenga `idle`, `walk`, `run` y/o `jump`. Si no hay clips,
  se usa la animación procedural. Exporta sin pistas de *scale*: el sistema controla la escala
  de `Hips` y `Head` para el deslizador de complexión.
- **Morph targets (blendshapes)**: se exponen en el editor como deslizadores 0–1. Decláralos en el catálogo:
  `"morphs": [{ "id": "noseSize", "label": "Tamaño de nariz" }]` (el `id` = nombre del shape key).
  Se aplican por nombre a todas las mallas, también a las piezas (útil para ajustar ropa al cuerpo).

## 4. Piezas intercambiables (pelo, ojos, nariz, ropa...)

Dos tipos, según cómo se enganchan al cuerpo:

### Rígidas: se pegan a un hueso (pelo, sombreros, lentes, ojos, nariz, boca, zapatos)

Modela la pieza en **coordenadas del hueso destino**, con el origen de la pieza en el origen del hueso
(la cabeza se enlaza a `Head`). Si el modelo está en otra posición, ajusta con `position`, `rotation` (radianes) y `scale` en el catálogo.

```json
{ "id": "afro", "label": "Afro", "type": "glb",
  "url": "/assets/avatars/hair/afro.glb", "attach": "Head",
  "position": [0, 0.12, 0], "scale": 1 }
```

### Con skinning: se deforman con el cuerpo (camisetas, pantalones, vestidos)

Exporta la prenda **con el mismo esqueleto** (mismos nombres de hueso y misma pose de reposo) y márcala:

```json
{ "id": "hoodie", "label": "Sudadera", "type": "glb",
  "url": "/assets/avatars/clothes/hoodie.glb", "skinned": true }
```

La prenda se re-vincula al esqueleto del cuerpo emparejando huesos por nombre.
Debe exportarse con el mesh sin transformaciones y con las mismas proporciones que el cuerpo base.

### Teñido

El material llamado **`Tint`** se colorea con el color que elija el jugador (si el slot tiene `"colorable": true`).
El resto de materiales conserva su color original.

## 5. Registrar una pieza

1. Copia el `.glb` a `assets/avatars/<categoria>/`.
2. Añade una entrada en `options` del slot correspondiente en `catalog.json` (el `id` debe ser único dentro del slot y no cambiarse después: los avatares guardados lo referencian).
3. Mantén la opción GLB con `"enabled": false` hasta integrar y probar el inspector y la entrega autorizada. Hoy el servidor permite únicamente generadores procedurales conocidos. Las opciones procedurales nuevas se validan al reiniciar y sus builders deben existir como código instalado.

`"enabled": false` oculta una opción del editor y hace que el servidor la rechace (sirve de plantilla o para retirar piezas sin romper avatares guardados).

Un slot procedural nuevo se declara en `slots` con `label`, `attach`, `colorable`, `options` y un `default` habilitado. Debe anclarse a un hueso existente y respetar la cuota de slots y el presupuesto acumulado; una pieza procedural nueva requiere un builder instalado. No implica aceptar generadores enviados por usuarios.

## 6. Dónde conseguir assets

- **Esqueleto y animaciones**: Mixamo (gratis con cuenta Adobe).
- **Personajes y piezas CC0**: Quaternius, Kenney.
- **Personalizables**: Ready Player Me, VRoid Studio (exporta VRM; hay que convertirlo a GLB).
- **A medida**: Blender.

Revisa siempre la licencia antes de redistribuir un asset: en un mundo donde otros jugadores descargan tus piezas,
el permiso de redistribución importa tanto como el archivo.
