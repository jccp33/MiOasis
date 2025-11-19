# Guía de Contribución

¡Gracias por tu interés en contribuir al proyecto Oasis (MiOasis)! Aquí encontrarás información sobre cómo contribuir de manera efectiva.

## 🧱 Pila Tecnológica

El proyecto está compuesto por varios componentes:

- Cliente en **Godot Engine 4.2+** (`src/godot/mi-oasis`)
- **Backend API** en **ASP.NET Core** (`src/backend/MiOasisApi/MiOasisApi`)
- **Panel de administración web** con **ASP.NET Core Razor Pages** (`src/frontend/MiOasisAdminWeb/MiOasisAdminWeb`)
- Base de datos **PostgreSQL**

## 🚀 Cómo Contribuir

1. **Reportar un Problema**
   - Usa el sistema de issues de GitHub para reportar errores o sugerir mejoras.
   - Asegúrate de que el problema no haya sido reportado ya.

2. **Enviar una Solución**
   - Haz un fork del repositorio.
   - Crea una rama para tu característica o corrección: `git checkout -b mi-caracteristica`
   - Haz commit de tus cambios: `git commit -m 'Añade una nueva característica'`
   - Haz push a la rama: `git push origin mi-caracteristica`
   - Abre un Pull Request

## 📝 Estándares de Código

- Sigue las convenciones de código existentes en el proyecto.
- Incluye comentarios claros cuando sea necesario.
- Asegúrate de que tu código pase todas las pruebas.

## 🧪 Pruebas

- Asegúrate de que la solución compila sin errores:
  - `dotnet build` en los proyectos de backend/frontend.
- Añade pruebas automatizadas cuando sea posible (xUnit, MSTest o similar para .NET).
- Para cambios en Godot, verifica que el proyecto arranca sin errores desde el editor.

## 📜 Licencia

Al contribuir, aceptas que tus contribuciones estarán bajo la licencia MIT del proyecto.
