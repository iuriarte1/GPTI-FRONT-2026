import { request } from './client';

// Gestión de recetas: solo para el rol gestor o admin (si no, el back responde 403).
// Todas las funciones reciben el token primero.

// estado: 'pendiente' | 'aprobada' | 'rechazada'
export function listarRecetasGestor(token, estado = 'pendiente') {
    return request(`/api/admin/recipes?status_filter=${estado}`, { token });
}

// Receta subida a mano: queda aprobada al guardar.
export function crearReceta(token, receta) {
    return request('/api/admin/recipes', { method: 'POST', token, body: receta });
}

// opciones: { count, diet_type, diet_focus, prioritize_savings, notes }. Devuelve { created, discarded }.
export function generarRecetas(token, opciones) {
    return request('/api/admin/recipes/generate', { method: 'POST', token, body: opciones });
}

export function editarReceta(token, id, receta) {
    return request(`/api/admin/recipes/${id}`, { method: 'PUT', token, body: receta });
}

export function aprobarReceta(token, id, notas) {
    return request(`/api/admin/recipes/${id}/approve`, { method: 'POST', token, body: { notes: notas || null } });
}

// El motivo es obligatorio: sin él el back responde 422.
export function rechazarReceta(token, id, motivo) {
    return request(`/api/admin/recipes/${id}/reject`, { method: 'POST', token, body: { notes: motivo } });
}
