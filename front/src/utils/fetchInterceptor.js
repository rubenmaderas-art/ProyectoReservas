// Guardamos la referencia original de fetch
const originalFetch = window.fetch;

// Sobrescribimos el fetch global para interceptar respuestas 401 y 403 de nuestra API
window.fetch = async (...args) => {
    try {
        let [input, init] = args;

        if (input instanceof Request) {
            const nextCredentials = input.credentials === 'omit' ? 'omit' : 'include';
            input = new Request(input, { credentials: nextCredentials });
            init = undefined;
        } else {
            init = { ...(init || {}), credentials: init?.credentials ?? 'include' };
        }

        const response = await originalFetch(input, init);

        // Verificamos que sea una respuesta no autorizada y que sea de nuestra API (evitando bucles con el login)
        const isUnauthorized = response.status === 401 || response.status === 403;
        const isApiCall = typeof args[0] === 'string' ? args[0].includes('/api/') : (args[0] && args[0].url && args[0].url.includes('/api/'));
        const isNotLogin = typeof args[0] === 'string' ? !args[0].includes('/api/auth/login') : (args[0] && args[0].url && !args[0].url.includes('/api/auth/login'));

        if (isUnauthorized && isApiCall && isNotLogin) {
            // Disparamos un evento global que el App.jsx escuchará para forzar el cierre de sesión
            window.dispatchEvent(new Event('force-logout'));
        }

        return response;
    } catch (error) {
        throw error;
    }
};
