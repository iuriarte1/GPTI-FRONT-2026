// Tipos y datos de ejemplo de los menús guardados del usuario (mientras no exista el endpoint).

export type TipoComida = 'almuerzo' | 'cena';
export type OrigenPlato = 'casera' | 'fuera';

export interface Meal {
    id: string;
    nombre: string;
    origen: OrigenPlato;
}

// Id de cada slot: "YYYY-MM-DD|almuerzo" o "YYYY-MM-DD|cena".
export type SlotId = `${string}|${TipoComida}`;

// Qué plato está en cada slot. Los slots vacíos simplemente no tienen clave.
export type Asignaciones = Record<SlotId, Meal>;

export interface MenuGuardado {
    id: string;
    nombre: string;
    creadoEn: string; // YYYY-MM-DD
    inicio: string; // Primer día del menú (YYYY-MM-DD)
    fin: string; // Último día del menú (YYYY-MM-DD)
    asignaciones: Asignaciones;
}

// ----- Fechas (YYYY-MM-DD en hora local) -----

export function aClave(fecha: Date): string {
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mm}-${dd}`;
}

export function desdeClave(clave: string): Date {
    const [a, m, d] = clave.split('-').map(Number);
    return new Date(a, m - 1, d);
}

export function slotId(fecha: string, comida: TipoComida): SlotId {
    return `${fecha}|${comida}`;
}

export function leerSlot(id: string | number): { fecha: string; comida: TipoComida } {
    const [fecha, comida] = String(id).split('|');
    return { fecha, comida: comida as TipoComida };
}

// ----- Datos de ejemplo -----

type PlatoMock = [dia: number, comida: TipoComida, nombre: string, origen?: OrigenPlato];

// Arma un menú con fechas relativas a un mes (desfase 0 = mes actual, -1 = mes anterior).
function crearMenu(
    id: string,
    nombre: string,
    desfaseMes: number,
    creadoDia: number,
    dias: [inicio: number, fin: number],
    platos: PlatoMock[],
): MenuGuardado {
    const hoy = new Date();
    const fecha = (dia: number) => aClave(new Date(hoy.getFullYear(), hoy.getMonth() + desfaseMes, dia));

    const asignaciones: Asignaciones = {};
    platos.forEach(([dia, comida, nombrePlato, origen = 'casera'], i) => {
        asignaciones[slotId(fecha(dia), comida)] = { id: `${id}-plato-${i + 1}`, nombre: nombrePlato, origen };
    });

    return { id, nombre, creadoEn: fecha(creadoDia), inicio: fecha(dias[0]), fin: fecha(dias[1]), asignaciones };
}

// Ordenados del más nuevo al más antiguo.
export const MENUS_MOCK: MenuGuardado[] = [
    // 11 platos caseros + 3 comidas fuera en los primeros 14 días del mes actual (uno por día).
    crearMenu('menu-balanceado', 'Menú balanceado', 0, 0, [1, 14], [
        [1, 'almuerzo', 'Lentejas guisadas'],
        [2, 'cena', 'Charquicán'],
        [3, 'almuerzo', 'Bowl burrito'],
        [4, 'cena', 'Pechuga con quinoa'],
        [5, 'almuerzo', 'Almuerzo en la oficina', 'fuera'],
        [6, 'cena', 'Porotos con riendas'],
        [7, 'almuerzo', 'Pastel de choclo'],
        [8, 'cena', 'Delivery de sushi', 'fuera'],
        [9, 'almuerzo', 'Tallarines con salsa boloñesa'],
        [10, 'cena', 'Omelette de espinaca'],
        [11, 'almuerzo', 'Cazuela de pollo'],
        [12, 'cena', 'Salmón al horno con papas'],
        [13, 'cena', 'Cena con amigos', 'fuera'],
        [14, 'almuerzo', 'Garbanzos con arroz'],
    ]),
    // Una semana del mes anterior con almuerzo y cena todos los días.
    crearMenu('menu-proteina', 'Semana alta en proteína', -1, 10, [13, 19], [
        [13, 'almuerzo', 'Pollo a la plancha con ensalada'],
        [13, 'cena', 'Tortilla de claras con espinaca'],
        [14, 'almuerzo', 'Carne mechada con arroz'],
        [14, 'cena', 'Atún con palta'],
        [15, 'almuerzo', 'Almuerzo en la oficina', 'fuera'],
        [15, 'cena', 'Salmón con brócoli'],
        [16, 'almuerzo', 'Pavo al horno con puré'],
        [16, 'cena', 'Huevos revueltos con queso fresco'],
        [17, 'almuerzo', 'Lentejas con huevo'],
        [17, 'cena', 'Delivery de pollo asado', 'fuera'],
        [18, 'almuerzo', 'Bistec a lo pobre liviano'],
        [18, 'cena', 'Ensalada de garbanzos y pollo'],
        [19, 'almuerzo', 'Merluza con quinoa'],
        [19, 'cena', 'Omelette de champiñones'],
    ]),
];
