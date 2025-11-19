"use strict";

const AJAX_OBJ = () => {
    var xmlhttp = false;
    try {
        xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
    } catch (e) {
        try {
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        } catch (E) {
            xmlhttp = false;
        }
    }
    if (!xmlhttp && typeof XMLHttpRequest != 'undefined') {
        xmlhttp = new XMLHttpRequest();
    }
    return xmlhttp;
}

const RANDOM_INT = (min, max) => { return Math.floor(Math.random() * (max - min + 1)) + min; };

const SHOW_LOADING = () => {
    let LOADING_DIV = document.getElementById("loading-div");
    if (LOADING_DIV.style.top != '-100vh') LOADING_DIV.style.top = '-100vh';
    else LOADING_DIV.style.top = '0vh';
};

const SHUFFLE = (array) => {
    let current = array.length;
    while (0 !== current) {
        const random = Math.floor(Math.random() * current);
        current--;
        [array[current], array[random]] = [
            array[random], array[current]];
    }
    return array;
}

const INT_TO_STR_SIZE = (intValue, size) => {
    const intString = String(intValue);
    if (intString.length >= size) {
        return intString.slice(-size);
    } else {
        const paddingLength = size - intString.length;
        const paddingZeros = "0".repeat(paddingLength);
        return paddingZeros + intString;
    }
}

const RAMDOM_CHARS = (len) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");
    SHUFFLE(chars);
    return chars.slice(0, len).join("")
}

const IS_INTEGER = (str) => {
    if (str === "") {
        return false;
    }
    return /^-?\d+$/.test(str);
}

const IS_EMAIL = (str) => {
    if (typeof str !== 'string') {
        return false;
    }
    if (str.length === 0) {
        return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(str);
}

const IS_PHONE = (str) => {
    if (typeof str !== 'string') {
        return false;
    }
    if (str.length === 0) {
        return false;
    }
    return /^\d{10}$/.test(str);
}

const IS_PERSON_NAME = (str) => {
    if (typeof str !== 'string' || str.trim() === '') {
        return false;
    }
    return /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(str);
}

const IS_COMPANY_NAME = (str) => {
    if (typeof str !== 'string' || str.trim() === '') {
        return false;
    }
    return /^[A-Za-z0-9\s.,&-]+$/.test(str);
}

const IS_STREET_NEIGHBORHOOD = (str) => {
    if (typeof str !== 'string' || str.trim() === '') {
        return false;
    }
    return /^[A-Za-z0-9\s\-\.\u00C0-\u00FFÑñ]+$/.test(str);
}

const IS_EXTERIOR_NUMBER = (number) => {
    if (typeof number !== 'string') {
        return false;
    }
    const regex = /^[a-zA-Z0-9]+(?:[-/][a-zA-Z0-9]+)*[a-zA-Z0-9]*$/;
    return regex.test(number.trim());
}

const IS_INTERNAL_NUMBER = (number) => {
    if (typeof number !== 'string') {
        return false;
    }
    const regex = /^[a-zA-Z0-9-]+$/;
    return regex.test(number.trim());
}

const IS_PASSWORD = (passw_str, min, max) => {
    if (passw_str.length < min || passw_str.length > max) return false;
    let re = /^[A-Za-z0-9]*$/;
    return re.test(passw_str);
}

const IS_TEXT = (text_str) => {
    if (text_str === "") return false;
    let re = /^[a-zA-Z\u00C0-\u00FF0-9\s]*$/;
    return re.test(text_str);
}

const IS_MX_RFC = (rfc) => {
    if (typeof rfc !== 'string' || rfc.length < 12 || rfc.length > 13) {
        return false;
    }
    const rfcWithoutSpaces = rfc.trim().toUpperCase();
    const physicalPersonPattern = /^([A-ZÑ&]{4})([0-9]{2})([0-9]{2})([0-9]{2})([A-Z0-9]{3})$/;
    const legalEntityPattern = /^([A-ZÑ&]{3})([0-9]{2})([0-9]{2})([0-9]{2})([A-Z0-9]{3})$/;
    if (rfcWithoutSpaces.length === 13) {
        return physicalPersonPattern.test(rfcWithoutSpaces);
    } else if (rfcWithoutSpaces.length === 12) {
        return legalEntityPattern.test(rfcWithoutSpaces);
    }
    return false;
}

const IS_DECIMAL = (decimal_str) => {
    if (decimal_str === "") return false;
    let re = /^\d+(\.\d{1,2})?$/;
    return re.test(decimal_str);
}

const IS_VALID_DATE = (fechaString) => {
    if (typeof fechaString !== 'string') {
        return false;
    }
    // Expresión regular para el formato dd/mm/yyyy
    const formatoFecha = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/;
    if (!formatoFecha.test(fechaString)) {
        return false;
    }
    const partes = fechaString.split('/');
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    const año = parseInt(partes[2], 10);
    // Validar rangos válidos para mes y día
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) {
        return false;
    }
    // Validar los días según el mes y los años bisiestos
    if ((mes === 4 || mes === 6 || mes === 9 || mes === 11) && dia > 30) {
        return false;
    }
    if (mes === 2) {
        const esBisiesto = (año % 4 === 0 && año % 100 !== 0) || año % 400 === 0;
        if ((esBisiesto && dia > 29) || (!esBisiesto && dia > 28)) {
            return false;
        }
    }
    return true;
}

function formatMexicanCurrentDate() {
    const date = new Date();
    const format = new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    return format.format(date);
}

function formatMySQLDateToMexican(mysqlDateStr, includeTime = false) {
    //console.log(mysqlDateStr);
    if (!mysqlDateStr) return '';
    let date = mysqlDateStr.split(' ')[0].trim();
    const day = date.split('-')[2].trim();
    const month = date.split('-')[1].trim();
    const year = date.split('-')[0].trim();
    let formatted = `${day}/${month}/${year}`;
    if (includeTime) {
        let time = mysqlDateStr.split(' ')[1].trim();
        const hours = time.split(':')[0].trim();
        const minutes = time.split(':')[1].trim();
        const seconds = time.split(':')[2].trim();
        formatted += ` ${hours}:${minutes}:${seconds}`;
    }
    return formatted;
}

function formatMySQLTimeToAMPM(mysqlTimeStr) {
    if (!mysqlTimeStr) {
        return ''; // Handle cases where the time string might be empty or null
    }
    // Split the time string into hours, minutes, and seconds
    const [hoursStr, minutesStr, secondsStr] = mysqlTimeStr.split(':');
    // Convert hours to a number
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    let ampm = 'AM';
    // Handle midnight (00:xx) and noon (12:xx) special cases
    if (hours === 0) {
        hours = 12; // 00:xx becomes 12:xx AM
    } else if (hours === 12) {
        ampm = 'PM'; // 12:xx is 12:xx PM
    } else if (hours > 12) {
        hours -= 12; // Convert to 12-hour format
        ampm = 'PM';
    }
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

function convertDateToMysql(fechaString) {
    if (typeof fechaString !== 'string') {
        return null;
    }
    fechaString = fechaString.trim();
    const formatoFecha = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/;
    if (!formatoFecha.test(fechaString)) {
        return null; // dd/mm/yyyy
    }
    const partes = fechaString.split('/');
    const dia = partes[0];
    const mes = partes[1];
    const año = partes[2];
    const fechaMySQL = `${año}-${mes}-${dia}`;
    return fechaMySQL;
}

function formatToMXCurrency(valor) {
    const formatter = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return formatter.format(valor);
}

function capitalizeWord(word) {
    if (typeof word !== 'string' || word.length === 0) {
        return ""; // Handle empty or non-string inputs
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
}

const SHOW_PASSWORD = (event, input_id) => {
    let input = document.getElementById(input_id);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password'
    }
    if (event.target.classList.contains('fa-eye')) {
        event.target.classList.remove('fa-eye');
        event.target.classList.add('fa-eye-slash');
    } else {
        event.target.classList.add('fa-eye');
        event.target.classList.remove('fa-eye-slash');
    }
}

function ShowLeftMenu() {
    let left_menu = document.getElementById('app-left-menu');
    if (left_menu) {
        if (left_menu.classList.contains('only-icons')) {
            left_menu.classList.remove('only-icons');
        } else {
            left_menu.classList.add('only-icons');
        }
    }
}

function ShowTopRightMenu() {
    let top_menu = document.getElementById('top-right-menu');
    if (top_menu) {
        let display = top_menu.style.display;
        if (display === "" || display === "none") {
            top_menu.style.display = "block";
        } else {
            top_menu.style.display = "none";
        }
    }
}

/* ------------------ According ------------------ */
function AccordionCollapse(evt) {
    let target = evt.target;
    let father = evt.target.parentNode;

    target.childNodes.forEach(ch => {
        if (ch.tagName === "I") {
            if (ch.classList.contains("fa-angle-down")) {
                ch.classList.add("fa-angle-up");
                ch.classList.remove("fa-angle-down");
            } else {
                ch.classList.remove("fa-angle-up");
                ch.classList.add("fa-angle-down");
            }
        }
    });

    father.childNodes.forEach(ch => {
        if (ch.tagName === "DIV" && ch.classList.contains("accordion-body")) {
            if (ch.classList.contains("hidden")) {
                ch.classList.remove("hidden");
            } else {
                ch.classList.add("hidden");
            }
        }
    });
}

/* -------------------- Alerts ------------------- */
function RemoveAlert(evt) {
    let father = evt.target.parentNode;
    let grand = father.parentNode;
    if (grand && father) {
        grand.removeChild(father);
    }
}

/* ------------------ Offcanvas ------------------ */
function HideOffCanvas() {
    let item = document.querySelector(".offcanvas");
    let display = item.style.display;
    //console.log(display);
    if (display === "" || display === "flex") {
        item.style.display = "none";
    } else {
        item.style.display = "flex";
    }
}

/* ------------------- SnackBar ------------------ */
const TOAST_DURATION = 4;

const FRAMEWORK_SNACKBAR = (
    bgClass = 'bg-primary',
    progColor = "bg-primary-dark",
    message = 'Short Message!',
    actionConfig = { label: '', callback: null },
    onTimeoutCallback = null,
    seconds = TOAST_DURATION
) => {
    let id = "snack-" + RANDOM_INT(100000, 999999);
    let mssgId = "snack-mssg-" + RANDOM_INT(100000, 999999);
    let progress = "snack-prog-" + RANDOM_INT(100000, 999999);
    let count = 0;
    let timerInterval;
    let actionButtonHtml = '';
    if (actionConfig.label) {
        actionButtonHtml = `<button type="button" id="snackbar-action-${id}" class="snackbar-action">${actionConfig.label}</button>`;
    }
    let snackbar = `
        <div class="snackbar ${bgClass} br-all" id="${id}">
            <div class="snackbar-content">
                <div class="snackbar-message" id="${mssgId}">
                    ${message}
                </div>
                ${actionButtonHtml}
            </div>
            <div class="snackbar-progress">
                <div class="${progColor} snackbar-progress-percent br-bottom" id="${progress}"></div>
            </div>
        </div>
    `;
    const snackbarContainer = document.getElementById('div-snackbar');
    if (!snackbarContainer) {
        console.error('Error: El contenedor "div-snackbar" no se encontró en el DOM.');
        return null;
    }
    snackbarContainer.innerHTML += snackbar;
    ActivateNotificacionSound();
    // Asignar el evento click al botón de acción
    if (actionConfig.label && actionConfig.callback) {
        document.getElementById(`snackbar-action-${id}`).onclick = () => {
            // Detener el temporizador y eliminar el snackbar inmediatamente
            clearInterval(timerInterval);
            const snackbarElement = document.getElementById(id);
            if (snackbarElement) {
                snackbarElement.parentNode.removeChild(snackbarElement);
            }
            // Ejecutar el callback de la acción (e.g., cancelar eliminación)
            actionConfig.callback();
        };
    }
    // Iniciar el temporizador de progreso
    timerInterval = setInterval(() => {
        const progressBar = document.getElementById(progress);
        if (progressBar) { // Asegurarse de que el elemento exista antes de manipularlo
            progressBar.style.width = `${(count + 1) * 100 / seconds}%`;
        }
        count++;
        if (count > seconds) {
            // El temporizador ha terminado, eliminar el snackbar
            const snackbarElement = document.getElementById(id);
            if (snackbarElement) {
                snackbarElement.parentNode.removeChild(snackbarElement);
            }
            clearInterval(timerInterval);
            // Ejecutar el callback de tiempo agotado (e.g., proceder con eliminación)
            if (onTimeoutCallback) {
                onTimeoutCallback();
            }
        }
    }, 1000);
    return id; // Devuelve el ID del snackbar si necesitas controlarlo externamente
};

const FRAMEWORK_TOAST = (toast, toast_id, seconds = TOAST_DURATION) => {
    //console.log("adding alert toast ...");
    document.getElementById("div-toasts").innerHTML += toast;
    let count = 0;
    let duration = setInterval(() => {
        if (count > seconds - 1) {
            let toast_item = document.getElementById(toast_id);
            if (toast_item) {
                toast_item.parentNode.removeChild(toast_item);
            }
            clearInterval(duration);
        }
        count++;
    }, 1000);
}

function TOAST(bgClass, textMsg, seconds) {
    //console.log("making alert toast ...");
    let toast_id = "toast-" + RANDOM_INT(100000, 999999);
    let toast = `<div class="alert ${bgClass}" id="${toast_id}">
        <i class="fa fa-times clickable" aria-hidden="true" onclick="RemoveAlert(event);"></i>
        ${textMsg}
    </div>`;
    FRAMEWORK_TOAST(toast, toast_id, seconds);
}

let ACTIVE_NOTIFICATION_SOUND = true;

function ActivateNotificacionSound() {
    let soundElement = document.getElementById('notificationSound');
    if (soundElement && ACTIVE_NOTIFICATION_SOUND) {
        soundElement.play().catch(e => console.error("Error al reproducir sonido:", e));
    }
}

function disableNotificationSounds() {
    let icon = document.getElementById('notification-sound-icon');
    if (ACTIVE_NOTIFICATION_SOUND) {
        ACTIVE_NOTIFICATION_SOUND = false;
        if (icon) {
            icon.classList.add('fa-volume-off');
            icon.classList.remove('fa-volume-up');
        }
    } else {
        ACTIVE_NOTIFICATION_SOUND = true;
        if (icon) {
            icon.classList.remove('fa-volume-off');
            icon.classList.add('fa-volume-up');
        }
    }
    ActivateNotificacionSound();
    //console.log(ACTIVE_NOTIFICATION_SOUND);
    //console.log(icon);
}

/* ------------------- Collapse ------------------ */
function CollapseItem(itemID) {
    let item = document.getElementById(itemID);
    let display = item.style.display.trim();
    //console.log(display);
    if (display === "" || display === "none") {
        item.style.display = "block";
    } else {
        item.style.display = "none";
    }
}

/* ------------------ DatePicker ----------------- */
const DATEPICKER_EMPTY_DAYS_NAMES = {
    'Sun': 0,
    'Mon': 1,
    'Tue': 2,
    'Wed': 3,
    'Thu': 4,
    'Fri': 5,
    'Sat': 6
};

let DATEPICKER_INPUT;

function DatePickerShow(target_input_id) {
    DATEPICKER_INPUT = document.getElementById(target_input_id);
    let input_value = DATEPICKER_INPUT.value;
    if (input_value !== "") {
        // set date values
        let select_year = document.getElementById("datepicker-select-year");
        let select_month = document.getElementById("datepicker-select-month");
        let days_numbers = document.getElementById("datepicker-body");
        let year = input_value.split("/")[2];
        let month = input_value.split("/")[0];
        select_year.value = year;
        select_month.value = month;
        let all_days = new Date(year, month, 0).getDate();
        let first_day = new Date(year, month - 1, 1).toDateString().split(" ")[0];
        let empty_days = DATEPICKER_EMPTY_DAYS_NAMES[first_day]
        let valid_dates = Array(empty_days).fill(false)
            .concat(Array(all_days).fill(true))
            .concat(Array(Math.abs(empty_days + all_days - 35)).fill(false));
        // set calendar days
        all_days = 1;
        days_numbers.innerHTML = "";
        for (let days = 0; days < 42; days++) {
            if (valid_dates[days]) {
                let str_date = select_month.value + "/" + ((all_days < 10) ? "0" + all_days : "" + all_days) + "/" + select_year.value;
                days_numbers.innerHTML += `<a href="javascript:DatePickerSetDateToInput('${str_date}');" class="datepicker-daynumber">${all_days}</a>`;
                all_days++;
            } else {
                days_numbers.innerHTML += `<div class=""></div>`;
            }
        }
        // set selected day
        let day_selected = parseInt(input_value.split("/")[1]) + "";
        let days = days_numbers.childNodes;
        for (let d = 0; d < days.length; d++) {
            let day = days[d];
            if (day_selected === day.innerHTML) {
                day.classList.add("datepicker-dayselected");
            } else {
                day.classList.remove("datepicker-dayselected");
            }
        }
    } else {
        DatePickerSetToday();
    }
    document.getElementById("datepicker-container").style.display = "block";
}

function DatePickerSetDateToInput(date_str) {
    if (DATEPICKER_INPUT) {
        DATEPICKER_INPUT.value = date_str;
    } else {
        console.log(date_str, DATEPICKER_INPUT);
    }
    document.getElementById("datepicker-container").style.display = "none";
}

function DatePickerSetToday() {
    // get elements
    let select_year = document.getElementById("datepicker-select-year");
    let select_month = document.getElementById("datepicker-select-month");
    let days_numbers = document.getElementById("datepicker-body");
    // set date values
    let date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let all_days = new Date(year, month, 0).getDate();
    let first_day = new Date(year, month - 1, 1).toDateString().split(" ")[0];
    let empty_days = DATEPICKER_EMPTY_DAYS_NAMES[first_day]
    let valid_dates = Array(empty_days).fill(false)
        .concat(Array(all_days).fill(true))
        .concat(Array(Math.abs(empty_days + all_days - 35)).fill(false));
    // set current year and month
    select_year.value = year;
    select_month.value = (month < 10) ? "0" + month : "" + month;
    // set calendar days
    all_days = 1;
    days_numbers.innerHTML = "";
    for (let days = 0; days < 42; days++) {
        if (valid_dates[days]) {
            let str_date = select_month.value + "/" + ((all_days < 10) ? "0" + all_days : "" + all_days) + "/" + select_year.value;
            if (all_days === day) {
                DatePickerSetDateToInput(str_date);
                days_numbers.innerHTML += `<a href="javascript:DatePickerSetDateToInput('${str_date}');" class="datepicker-daynumber datepicker-dayselected">${all_days}</a>`;
            } else {
                days_numbers.innerHTML += `<a href="javascript:DatePickerSetDateToInput('${str_date}');" class="datepicker-daynumber">${all_days}</a>`;
            }
            all_days++;
        } else {
            days_numbers.innerHTML += `<div class=""></div>`;
        }
    }
}

function DatePickerSetUp() {
    // set datepicker inner html
    let datepicker = document.getElementById("datepicker-container");
    if (datepicker) {
        datepicker.innerHTML = `
    <div class="datepicker-content" id="datepicker-content">
        <div class="datepicker-header datepicker-dark-background">
            <div class="datepicker-icon-close" onclick="document.getElementById('datepicker-container').style.display = 'none';">&#10006;</div>
            <select class="datepicker-select" id="datepicker-select-year">
                <option value="" selected disabled>AÃ‘O</option>
            </select>
            <select class="datepicker-select" id="datepicker-select-month">
                <option value="" selected disabled>MES</option>
                <option value='01'>ENERO</option>
                <option value='02'>FEBRERO</option>
                <option value='03'>MARZO</option>
                <option value='04'>ABRIL</option>
                <option value='05'>MAYO</option>
                <option value='06'>JUNIO</option>
                <option value='07'>JULIO</option>
                <option value='08'>AGOSTO</option>
                <option value='09'>SEPTIEMBRE</option>
                <option value='10'>OCTUBRE</option>
                <option value='11'>NOVIEMBRE</option>
                <option value='12'>DICIEMBRE</option>
            </select>
            <button class="datepicker-btn-today" onclick="DatePickerSetToday();">HOY</button>
        </div>
        <div class="datepicker-header datepicker-default-background">
            <div class="datepicker-dayname">DO</div>
            <div class="datepicker-dayname">LU</div>
            <div class="datepicker-dayname">MA</div>
            <div class="datepicker-dayname">MI</div>
            <div class="datepicker-dayname">JU</div>
            <div class="datepicker-dayname">VI</div>
            <div class="datepicker-dayname">SA</div>
        </div>
        <div class="datepicker-body datepicker-light-background" id="datepicker-body">
            <!--
            <a class="datepicker-daynumber" href="#">1</a>
            <a class="datepicker-daynumber" href="#">2</a>
            <a class="datepicker-daynumber" href="#">3</a>
            <a class="datepicker-daynumber datepicker-dayselected" href="#">4</a>
            <a class="datepicker-daynumber" href="#">5</a>
            <a class="datepicker-daynumber" href="#">6</a>
            <a class="datepicker-daynumber" href="#">7</a>
            <a class="datepicker-daynumber" href="#">8</a>
            <a class="datepicker-daynumber" href="#">9</a>
            <a class="datepicker-daynumber" href="#">10</a>
            -->
        </div>
    </div>`;
    } else {
        return;
    }
    // get elements
    let select_year = document.getElementById("datepicker-select-year");
    let select_month = document.getElementById("datepicker-select-month");
    let days_numbers = document.getElementById("datepicker-body");
    for (let year = 1950; year <= 2200; year++) {
        select_year.innerHTML += `<option value='${year}'>${year}</option>`;
    }
    // set onchange function to selects
    let RebuildDatePicker = () => {
        // set date values
        let year = select_year.value;
        let month = select_month.value;
        let all_days = new Date(year, month, 0).getDate();
        let first_day = new Date(year, month - 1, 1).toDateString().split(" ")[0];
        let empty_days = DATEPICKER_EMPTY_DAYS_NAMES[first_day]
        let valid_dates = Array(empty_days).fill(false)
            .concat(Array(all_days).fill(true))
            .concat(Array(Math.abs(empty_days + all_days - 35)).fill(false));
        // set calendar days
        all_days = 1;
        days_numbers.innerHTML = "";
        for (let days = 0; days < 42; days++) {
            if (valid_dates[days]) {
                let str_date = select_month.value + "/" + ((all_days < 10) ? "0" + all_days : "" + all_days) + "/" + select_year.value;
                days_numbers.innerHTML += `<a href="javascript:DatePickerSetDateToInput('${str_date}');" class="datepicker-daynumber">${all_days}</a>`;
                all_days++;
            } else {
                days_numbers.innerHTML += `<div class=""></div>`;
            }
        }
    }
    select_year.addEventListener('change', RebuildDatePicker);
    select_month.addEventListener('change', RebuildDatePicker);
    // set outside click
    document.addEventListener('click', (event) => {
        if (event.target.id === datepicker.id) {
            datepicker.style.display = "none";
        }
    });
}

/* ------------------- Dropdown ------------------ */
function ShowDropdown(evt) {
    // get elements
    let btn = evt.target;
    let prt = btn.parentNode;
    let drd;
    prt.childNodes.forEach(ch => {
        if (ch.tagName === "UL") {
            drd = ch;
        }
    });

    // calculate dropdown position
    if (drd) {
        if (drd.style.display === "" || drd.style.display === "none") {
            let wdwHeight = window.innerHeight;
            drd.style.display = 'block';
            let drdHeight = drd.offsetHeight;
            let drdTop = window.scrollY + drd.getBoundingClientRect().top;
            if (drdHeight + drdTop > wdwHeight) {
                drd.style.top = `-${drdHeight}px`;
            } else {
                drd.style.top = `auto`;
            }
        } else {
            drd.style.display = 'none';
            drd.style.top = `auto`;
        }
    }
}

/* ---------------- Fixed Alerts ----------------- */
const FIXED_ALERTS = (alert) => {
    if (document.getElementById("fixed-alerts")) {
        document.getElementById("fixed-alerts").innerHTML += alert;
        ActivateNotificacionSound();
    }
}

/* -------------------- Modals ------------------- */
const SWOH_WINDOW_MODAL = (id_modal) => {
    let WINDOW_MODAL = document.getElementById(id_modal);
    if (WINDOW_MODAL) {
        if (WINDOW_MODAL.style.left != '-100%') WINDOW_MODAL.style.left = '-100%';
        else WINDOW_MODAL.style.left = '0%';
    }
}

/* ------------------ TimePicker ----------------- */
let TIMEPICKER_INPUT;

function TamePickerShow(target_input_id) {
    TIMEPICKER_INPUT = document.getElementById(target_input_id);
    let input_value = TIMEPICKER_INPUT.value;
    if (input_value !== "") {
        // set date values
        let select_hh = document.getElementById("timepicker-select-hh");
        let select_mm = document.getElementById("timepicker-select-mm");
        let select_ap = document.getElementById("timepicker-select-ap");
        let hour = input_value.split(" ")[0].split(":")[0];
        let mint = input_value.split(" ")[0].split(":")[1];
        let ampm = input_value.split(" ")[1];
        select_hh.value = hour;
        select_mm.value = mint;
        select_ap.value = ampm;
    } else {
        TimePickerSetTime();
    }
    document.getElementById("timepicker-container").style.display = "block";
}

function TimePickerSetTimeInput() {
    let select_hh = document.getElementById("timepicker-select-hh");
    let select_mm = document.getElementById("timepicker-select-mm");
    let select_ap = document.getElementById("timepicker-select-ap");
    let time_str = select_hh.value + ":" + select_mm.value + " " + select_ap.value;
    //console.log(time_str);
    if (TIMEPICKER_INPUT) {
        TIMEPICKER_INPUT.value = time_str;
    } else {
        console.log(time_str, TIMEPICKER_INPUT);
    }
    document.getElementById("timepicker-container").style.display = "none";
}

function TimePickerSetTime() {
    // set time values
    let time = new Date();
    let ampm = "AM";
    let hour = time.getHours();
    if (hour > 12) {
        hour = hour - 12;
        ampm = "PM";
    }
    if (hour < 10) {
        hour = "0" + hour;
    } else {
        hour += "";
    }
    let minu = time.getMinutes();
    if (minu < 10) {
        minu = "0" + minu;
    } else {
        minu += "";
    }
    let time_str = hour + ":" + minu + " " + ampm;
    //console.log(hour, minu, ampm);
    //console.log(time_str);
    if (TIMEPICKER_INPUT) {
        TIMEPICKER_INPUT.value = time_str;
    } else {
        console.log(time_str, TIMEPICKER_INPUT);
    }
    let select_hh = document.getElementById('timepicker-select-hh');
    if (select_hh) {
        select_hh.value = hour;
    }
    let select_mm = document.getElementById('timepicker-select-mm');
    if (select_mm) {
        select_mm.value = minu;
    }
    let select_ap = document.getElementById('timepicker-select-ap');
    if (select_ap) {
        select_ap.value = ampm;
    }
}

function TimePickerSetup() {
    let timepicker = document.getElementById("timepicker-container");
    if (timepicker) {
        timepicker.innerHTML = `
        <div class="datepicker-content" style="width: 320px; min-height: auto;">
            <div class="datepicker-header datepicker-dark-background" style="padding: 8px;">
                <div class="datepicker-icon-close" onclick="document.getElementById('timepicker-container').style.display = 'none';">
                    <i class="fa fa-times" style="font-size: 32px;"></i>
                </div>
                <select class="datepicker-select" id="timepicker-select-hh">
                    <option value="" selected="" disabled="">HH</option>
                    <option value="00">00</option>
                    <option value="01">01</option>
                    <option value="02">02</option>
                    <option value="03">03</option>
                    <option value="04">04</option>
                    <option value="05">05</option>
                    <option value="06">06</option>
                    <option value="07">07</option>
                    <option value="08">08</option>
                    <option value="09">09</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                </select>
                <select class="datepicker-select" id="timepicker-select-mm">
                    <option value="" selected="" disabled="">MM</option>
                    <option value="00">00</option>
                    <option value="01">01</option>
                    <option value="02">02</option>
                    <option value="03">03</option>
                    <option value="04">04</option>
                    <option value="05">05</option>
                    <option value="06">06</option>
                    <option value="07">07</option>
                    <option value="08">08</option>
                    <option value="09">09</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                    <option value="13">13</option>
                    <option value="14">14</option>
                    <option value="15">15</option>
                    <option value="16">16</option>
                    <option value="17">17</option>
                    <option value="18">18</option>
                    <option value="19">19</option>
                    <option value="20">20</option>
                    <option value="21">21</option>
                    <option value="22">22</option>
                    <option value="23">23</option>
                    <option value="24">24</option>
                    <option value="25">25</option>
                    <option value="26">26</option>
                    <option value="27">27</option>
                    <option value="28">28</option>
                    <option value="29">29</option>
                    <option value="30">30</option>
                    <option value="31">31</option>
                    <option value="32">32</option>
                    <option value="33">33</option>
                    <option value="34">34</option>
                    <option value="35">35</option>
                    <option value="36">36</option>
                    <option value="37">37</option>
                    <option value="38">38</option>
                    <option value="39">39</option>
                    <option value="40">40</option>
                    <option value="41">41</option>
                    <option value="42">42</option>
                    <option value="43">43</option>
                    <option value="44">44</option>
                    <option value="45">45</option>
                    <option value="46">46</option>
                    <option value="47">47</option>
                    <option value="48">48</option>
                    <option value="49">49</option>
                    <option value="50">50</option>
                    <option value="51">51</option>
                    <option value="52">52</option>
                    <option value="53">53</option>
                    <option value="54">54</option>
                    <option value="55">55</option>
                    <option value="56">56</option>
                    <option value="57">57</option>
                    <option value="58">58</option>
                    <option value="59">59</option>
                </select>
                <select class="datepicker-select" id="timepicker-select-ap">
                    <option value="" selected="" disabled="">AM/PM</option>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                </select>
                <button class="datepicker-btn-today" onclick="TimePickerSetTimeInput();">
                    <i class="fa fa-check-circle" style="font-size: 32px;"></i>
                </button>
            </div>
        </div>
        `;

        // set outside click
        timepicker.addEventListener('click', (event) => {
            if (event.target.id === "timepicker-container") {
                document.getElementById("timepicker-container").style.display = "none";
            }
        });
    }
}

/* ------------------ Sort Tables ----------------- */
const GET_CELL_VALUE = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;

// sort table by titles
const COMPARER = function (idx, asc) {
    return function (a, b) {
        return function (v1, v2) {
            return (v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2))
                ? v1 - v2
                : v1.toString().localeCompare(v2);
        }(GET_CELL_VALUE(asc ? a : b, idx), GET_CELL_VALUE(asc ? b : a, idx));
    }
};

document.querySelectorAll('th').forEach(th => th.addEventListener('click', () => {
    const table = th.closest('table');
    const tbody = table.querySelector('tbody');
    Array.from(tbody.querySelectorAll('tr'))
        .sort(COMPARER(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
        .forEach(tr => tbody.appendChild(tr));
}));

/* ------------------ App Scripts ----------------- */

function DecodeJWT(token) {
    const base64Url = token.split('.')[1]; // Get the payload part
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); // Convert Base64Url to standard Base64
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

const API_BASE_URL = 'https://localhost:7021/api';

async function LoadDynamicTable(table, columns = '*', filter = '', page = 1, itemsPerPage = 10, executable) {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        alert("Sesión expirada. Por favor, inicie sesión nuevamente.");
        window.location.href = '/';
        return;
    }
    try {
        // 1. Construir la URL con parámetros
        const params = new URLSearchParams({
            table: table,
            columns: columns,
            filter: filter,
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
                // Llama a tu función logout() aquí si está definida
                Logout(); 
            }
            return;
        }
        const data = await response.json();
        // 3. Renderizar la Tabla y Controles
        if (typeof executable === "function") {
            executable(data);
        } else {
            TOAST('bg-warning', "No tienes una funcion ejecutable para LoadDynamicTable!", TOAST_DURATION);
        }
    } catch (error) {
        console.error("Error en loadDynamicTable:", error);
        TOAST('bg-danger', "Error en loadDynamicTable:" + error, TOAST_DURATION);
    }
}

function Logout() {
    TOAST('bg-info', "¡Adiós! Cerrando sesión...", TOAST_DURATION);
    localStorage.removeItem("adminToken");
    localStorage.clear();
    sessionStorage.clear();
    setTimeout(() => {
        window.location.href = 'Index';
    }, 1000);
}
