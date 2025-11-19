"use strict";

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
});
