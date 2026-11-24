// Roles que pueden usar el panel de recetas. El back vuelve a validarlo en cada llamada (responde 403 si no).
export function esGestor(user) {
    return user?.role === 'gestor' || user?.role === 'admin';
}
