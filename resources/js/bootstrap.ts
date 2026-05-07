import axios from 'axios';

function readXsrfToken(): string | undefined {
    const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);

    return m ? decodeURIComponent(m[1]) : undefined;
}

function applyXsrfHeader(): void {
    const xsrf = readXsrfToken();
    if (xsrf) {
        axios.defaults.headers.common['X-XSRF-TOKEN'] = xsrf;
    }
}

window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
applyXsrfHeader();

/** Laravel rotates the XSRF cookie; refresh the header on every request (chunked uploads send many POSTs). */
window.axios.interceptors.request.use((config) => {
    applyXsrfHeader();
    return config;
});
