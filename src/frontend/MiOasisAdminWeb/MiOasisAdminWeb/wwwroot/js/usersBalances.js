"use strict";

let USERS_BALANCES_PAGE;

function ClearAllInputs() {
    document.getElementById("input-BalanceId").value = "";
    document.getElementById("input-UserId").value = "";
    document.getElementById("input-CurrencyId").value = "";
    document.getElementById("input-Amount").value = "";
}

async function GetCurrencyData(inputId, filter) {
    //console.log(inputId, filter);
    const token = localStorage.getItem("adminToken");
    if (!token) {
        alert("Sesión expirada. Por favor, inicie sesión nuevamente.");
        window.location.href = '/';
        return;
    }
    try {
        // 1. Construir la URL con parámetros
        const page = 1;
        const itemsPerPage = 100;
        const params = new URLSearchParams({
            table: "CurrencyTypes",
            columns: "*",
            filter: "Name:" + filter,
            page: page.toString(),
            itemsPerPage: itemsPerPage.toString()
        });
        const url = `${API_BASE_URL}/AdminGeneric/paginate?${params.toString()}`;
        // 2. Realizar la solicitud Fetch
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            if (errorData) {
                console.log(errorData);
                TOAST('bg-danger', "Se produjo un error.", TOAST_DURATION);
            }
            if (response.status === 401 || response.status === 403) {
                console.log("Acceso denegado o sesión inválida.");
                TOAST('bg-danger', "Acceso denegado o sesión inválida.", TOAST_DURATION);
                Logout();
            }
            return;
        }
        const data = await response.json();
        // 3. Renderizar datos
        if (data.data.length > 0) {
            let currency = data.data[0];
            document.getElementById(inputId).value = currency.CurrencyId + " - " + currency.Name;
        } else {
            TOAST('bg-warning', "No se encontro esa moneda.", TOAST_DURATION);
        }
    } catch (error) {
        console.error("Error en loadDynamicTable:", error);
        TOAST('bg-danger', "Error en loadDynamicTable:" + error, TOAST_DURATION);
    }
}

async function GetUserData(inputId, filter) {
    //console.log(inputId, filter);
    const token = localStorage.getItem("adminToken");
    if (!token) {
        alert("Sesión expirada. Por favor, inicie sesión nuevamente.");
        window.location.href = '/';
        return;
    }
    try {
        // 1. Construir la URL con parámetros
        const page = 1;
        const itemsPerPage = 100;
        const params = new URLSearchParams({
            table: "Users",
            columns: "*",
            filter: "Username:" + filter,
            page: page.toString(),
            itemsPerPage: itemsPerPage.toString()
        });
        const url = `${API_BASE_URL}/AdminGeneric/paginate?${params.toString()}`;
        // 2. Realizar la solicitud Fetch
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            if (errorData) {
                console.log(errorData);
                TOAST('bg-danger', "Se produjo un error.", TOAST_DURATION);
            }
            if (response.status === 401 || response.status === 403) {
                console.log("Acceso denegado o sesión inválida.");
                TOAST('bg-danger', "Acceso denegado o sesión inválida.", TOAST_DURATION);
                Logout();
            }
            return;
        }
        const data = await response.json();
        // 3. Renderizar datos
        if (data.data.length > 0) {
            let user = data.data[0];
            document.getElementById(inputId).value = user.UserId + " - " + user.Username;
        } else {
            TOAST('bg-warning', "No se encontro es@ usuari@.", TOAST_DURATION);
        }
    } catch (error) {
        console.error("Error en loadDynamicTable:", error);
        TOAST('bg-danger', "Error en loadDynamicTable:" + error, TOAST_DURATION);
    }
}

async function GetPage(page) {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        alert("Sesión expirada. Por favor, inicie sesión nuevamente.");
        window.location.href = '/';
        return;
    }
    try {
        // 1. Construir la URL con parámetros
        const params = new URLSearchParams({
            filter: "Username:" + document.getElementById("input-search").value.trim(),
            page: page.toString(),
            itemsPerPage: document.getElementById("select-items-per-page").value.toString()
        });
        const url = `${API_BASE_URL}/UserBalances/paginate?${params.toString()}`;
        // 2. Realizar la solicitud Fetch
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            if (errorData) {
                console.log(errorData);
                TOAST('bg-danger', "Se produjo un error.", TOAST_DURATION);
            }
            if (response.status === 401 || response.status === 403) {
                console.log("Acceso denegado o sesión inválida.");
                TOAST('bg-danger', "Acceso denegado o sesión inválida.", TOAST_DURATION);
                Logout(); 
            }
            return;
        }
        const data = await response.json();
        // 3. Renderizar la Tabla y Controles
        //console.log(data);
        USERS_BALANCES_PAGE = data;
        document.getElementById("select-items-per-page").value = USERS_BALANCES_PAGE.itemsPerPage;
        document.getElementById("input-current-page").value = USERS_BALANCES_PAGE.currentPage;
        let tbody = document.getElementById("tbody-data-list");
        tbody.innerHTML = "";
        USERS_BALANCES_PAGE.data.forEach(d => {
            let row = `<tr>
                    <td>
                        <button class="btn btn-sm bg-warning" onclick="EditItem(${d.BalanceId});">
                            <i class="fa fa-pencil" aria-hidden="true"></i>
                        </button>
                        <button class="btn btn-sm bg-danger" onclick="DeleteItem(${d.BalanceId});">
                            <i class="fa fa-trash-o" aria-hidden="true"></i>
                        </button>
                    </td>
                    <td class="sticky">${d.BalanceId}</td>
                    <td>${d.Username}</td>
                    <td>${d.CurrencyName}</td>
                    <td>${d.Amount}</td>
                </tr>`;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error("Error en loadDynamicTable:", error);
        TOAST('bg-danger', "Error en loadDynamicTable:" + error, TOAST_DURATION);
    }
}

function GetCurrentPage() {
    let page = document.getElementById("input-current-page").value.trim();
    page = !IS_INTEGER(page) ? 1 : parseInt(page);
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
    if (page < USERS_BALANCES_PAGE.totalPages) {
        page++;
    }
    GetPage(page);
}

function GetLastPage() {
    let page = USERS_BALANCES_PAGE.totalPages;
    GetPage(page);
}

async function SaveCurrentItem() {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        console.log("TOKEN NO ENCONTRADO. Sesión expirada.");
        TOAST('bg-danger', "Sesión expirada. Inicie sesión nuevamente.", TOAST_DURATION);
        return;
    }
    // data
    let BalanceId = document.getElementById("input-BalanceId").value.trim();
    let UserId = document.getElementById("input-UserId").value.trim();
    UserId = UserId.split("-")[0].trim();
    let CurrencyId = document.getElementById("input-CurrencyId").value.trim();
    CurrencyId = CurrencyId.split("-")[0].trim();
    let Amount = document.getElementById("input-Amount").value.trim();
    if (!IS_INTEGER(BalanceId)) {
        BalanceId = "0";
    }
    if (!IS_INTEGER(UserId)) {
        TOAST('bg-warning', "Id de Usuario no valido", TOAST_DURATION);
        return;
    }
    if (!IS_INTEGER(CurrencyId)) {
        TOAST('bg-warning', "Id de Moneda no valido", TOAST_DURATION);
        return;
    }
    if (!IS_DECIMAL(Amount)) {
        TOAST('bg-warning', "Monto no valido", TOAST_DURATION);
        return;
    }
    const data = {
        BalanceId,
        UserId,
        CurrencyId,
        Amount
    }
    //console.log(data);
    //return;
    const method = (parseInt(data.BalanceId) > 0) ? 'PUT' : 'POST';
    const url = (parseInt(data.BalanceId) > 0) ? `${API_BASE_URL}/UserBalances/${data.BalanceId}` : `${API_BASE_URL}/UserBalances`;
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
            let message = `Balance ${data.BalanceId} actualizado con éxito.`;
            if (response.status === 201) { // 201 Created (CREATE)
                const createdItem = await response.json();
                data.BalanceId = createdItem.BalanceId || createdItem.BalanceId;
                message = `Balance ${data.BalanceId} creado con éxito.`;
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

function EditItem(id) {
    let bl = USERS_BALANCES_PAGE.data.find(u => u.BalanceId === id);
    //console.log(bl);
    document.getElementById("input-BalanceId").value = bl.BalanceId;
    document.getElementById("input-UserId").value = bl.UserId + " - " + bl.Username;
    document.getElementById("input-CurrencyId").value = bl.CurrencyId + " - " + bl.CurrencyName;
    document.getElementById("input-Amount").value = bl.Amount;
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
        TOAST('bg-warning', "Eliminación de Balance cancelada.", TOAST_DURATION);
    };
    const executeDelete = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/UserBalances/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Manejo de Respuesta
            if (response.status === 204) { // 204 No Content
                console.log(`[API RESPONSE] Success: Status 204. Balances ${id} eliminado.`);
                TOAST('bg-success', `Balance ${id} eliminado con éxito.`, TOAST_DURATION);
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
        `El Balance ${id} será eliminado permanentemente.`,
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

    GetPage(1);

    let inputCurrency = document.getElementById("input-CurrencyId");
    inputCurrency.addEventListener('keypress', ev => {
        if (ev.key === "Enter") {
            ev.preventDefault();
            GetCurrencyData(ev.target.id, ev.target.value.trim());
        }
    });

    let inputUser = document.getElementById("input-UserId");
    inputUser.addEventListener('keypress', ev => {
        if (ev.key === "Enter") {
            ev.preventDefault();
            GetUserData(ev.target.id, ev.target.value.trim());
        }
    });

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
