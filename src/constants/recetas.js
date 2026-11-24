// Valores que acepta la API de recetas del gestor (/api/admin/recipes), con el texto que se muestra.

export const ESTADOS_RECETA = [
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'aprobada', label: 'Aprobadas' },
    { value: 'rechazada', label: 'Rechazadas' },
];

export const TIPOS_DIETA = [
    { value: 'con_carne', label: 'Con carne' },
    { value: 'vegetariana', label: 'Vegetariana' },
    { value: 'vegana', label: 'Vegana' },
];

export const ALERGENOS = [
    { value: 'gluten', label: 'Gluten' },
    { value: 'lactosa', label: 'Lactosa' },
    { value: 'frutos_secos', label: 'Frutos secos' },
    { value: 'mariscos', label: 'Mariscos' },
];

export const ENFOQUES = [
    { value: 'balanceada', label: 'Balanceada' },
    { value: 'alta_proteina', label: 'Alta en proteína' },
    { value: 'baja_carbohidratos', label: 'Baja en carbohidratos' },
    { value: 'baja_grasas', label: 'Baja en grasas' },
];
