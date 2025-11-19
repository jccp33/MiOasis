# 🌐 Proyecto Oasis

Un motor de mundos virtuales y avatares personalizables inspirado en Oasis (Ready Player One), compuesto por:

- Cliente en **Godot**
- **Backend API** en ASP.NET Core (`MiOasisApi`)
- **Panel de administración web** en ASP.NET Core Razor Pages (`MiOasisAdminWeb`)
- Base de datos **PostgreSQL**

## 🚀 Características

- **Sistema de Avatares**: Personalización completa de personajes
- **Generación de Mundos**: Creación procedural de entornos
- **Arquitectura Cliente-Servidor**: Para soportar múltiples jugadores
- **Motor Físico**: Para interacciones realistas
- **API para Desarrolladores**: Para crear extensiones y mods

## 📁 Estructura del Proyecto

```bash
MiOasis/
├── docs/                     # Documentación del proyecto
├── src/                      # Código fuente principal
│   ├── backend/              # Backend ASP.NET Core (API REST)
│   │   └── MiOasisApi/
│   │       └── MiOasisApi/   # Proyecto .NET (Program.cs, AppDbContext, etc.)
│   ├── frontend/             # Frontend web de administración
│   │   └── MiOasisAdminWeb/
│   │       └── MiOasisAdminWeb/  # Proyecto Razor Pages (Program.cs, wwwroot, etc.)
│   ├── godot/                # Cliente del mundo virtual en Godot
│   │   └── mi-oasis/         # Proyecto Godot (escenas, scripts, shaders, etc.)
│   ├── blender/              # Recursos y utilidades de Blender
│   └── _db_/                 # Scripts y archivos relacionados con la base de datos
└── tools/                    # Herramientas adicionales de desarrollo
```

## 🛠️ Configuración del Entorno

### Requisitos
- **Godot Engine 4.2+** (cliente)
- **.NET SDK 8.0+** (o la versión usada por el proyecto MiOasisApi/MiOasisAdminWeb)
- **PostgreSQL 14+** (o compatible)
- Git

### Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/jccp33/MiOasis.git
   cd MiOasis
   ```

2. Configura la base de datos PostgreSQL:
   - Crea una base de datos llamada `MiOasisDB` (o la que configures en `appsettings.json`).
   - Ajusta la cadena de conexión en:
     - `src/backend/MiOasisApi/MiOasisApi/appsettings.json` → `ConnectionStrings:PostgresConnection`.

3. (Opcional pero recomendado) Mueve credenciales sensibles a variables de entorno antes de desplegar en producción.

## 🏗️ Compilación

### Cliente (Godot)
1. Abre Godot Engine.
2. Carga el proyecto desde `src/godot/mi-oasis`.
3. Ejecuta el juego desde el editor o configura una exportación para tu plataforma objetivo.

### Backend API (ASP.NET Core)
En otra terminal:

```bash
cd src/backend/MiOasisApi/MiOasisApi
dotnet restore
dotnet run
```

Por defecto, la API se expone en `https://localhost:7021/api` (según la configuración de lanzamiento).

### Panel de Administración Web (Razor Pages)
En otra terminal:

```bash
cd src/frontend/MiOasisAdminWeb/MiOasisAdminWeb
dotnet restore
dotnet run
```

El panel suele quedar disponible en `https://localhost:xxxx/` (revisa la URL que indica la consola de `dotnet run`).

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor, lee [CONTRIBUTING.md](docs/contributing.md) para más detalles.

## 📞 Contacto

Carlos Cárdenas - jccp33@hotmail.com
[Enlace al proyecto](https://github.com/jccp33/MiOasis)
