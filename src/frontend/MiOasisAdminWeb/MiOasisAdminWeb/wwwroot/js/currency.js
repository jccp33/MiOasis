"use strict";

let CURRENCYS_CURRENT_PAGE;

function GetPaginationCurrency(page) {
    //console.log(page);
    const table = "CurrencyTypes";
    const columns = '*';
    const filter = "Name:" + document.getElementById("input-search").value.trim();
    const itemsPerPage = document.getElementById("select-items-per-page").value;
    const executable = (data) => {
        CURRENCYS_CURRENT_PAGE = data;
        document.getElementById("select-items-per-page").value = CURRENCYS_CURRENT_PAGE.itemsPerPage;
        document.getElementById("input-current-page").value = CURRENCYS_CURRENT_PAGE.currentPage;
        let tbody = document.getElementById("tbody-data-list");
        tbody.innerHTML = "";
        CURRENCYS_CURRENT_PAGE.data.forEach(d => {
            //console.log(d);
            let row = `<tr>
                    <td>
                        <button class="btn btn-sm bg-warning" onclick="EditCurrency(${d.CurrencyId});">
                            <i class="fa fa-pencil" aria-hidden="true"></i>
                        </button>
                        <button class="btn btn-sm bg-danger" onclick="DeleteCurrency(${d.CurrencyId});">
                            <i class="fa fa-trash-o" aria-hidden="true"></i>
                        </button>
                    </td>
                    <td class="sticky">${d.CurrencyId}</td>
                    <td>${d.Name}</td>
                    <td>${d.Abbreviation}</td>
                    <td>${d.IsPremium ? "SI" : "NO"}</td>
                </tr>`;
            tbody.innerHTML += row;
        });
    }
    LoadDynamicTable(table, columns, filter, page, itemsPerPage, executable);
}

function GetCurrentPage() {
    let page = document.getElementById("input-current-page").value.trim();
    page = isNaN(page) ? 1 : parseInt(page);
    GetPaginationCurrency(page);
}

function GetPreviousPage() {
    let page = document.getElementById("input-current-page").value.trim();
    page = isNaN(page) ? 1 : parseInt(page);
    if (page > 1) page--;
    GetPaginationCurrency(page);
}

function GetNextPage() {
    let page = document.getElementById("input-current-page").value.trim();
    page = isNaN(page) ? 1 : parseInt(page);
    if (page < CURRENCYS_CURRENT_PAGE.totalPages) {
        page++;
    }
    GetPaginationCurrency(page);
}

function GetLastPage() {
    let page = CURRENCYS_CURRENT_PAGE.totalPages;
    GetPaginationCurrency(page);
}

function ClearAllFormInputs() {
    document.getElementById("input-CurrencyId").value = "";
    document.getElementById("input-Name").value = "";
    document.getElementById("input-Abbreviation").value = "";
    document.getElementById("input-IsPremium").checked = false;
}

function EditCurrency(id) {
    let curr = CURRENCYS_CURRENT_PAGE.data.find(item => item.CurrencyId === id);
    document.getElementById("input-CurrencyId").value = curr.CurrencyId;
    document.getElementById("input-Name").value = curr.Name;
    document.getElementById("input-Abbreviation").value = curr.Abbreviation;
    document.getElementById("input-IsPremium").checked = curr.IsPremium;
}

async function SaveCurrentCurrency() {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        console.log("Sesión expirada. Por favor, inicie sesión nuevamente.");
        TOAST('bg-danger', "Sesión expirada. Por favor, inicie sesión nuevamente.", TOAST_DURATION);
        return;
    }
    const currencyId = parseInt(document.getElementById('input-CurrencyId').value) || 0;
    const currencyData = {
        CurrencyId: currencyId,
        Name: document.getElementById('input-Name').value,
        Abbreviation: document.getElementById('input-Abbreviation').value,
        IsPremium: document.getElementById('input-IsPremium').checked,
    };
    if (!currencyData.Name || !currencyData.Abbreviation) {
        console.log("El Nombre y la Abreviación son obligatorios.");
        TOAST('bg-danger', "El Nombre y la Abreviación son obligatorios.", TOAST_DURATION);
        return;
    }
    const isUpdate = currencyId > 0;
    const url = isUpdate ? `${API_BASE_URL}/Currency/${currencyId}` : `${API_BASE_URL}/Currency`;
    const method = isUpdate ? 'PUT' : 'POST';
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currencyData)
        });
        // Manejar Respuestas
        if (response.ok) {
            ClearAllFormInputs();
            GetCurrentPage();
        } else if (response.status === 400) {
            const errorData = await response.json();
            console.log(`Error de validación: ${JSON.stringify(errorData)}`);
            TOAST('bg-danger', `Error de validación: ${JSON.stringify(errorData)}`, TOAST_DURATION);
        } else {
            console.log(`Error al guardar la moneda. Status: ${response.status}`);
            TOAST('bg-danger', `Error al guardar la moneda. Status: ${response.status}`, TOAST_DURATION);
        }
    } catch (error) {
        console.log("Error de red: " + error);
        TOAST('bg-danger', "Error de red: " + error, TOAST_DURATION);
    }
}

function DeleteCurrency(id) {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        console.log("Sesión expirada. Por favor, inicie sesión nuevamente.");
        TOAST('bg-danger', "Sesión expirada. Por favor, inicie sesión nuevamente.", TOAST_DURATION);
        return;
    }
    // Definir el Callback de Deshacer
    const cancelDelete = () => {
        console.log(`Eliminación de la Moneda ${id} cancelada.`);
        TOAST('bg-warning', `Eliminación de la Moneda ${id} cancelada.`, TOAST_DURATION);
    };
    // Definir el Callback de Timeout
    const executeDelete = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/Currency/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 204) {
                console.log(`Moneda ${id} eliminado con éxito.`);
                TOAST('bg-success', `Moneda ${id} eliminado con éxito.`, TOAST_DURATION);
                GetCurrentPage();
            } else if (response.status === 404) {
                console.log(`Error: Moneda ${id} no encontrado.`);
                TOAST('bg-warning', `Error: Moneda ${planId} no encontrado.`, TOAST_DURATION);
            } else {
                console.log(`Error ${response.status}: Fallo la eliminación.`);
                TOAST('bg-danger', `Error ${response.status}: Fallo la eliminación.`, TOAST_DURATION);
            }
        } catch (error) {
            console.log("Error en DeleteCurrency (API call): " + error);
            TOAST('bg-danger', "Error en DeleteCurrency (API call): " + error, TOAST_DURATION);
        }
    };
    // Lanzar el Snackbar de cuenta regresiva
    FRAMEWORK_SNACKBAR(
        'bg-danger',
        "bg-danger-dark",
        `Eliminando moneda ${id} ...`,
        { label: 'DESHACER', callback: cancelDelete },
        executeDelete,
        4
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

    GetPaginationCurrency(1);

    let input_search = document.getElementById("input-search");
    if (input_search) {
        input_search.addEventListener('keypress', ev => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                GetPaginationCurrency(1);
            }
        });
    }

    let icon_search = document.getElementById("input-search-icon");
    if (icon_search) {
        icon_search.addEventListener('click', ev => {
            GetPaginationCurrency(1);
        });
    }

    let select_items = document.getElementById('select-items-per-page');
    if (select_items) {
        select_items.addEventListener('change', ev => {
            GetPaginationCurrency(1);
        })
    }

    let input_current_page = document.getElementById("input-current-page");
    if (input_current_page) {
        input_current_page.addEventListener('keypress', ev => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                let page = input_current_page.value.trim();
                page = IS_INTEGER(page) ? parseInt(page) : 1;
                GetPaginationCurrency(page);
            }
        });
        input_current_page.addEventListener('change', ev => {
            let page = input_current_page.value.trim();
            page = IS_INTEGER(page) ? parseInt(page) : 1;
            GetPaginationCurrency(page);
        })
    }
});
