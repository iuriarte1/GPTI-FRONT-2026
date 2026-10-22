const API_URL = import.meta.env.VITE_API_URL;

export async function request(path, { method = 'GET', body, token } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
        response = await fetch(`${API_URL}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new Error('No pudimos conectar con el servidor. Intenta de nuevo.');
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const detail = data?.detail;
        let message = 'Ocurrió un error inesperado.';
        if (typeof detail === 'string') message = detail;
        else if (Array.isArray(detail)) message = 'Datos inválidos';

        const error = new Error(message);
        error.status = response.status;
        throw error;
    }

    return data;
}
