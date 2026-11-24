import { request } from './client';

export function generarMenu(token, payload) {
    return request('/api/generar-menu', { method: 'POST', token, body: payload });
}

export function listarMenus(token) {
    return request('/api/menus', { token });
}

export function obtenerMenu(token, id) {
    return request(`/api/menus/${id}`, { token });
}

// from / to: { date: 'YYYY-MM-DD', slot: 'almuerzo' | 'cena' }
export function moverPlato(token, id, from, to) {
    return request(`/api/menus/${id}/meals/move`, { method: 'POST', token, body: { from, to } });
}

export function obtenerReceta(token, recipeId, servings) {
    const query = servings ? `?servings=${servings}` : '';
    return request(`/api/recipes/${recipeId}${query}`, { token });
}

export function eliminarMenu(token, id) {
    return request(`/api/menus/${id}`, { method: 'DELETE', token });
}

// assignments: { 'YYYY-MM-DD|almuerzo': { origin: 'casera' | 'fuera', recipe_id } } con el calendario completo.
export function guardarAsignaciones(token, id, assignments) {
    return request(`/api/menus/${id}/assignments`, { method: 'PUT', token, body: { assignments } });
}

// selections: { ingrediente: sku } para cambiar el producto elegido.
export function cotizar(token, { items, pantry = [], selections = {} }) {
    return request('/api/basket/quote', { method: 'POST', token, body: { items, pantry, selections } });
}
