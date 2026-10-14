# Assets de MiOasis

`catalog/core.json` describe los recursos básicos integrados. El servidor impone su carácter público e inmutable para usuarios; cambiar el archivo es una operación de mantenimiento del proyecto, no una función del editor.

`avatars/catalog.json` define las piezas procedurales del editor integrado. Su rig humanoide y builders están en `client/avatar/`. El cubo y la cápsula de fallback siguen descritos en `catalog/core.json`. No hay archivos GLB reales; los subdirectorios reservados contienen `.gitkeep`.

No colocar archivos privados en rutas públicas. Las cargas y su almacenamiento se implementarán en las etapas correspondientes, con validación, cuotas y acceso autorizado.

Contrato y coordinación con el sistema de Claude: [integración de avatares](../docs/avatares-integracion.md).
