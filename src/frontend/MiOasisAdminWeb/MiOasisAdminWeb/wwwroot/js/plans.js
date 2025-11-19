"use strict";

let PLANS_CURRENT_PAGE;

function GetPaginationPlans(page) {
    //console.log(page);
    const table = "SubscriptionPlans";
    const columns = '*';
    const filter = "PlanName:" + document.getElementById("input-search-plan").value.trim();
    const itemsPerPage = document.getElementById("select-items-per-page").value;
    const executable = (data) => {
        PLANS_CURRENT_PAGE = data;
        //console.log(PLANS_CURRENT_PAGE);
        document.getElementById("select-items-per-page").value = PLANS_CURRENT_PAGE.itemsPerPage;
        document.getElementById("input-current-page").value = PLANS_CURRENT_PAGE.currentPage;
        let tbody = document.getElementById("tbody-data-list");
        tbody.innerHTML = "";
        PLANS_CURRENT_PAGE.data.forEach(d => {
            //console.log(d);
            let row = `<tr>
                    <td>
                        <button class="btn btn-sm bg-warning" onclick="EditPlan(${d.PlanId});">
                            <i class="fa fa-pencil" aria-hidden="true"></i>
                        </button>
                        <button class="btn btn-sm bg-danger" onclick="DeletePlan(${d.PlanId});">
                            <i class="fa fa-trash-o" aria-hidden="true"></i>
                        </button>
                    </td>
                    <td class="sticky">${d.PlanId}</td>
                    <td>${d.PlanName}</td>
                    <td>${d.PriceMonthly}</td>
                    <td>${d.MaxAssetsAllowed}</td>
                    <td>${d.MaxPolyCount}</td>
                    <td>${d.MaxTextureSizeMB}</td>
                </tr>`;
            tbody.innerHTML += row;
        });
    }
    LoadDynamicTable(table, columns, filter, page, itemsPerPage, executable);
}

function GetCurrentPage() {
    let page = document.getElementById("input-current-page").value.trim();
    page = isNaN(page) ? 1 : parseInt(page);
    GetPaginationPlans(page);
}

function GetPreviousPage() {
    let page = document.getElementById("input-current-page").value.trim();
    page = isNaN(page) ? 1 : parseInt(page);
    if (page > 1) page--;
    GetPaginationPlans(page);
}

function GetNextPage() {
    let page = document.getElementById("input-current-page").value.trim();
    page = isNaN(page) ? 1 : parseInt(page);
    if (page < PLANS_CURRENT_PAGE.totalPages) {
        page++;
    }
    GetPaginationPlans(page);
}

function GetLastPage() {
    let page = PLANS_CURRENT_PAGE.totalPages;
    GetPaginationPlans(page);
}

function ClearAllFormInputs() {
    document.getElementById("input-PlanId").value = "";
    document.getElementById("input-PlanName").value = "";
    document.getElementById("input-PriceMonthly").value = "";
    document.getElementById("input-MaxAssetsAllowed").value = "";
    document.getElementById("input-MaxPolyCount").value = "";
    document.getElementById("input-MaxTextureSizeMB").value = "";
    document.getElementById('input-PlanName').focus();
}

function EditPlan(planId) {
    let plan = PLANS_CURRENT_PAGE.data.find(item => item.PlanId === planId);
    //console.log(plan);
    document.getElementById("input-PlanId").value = plan.PlanId;
    document.getElementById("input-PlanName").value = plan.PlanName;
    document.getElementById("input-PriceMonthly").value = plan.PriceMonthly;
    document.getElementById("input-MaxAssetsAllowed").value = plan.MaxAssetsAllowed;
    document.getElementById("input-MaxPolyCount").value = plan.MaxPolyCount;
    document.getElementById("input-MaxTextureSizeMB").value = plan.MaxTextureSizeMB;
}

async function SaveCurrentPlan() {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        console.log("Sesión expirada. Por favor, inicie sesión nuevamente.");
        TOAST('bg-danger', "Sesión expirada. Por favor, inicie sesión nuevamente.", TOAST_DURATION);
        return;
    }
    const planId = parseInt(document.getElementById('input-PlanId').value) || 0;
    const planData = {
        PlanId: planId,
        PlanName: document.getElementById('input-PlanName').value,
        PriceMonthly: parseFloat(document.getElementById('input-PriceMonthly').value) || 0.0,
        MaxAssetsAllowed: parseInt(document.getElementById('input-MaxAssetsAllowed').value) || 0,
        MaxPolyCount: parseInt(document.getElementById('input-MaxPolyCount').value) || 0,
        MaxTextureSizeMB: parseFloat(document.getElementById('input-MaxTextureSizeMB').value) || 0.0,
    };
    if (!planData.PlanName) {
        console.log("El Nombre del Plan es obligatorio.");
        TOAST('bg-danger', "El Nombre del Plan es obligatorio.", TOAST_DURATION);
        return;
    }
    const isUpdate = planId > 0;
    const url = isUpdate ? `${API_BASE_URL}/plans/${planId}` : `${API_BASE_URL}/plans`;
    const method = isUpdate ? 'PUT' : 'POST';
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(planData)
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
            console.log(`Error al guardar el plan. Status: ${response.status}`);
            TOAST('bg-danger', `Error al guardar el plan. Status: ${response.status}`, TOAST_DURATION);
        }
    } catch (error) {
        console.log("Error de red: " + error);
        TOAST('bg-danger', "Error de red: " + error, TOAST_DURATION);
    }
}

function DeletePlan(planId) {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        console.log("Sesión expirada. Por favor, inicie sesión nuevamente.");
        TOAST('bg-danger', "Sesión expirada. Por favor, inicie sesión nuevamente.", TOAST_DURATION);
        return;
    }
    // Definir el Callback de Deshacer
    const cancelDelete = () => {
        console.log(`Eliminación del Moneda ${planId} cancelada.`);
        TOAST('bg-warning', `Eliminación del Moneda ${planId} cancelada.`, TOAST_DURATION);
    };
    // Definir el Callback de Timeout
    const executeDelete = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/plans/${planId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 204) {
                console.log(`Moneda ${planId} eliminado con éxito.`);
                TOAST('bg-success', `Moneda ${planId} eliminado con éxito.`, TOAST_DURATION);
                GetCurrentPage();
            } else if (response.status === 404) {
                console.log(`Error: Moneda ${planId} no encontrado.`);
                TOAST('bg-warning', `Error: Moneda ${ planId } no encontrado.`, TOAST_DURATION);
            } else {
                console.log(`Error ${response.status}: Fallo la eliminación.`);
                TOAST('bg-danger', `Error ${response.status}: Fallo la eliminación.`, TOAST_DURATION);
            }
        } catch (error) {
            console.log("Error en DeletePlan (API call): " + error);
            TOAST('bg-danger', "Error en DeletePlan (API call): " + error, TOAST_DURATION);
        }
    };
    // Lanzar el Snackbar de cuenta regresiva
    FRAMEWORK_SNACKBAR(
        'bg-danger',
        "bg-danger-dark",
        `Eliminando plan ${planId} ...`,
        { label: 'DESHACER', callback: cancelDelete },
        executeDelete,
        4
    );
}

// go to index if token not exist
document.addEventListener("DOMContentLoaded", () => {
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

    GetPaginationPlans(1);

    let input_search = document.getElementById("input-search-plan");
    if (input_search) {
        input_search.addEventListener('keypress', ev => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                GetPaginationPlans(1);
            }
        });
    }

    let icon_search = document.getElementById("input-search-plan-icon");
    if (icon_search) {
        icon_search.addEventListener('click', ev => {
            GetPaginationPlans(1);
        });
    }

    let select_items = document.getElementById('select-items-per-page');
    if (select_items) {
        select_items.addEventListener('change', ev => {
            GetPaginationPlans(1);
        })
    }

    let input_current_page = document.getElementById("input-current-page");
    if (input_current_page) {
        input_current_page.addEventListener('keypress', ev => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                let page = input_current_page.value.trim();
                page = IS_INTEGER(page) ? parseInt(page) : 1;
                GetPaginationPlans(page);
            }
        });
        input_current_page.addEventListener('change', ev => {
            let page = input_current_page.value.trim();
            page = IS_INTEGER(page) ? parseInt(page) : 1;
            GetPaginationPlans(page);
        })
    }
});
