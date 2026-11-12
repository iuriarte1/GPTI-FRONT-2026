import { request } from './client';

export function getMe(token) {
    return request('/api/user/me', { token });
}

export function savePreferences(token, { intent, budget_limit }) {
    return request('/api/user/preferences', { method: 'POST', token, body: { intent, budget_limit } });
}

export function getDietaryProfile(token) {
    return request('/api/user/dietary-profile', { token });
}

export function saveDietaryProfile(token, { diet_type, allergies, consent }) {
    return request('/api/user/dietary-profile', { method: 'PUT', token, body: { diet_type, allergies, consent } });
}

export function deleteDietaryProfile(token) {
    return request('/api/user/dietary-profile', { method: 'DELETE', token });
}
