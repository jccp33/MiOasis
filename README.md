# 🌐 Proyecto Oasis

Un motor de mundos virtuales y avatares personalizables inspirado en Oasis (Ready Player One).

## 🚀 Características

- **Sistema de Avatares**: Personalización completa de personajes
- **Generación de Mundos**: Creación procedural de entornos
- **Arquitectura Cliente-Servidor**: Para soportar múltiples jugadores
- **Motor Físico**: Para interacciones realistas
- **API para Desarrolladores**: Para crear extensiones y mods

## 📁 Estructura del Proyecto

```
MiOasis/
├── assets/           # Recursos del juego (modelos, texturas, sonidos)
├── build/            # Archivos de compilación para diferentes plataformas
├── docs/             # Documentación del proyecto
├── src/              # Código fuente
│   ├── avatares/     # Motor de avatares
│   ├── cliente/      # Código del cliente
│   ├── mundos/       # Motor de mundos
│   └── servidor/     # Lógica del servidor
└── tools/            # Herramientas de desarrollo
```

## 🛠️ Configuración del Entorno

### Requisitos
- Godot Engine 4.2+
- Python 3.8+ (para herramientas)
- Git

### Instalación
1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/MiOasis.git
   cd MiOasis
   ```

2. Abre el proyecto en Godot Engine

## 🏗️ Compilación

### Cliente
1. Abre el proyecto en Godot
2. Ve a "Proyecto" > "Exportar"
3. Selecciona la plataforma objetivo y haz clic en "Exportar Proyecto"

### Servidor
```bash
cd src/servidor
python -m pip install -r requirements.txt
python main.py
```

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor, lee [CONTRIBUTING.md](docs/contributing.md) para más detalles.

## 📞 Contacto

Carlos Cárdenas - jccp33@hotmail.com
[Enlace al proyecto](https://github.com/jccp33/MiOasis)
