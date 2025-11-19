"use strict";

let USERS_CURRENT_PAGE;
let USERS_PLANS_PAGE;

async function GetPlans() {
    const selectPlan = document.getElementById('input-PlanId');
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    selectPlan.innerHTML = '<option value="" disabled selected>Plan</option>';
    try {
        // Usamos el endpoint que acabas de compartir: GET api/admin/plans/all
        const response = await fetch(`${API_BASE_URL}/Plans/all`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
            const plans = await response.json();
            USERS_PLANS_PAGE = plans;
            plans.forEach(plan => {
                const option = document.createElement('option');
                option.value = plan.planId || plan.PlanId;
                option.textContent = plan.planName || plan.PlanName;
                selectPlan.appendChild(option);
            });
            let tbody = document.getElementById("tbody-data-list");
        } else {
            console.log("No se pudieron cargar los planes:", response.statusText);
        }
    } catch (error) {
        console.log("Error de red al cargar planes:", error);
    }
}

function GetPage(page) {
    const table = "Users";
    const columns = 'UserId,Username,Email,Status,Role,PlanId';
    const filter = "Username:" + document.getElementById("input-search").value.trim();
    const itemsPerPage = document.getElementById("select-items-per-page").value;
    const executable = (data) => {
        USERS_CURRENT_PAGE = data;
        document.getElementById("select-items-per-page").value = USERS_CURRENT_PAGE.itemsPerPage;
        document.getElementById("input-current-page").value = USERS_CURRENT_PAGE.currentPage;
        let tbody = document.getElementById("tbody-data-list");
        tbody.innerHTML = "";
        USERS_CURRENT_PAGE.data.forEach(d => {
            let plan = d.PlanId ? USERS_PLANS_PAGE.find(item => item.planId === d.PlanId) : null;
            let planName = plan ? (plan.planName || 'Plan Desconocido') : 'Sin Plan (N/A)';
            let row = `<tr>
                    <td>
                        <button class="btn btn-sm bg-warning" onclick="EditItem(${d.UserId});">
                            <i class="fa fa-pencil" aria-hidden="true"></i>
                        </button>
                        <button class="btn btn-sm bg-danger" onclick="DeleteItem(${d.UserId});">
                            <i class="fa fa-trash-o" aria-hidden="true"></i>
                        </button>
                    </td>
                    <td class="sticky">${d.UserId}</td>
                    <td>${d.Username}</td>
                    <td>${d.Email}</td>
                    <td>${planName}</td>
                    <td>${d.Role}</td>
                    <td>${d.Status}</td>
                </tr>`;
            tbody.innerHTML += row;
        });
    }
    LoadDynamicTable(table, columns, filter, page, itemsPerPage, executable);
}

function GetCurrentPage() {
    let page = document.getElementById("input-current-page").value.trim();
    page = isNaN(page) ? 1 : parseInt(page);
    GetPage(page);
}

function GetPreviousPage() {
    let page = document.getElementById("input-current-page").value.trim();
    page = isNaN(page) ? 1 : parseInt(page);
    if (page > 1) page--;
    GetPage(page);
}

function GetNextPage() {
    let page = document.getElementById("input-current-page").value.trim();
    page = isNaN(page) ? 1 : parseInt(page);
    if (page < USERS_CURRENT_PAGE.totalPages) {
        page++;
    }
    GetPage(page);
}

function GetLastPage() {
    let page = USERS_CURRENT_PAGE.totalPages;
    GetPage(page);
}

function EditItem(id) {
    let user = USERS_CURRENT_PAGE.data.find(u => u.UserId === id);
    document.getElementById("input-UserId").value = user.UserId;
    document.getElementById("input-Username").value = user.Username;
    document.getElementById("input-Email").value = user.Email;
    document.getElementById("input-PlanId").value = user.PlanId;
    document.getElementById("input-Role").value = user.Role;
    document.getElementById("input-Status").value = user.Status;
}

function ClearAllInputs() {
    document.getElementById("input-UserId").value = "";
    document.getElementById("input-Username").value = "";
    document.getElementById("input-Email").value = "";
    document.getElementById("input-Password").value = "";
    document.getElementById("input-PlanId").value = "";
    document.getElementById("input-Role").value = "";
    document.getElementById("input-Status").value = "";
}

function GetUserDataFromForm() {
    const idInput = document.getElementById("input-UserId").value;
    const password = document.getElementById("input-Password").value;
    const isUpdate = idInput && parseInt(idInput) > 0;
    const data = {
        UserId: isUpdate ? parseInt(idInput) : 0,
        Username: document.getElementById("input-Username").value.trim(),
        Email: document.getElementById("input-Email").value.trim(),
        Status: document.getElementById("input-Status").value,
        Role: document.getElementById("input-Role").value,
        PlanId: document.getElementById("input-PlanId").value ? parseInt(document.getElementById("input-PlanId").value) : null
    };
    if (!isUpdate || password) {
        data.Password = password;
    }
    return data;
}

function ValidateUserData(data, isUpdate) {
    if (!data.Username) {
        TOAST('bg-warning', "El Nombre de Usuario es obligatorio.", TOAST_DURATION);
        return false;
    }
    if (!data.Email) {
        TOAST('bg-warning', "El Email es obligatorio.", TOAST_DURATION);
        return false;
    }
    if (!data.Status) {
        TOAST('bg-warning', "El Estado es obligatorio.", TOAST_DURATION);
        return false;
    }
    if (!data.Role) {
        TOAST('bg-warning', "El Rol es obligatorio.", TOAST_DURATION);
        return false;
    }
    if (!isUpdate || (isUpdate && data.Password)) {
        if (!data.Password) {
            TOAST('bg-warning', "La Contraseña es obligatoria para la creación.", TOAST_DURATION);
            return false;
        }
    }
    if (!IS_PASSWORD(data.Username, 8, 50)) {
        TOAST('bg-warning', "Username adminte de 8 a 50 caracteres.", TOAST_DURATION);
        TOAST('bg-warning', "Username solo admite letras y números", TOAST_DURATION);
        return false;
    }
    if (!IS_EMAIL(data.Email)) {
        TOAST('bg-warning', "El Email debe tener un formato de correo válido.", TOAST_DURATION);
        return false;
    }
    if (data.Password) {
        if (!IS_PASSWORD(data.Password, 8, 50)) {
            TOAST('bg-warning', "Contraseña admite de 8 a 50 caracteres.", TOAST_DURATION);
            TOAST('bg-warning', "Contraseña solo admite letras y números", TOAST_DURATION);
            return false;
        }
    }
    return true;
}

async function SaveCurrentItem() {
    const data = GetUserDataFromForm();
    const token = localStorage.getItem("adminToken");
    if (!token) {
        console.log("TOKEN NO ENCONTRADO. Sesión expirada.");
        TOAST('bg-danger', "Sesión expirada. Inicie sesión nuevamente.", TOAST_DURATION);
        return;
    }
    const isUpdate = data.UserId > 0;
    if (!ValidateUserData(data, isUpdate)) {
        return;
    }
    const method = isUpdate ? 'PUT' : 'POST';
    const url = isUpdate ? `${API_BASE_URL}/User/${data.UserId}` : `${API_BASE_URL}/User`;
    try {
        console.log(`[API CALL] Sending ${method} request to ${url} with data:`, data);
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        // Manejo de Respuesta
        if (response.ok) {
            let message = `Usuario ${data.Username} actualizado con éxito.`;
            if (response.status === 201) { // 201 Created (CREATE)
                const createdItem = await response.json();
                data.UserId = createdItem.userId || createdItem.UserId;
                message = `Usuario ${data.Username} creado con éxito.`;
                document.getElementById("input-UserId").value = data.UserId;
            }
            console.log(`[API RESPONSE] Success: Status ${response.status}`, data);
            TOAST('bg-success', `${message}`, TOAST_DURATION);
            ClearAllInputs();
            GetCurrentPage();
        } else {
            // Manejar errores 400 (Validation), 409 (Conflict/Unicidad), 500
            const error = await response.json().catch(() => ({ message: response.statusText }));
            const toastClass = (response.status === 400 || response.status === 409) ? 'bg-warning' : 'bg-danger';
            console.log(`[API RESPONSE] Error: Status ${response.status}`, error);
            TOAST(toastClass, `Error: ${error.message || 'Error desconocido del servidor.'}`, TOAST_DURATION);
        }
    } catch (error) {
        console.log("[API RESPONSE] Network Error:", error);
        TOAST('bg-danger', "Error de red. No se pudo conectar con la API.", TOAST_DURATION);
    }
}

function DeleteItem(id) {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        console.log("TOKEN NO ENCONTRADO. Sesión expirada.");
        TOAST('bg-danger', "Sesión expirada. Inicie sesión nuevamente.", TOAST_DURATION);
        return;
    }
    const cancelDelete = () => {
        console.log(`[ACTION CANCELED] Eliminación de Usuario ID ${id} cancelada por el usuario.`);
        TOAST('bg-warning', "Eliminación de Usuario cancelada.", TOAST_DURATION);
    };
    const executeDelete = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/User/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Manejo de Respuesta
            if (response.status === 204) { // 204 No Content
                console.log(`[API RESPONSE] Success: Status 204. Usuario ID ${id} eliminado.`);
                TOAST('bg-success', `Usuario ID ${id} eliminado con éxito.`, TOAST_DURATION);
                GetCurrentPage();
            } else {
                const error = await response.json().catch(() => ({ message: response.statusText }));
                console.log(`[API RESPONSE] Error: Status ${response.status}`, error);
                TOAST('bg-danger', `Error al eliminar: ${error.message || 'Error desconocido del servidor.'}`, TOAST_DURATION);
            }
        } catch (error) {
            console.log("[API RESPONSE] Network Error:", error);
            TOAST('bg-danger', "Error de red. No se pudo conectar con la API.", TOAST_DURATION);
        }
    };
    FRAMEWORK_SNACKBAR(
        'bg-danger',
        "bg-danger-dark",
        `El Usuario ${id} será eliminado permanentemente.`,
        { label: 'DESHACER', callback: cancelDelete },
        executeDelete
    );
}

document.addEventListener("DOMContentLoaded", () => {
    // go to index if token not exist
    let page = window.location.href + "";
    page = page.split("/");
    let current = page[page.length - 1];
    if (!current.toLowerCase().includes("index")) {
        let token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = 'Index';
            return;
        }
        token = DecodeJWT(token);
        let keys = Object.keys(token);
        let keys_counter = 0;
        keys.forEach(k => {
            if (k.includes('role')) {
                if (token[k] !== "admin") {
                    window.location.href = 'Index';
                    return;
                }
                keys_counter++;
            }
        });
        if (keys_counter == 0) {
            window.location.href = 'Index';
            return;
        }
    }

    GetPlans();

    GetPage(1);

    let input_search = document.getElementById("input-search");
    if (input_search) {
        input_search.addEventListener('keypress', ev => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                GetPage(1);
            }
        });
    }

    let icon_search = document.getElementById("input-search-icon");
    if (icon_search) {
        icon_search.addEventListener('click', ev => {
            GetPage(1);
        });
    }

    let select_items = document.getElementById('select-items-per-page');
    if (select_items) {
        select_items.addEventListener('change', ev => {
            GetPage(1);
        })
    }

    let input_current_page = document.getElementById("input-current-page");
    if (input_current_page) {
        input_current_page.addEventListener('keypress', ev => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                let page = input_current_page.value.trim();
                page = IS_INTEGER(page) ? parseInt(page) : 1;
                GetPage(page);
            }
        });
        input_current_page.addEventListener('change', ev => {
            ev.preventDefault();
            let page = input_current_page.value.trim();
            page = IS_INTEGER(page) ? parseInt(page) : 1;
            GetPage(page);
        })
    }
});
