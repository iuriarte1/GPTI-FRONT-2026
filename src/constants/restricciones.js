// Mapeo entre los textos de la interfaz y los valores que espera la API.

export const DIETAS = [
    { value: 'con_carne', label: 'Sin restricción' },
    { value: 'vegetariana', label: 'Vegetariano' },
    { value: 'vegana', label: 'Vegano' },
];

export const RESTRICCIONES = [
    { value: 'gluten', label: 'Sin gluten' },
    { value: 'lactosa', label: 'Sin lactosa' },
    { value: 'frutos_secos', label: 'Alergia a frutos secos' },
    { value: 'mariscos', label: 'Alergia a mariscos' },
];

export const INTENCIONES = [
    { value: 'ahorro', label: 'Ahorro' },
    { value: 'saludable', label: 'Saludable' },
    { value: 'balance', label: 'Balance' },
];
