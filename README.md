# 🌐 MiOasis

**MiOasis** es un proyecto experimental inspirado en el concepto del *OASIS* de *Ready Player One*, diseñado como un entorno virtual donde los usuarios pueden crear, personalizar y explorar mundos digitales a través de la web — sin necesidad de realidad virtual.

El objetivo inicial es construir un **generador de avatares 3D** totalmente funcional, usando **React**, **Three.js** y un backend en **.NET 8**, con base de datos relacional y APIs REST.

---

## 🧩 Estructura del Proyecto

MiOasis
    Oasis.Api/       # Backend ASP.NET Core Web API (.NET 8)
    Oasis.Web/       # Frontend React + Three.js (Vite)
    _notes_.txt      # Diario local de desarrollo (ignorado en Git)

---

## ⚙️ Tecnologías Principales

| Tipo                      | Tecnologías                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| **Frontend**              | React, Vite, Three.js, @react-three/fiber, @react-three/drei, Leva |
| **Backend**               | ASP.NET Core 8 Web API                                             |
| **Base de datos**         | MySQL / SQL Server (por definir)                                   |
| **Lenguajes**             | C#, JavaScript, HTML, CSS                                          |
| **Entorno de desarrollo** | Windows 11, Visual Studio Code, Git, Node.js, .NET SDK             |

---

## 🚀 Configuración del entorno

### 🧱 1. Clonar el repositorio

git clone [https://github.com/TU_USUARIO/MiOasis.git](https://github.com/TU_USUARIO/MiOasis.git)
cd MiOasis

### ⚙️ 2. Configurar el Backend (.NET)

cd Oasis.Api
dotnet restore
dotnet run

El backend correrá en [http://localhost:5280](http://localhost:5280) (puerto configurable en launchSettings.json).

### 🎨 3. Configurar el Frontend (React + Vite)

cd ../Oasis.Web
npm install
npm run dev

El frontend correrá en [http://localhost:5173](http://localhost:5173) y se conecta automáticamente con el backend mediante proxy.

---

## 🧠 Funcionalidades actuales

✅ Generador de avatares 3D (en desarrollo)
✅ Comunicación entre frontend y backend
✅ Proxy configurado en vite.config.js
✅ Diario local de desarrollo (*notes*.txt)
✅ Monorepo estructurado y controlado con Git

---

## 🛠️ Próximos pasos

* [ ] Implementar el generador de avatares con Three.js y React
* [ ] Agregar almacenamiento de configuración de avatares en el backend
* [ ] Crear autenticación básica de usuarios
* [ ] Diseñar entorno 3D interactivo
* [ ] Agregar persistencia en base de datos

---

## 📁 Configuración del Proxy

El archivo `Oasis.Web/vite.config.js` incluye un proxy que redirige las peticiones `/api` al backend:

server: {
proxy: {
'/api': {
target: '[http://localhost:5280](http://localhost:5280)',
changeOrigin: true,
secure: false
}
}
}

Esto permite evitar errores CORS durante el desarrollo.

---

## 🤝 Contribución

1. Haz un fork del repositorio
2. Crea una nueva rama (feature/nueva-funcionalidad)
3. Realiza tus cambios y haz commit
4. Envía un pull request

---

## 🧑‍💻 Autor

**M.C. Carlos Cárdenas**
Ingeniero de Software | Full Stack Developer
📍 México
🔗 GitHub: [https://github.com/jccp33](https://github.com/jccp33)
🔗 LinkedIn: [https://www.linkedin.com/in/jccp33/](https://www.linkedin.com/in/jccp33/)
🔗 Portafolio: [https://www.appsevolution.com.mx/portfolio/](https://www.appsevolution.com.mx/portfolio/)

---

## 🧾 Licencia

Este proyecto se distribuye bajo la licencia **MIT**.
Consulta el archivo LICENSE (si lo agregas) para más información.
