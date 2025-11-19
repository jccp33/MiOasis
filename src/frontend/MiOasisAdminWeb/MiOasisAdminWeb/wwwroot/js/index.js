"use strict";

async function MakeLogin() {
    const username = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/AdminGeneric/loginadmin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        // 1. Verificar la respuesta
        if (!response.ok) {
            // Manejar errores de credenciales, etc.
            const errorData = await response.json();
            TOAST('bg-danger', `Error de autenticación: ${errorData.message || response.statusText}`, TOAST_DURATION);
            return;
        }

        const data = await response.json();

        // El backend debe devolver el token JWT en el objeto 'data'
        const token = data.token;

        if (token) {
            // 2. Almacenar el token JWT en localStorage
            localStorage.setItem('adminToken', token);

            // 3. Redirigir al panel de control (home)
            window.location.href = 'Home';
        } else {
            TOAST('bg-danger', 'Error: Token no recibido.', TOAST_DURATION);
        }

    } catch (error) {
        console.error('Error de red o servidor:', error);
        TOAST('bg-danger', 'No se pudo conectar con el servidor.', TOAST_DURATION);
    }
}

const bodyContainer = document.getElementById("body-container");

function GridSetup() {
    const cells = parseInt(bodyContainer.clientWidth / 24);
    const rows = parseInt(bodyContainer.clientHeight / 24);
    //console.log(cells, rows);
    for (let i = 0; i < rows; i++) {
        const row = document.createElement("div");
        row.classList.add("body-row");
        for (let j = 0; j < cells; j++) {
            const cell = document.createElement("div");
            cell.id = `cell-${i}-${j}`;
            cell.classList.add("body-cell");
            row.appendChild(cell);
        }
        bodyContainer.appendChild(row);
    }
}

const btn_login = document.getElementById("login-container-form-button-login");

document.addEventListener("DOMContentLoaded", () => {
    GridSetup();
    window.addEventListener("resize", () => {
        GridSetup();
    });

    window.addEventListener("mousemove", () => {
        // get cell by mouse position and change color    
        const rect = bodyContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const center = document.getElementById(`cell-${parseInt(y / 24)}-${parseInt(x / 24)}`);
        const radius = 4;
        const cells_in_radius = [];
        cells_in_radius.push(center);
        for (let i = -radius; i <= radius; i++) {
            for (let j = -radius; j <= radius; j++) {
                const cell = document.getElementById(`cell-${parseInt(y / 24) + i}-${parseInt(x / 24) + j}`);
                if (cell) {
                    if (Math.sqrt(i * i + j * j) <= radius) {
                        cells_in_radius.push(cell);
                        // calculate rgb random neon rainbow 
                        const rgba = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 0.5)`;
                        cell.style.borderColor = rgba;
                        cell.style.borderWidth = "2px";
                    }
                }
            }
        }
        // reset color in anothers cells not in cells_in_radius
        const cells = document.querySelectorAll(".body-cell");
        cells.forEach((cell) => {
            if (!cells_in_radius.includes(cell)) {
                cell.style.borderColor = "rgba(255, 255, 255, 0.05)";
                cell.style.borderWidth = "1px";
            }
        });
    });

    if (btn_login) {
        btn_login.addEventListener('click', MakeLogin);
    }

    if (localStorage.getItem('adminToken')) {
        window.location.href = 'Home';
    }

    SHOW_LOADING();
});
