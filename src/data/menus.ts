// Tipos de los menús (tal como llegan del backend y como los usa el front) y adaptadores entre ambos.

export type TipoComida = 'almuerzo' | 'cena';
export type OrigenPlato = 'casera' | 'fuera';

// ===================== Formato del backend =====================

export interface MealApi {
    id: number;
    date: string; // YYYY-MM-DD
    slot: TipoComida;
    name: string;
    source: OrigenPlato;
    recipe_id: number | null;
}

export interface SlotApi {
    id: string;
    name: string;
    origin: OrigenPlato;
    recipe_id: number | null;
    is_leftover: boolean;
}

export interface OpcionProductoApi {
    sku: string;
    name: string;
    price: number;
    package_quantity: number;
    package_unit: string;
    sold_by_weight: boolean;
    packages: number;
    cost: number;
    unit_price: number;
    is_default: boolean;
    price_updated_at: string | null;
    price_stale: boolean;
}

export interface LineaCanastaApi {
    ingredient: string;
    category: string | null;
    source_items: string[];
    quantity_needed: number | null;
    unit: string | null;
    selected: OpcionProductoApi;
    cheaper_alternative: (OpcionProductoApi & { savings: number }) | null;
    options: OpcionProductoApi[];
}

export interface CanastaApi {
    lines: LineaCanastaApi[];
    total: number;
    total_default: number;
    savings: number;
    potential_savings: number;
    not_quoted: string[];
    in_pantry: string[];
    message: string | null;
    warnings: string[];
}

export interface RecetaMenuApi {
    recipe_id: number;
    title: string;
    ingredients: string[];
    scale_factor: number;
}

export interface MenuApi {
    id: number;
    name: string;
    created_at: string | null;
    start_date: string;
    end_date: string;
    diners: number;
    meals: MealApi[];
    assignments: Record<string, SlotApi>;
    recipes: RecetaMenuApi[];
    config: { pantry?: string[] };
    basket: CanastaApi | null;
    budget_limit: number | null;
    message: string | null;
    warnings: string[];
}

export interface MenuResumenApi {
    id: number;
    name: string;
    created_at: string; // ISO en UTC
    start_date: string;
    end_date: string;
    diners: number;
    home_meals: number;
    out_meals: number;
    total_cost: number | null;
}

export interface IngredienteRecetaApi {
    name: string;
    quantity: number | null; // null = "al gusto"
    unit: string;
    is_optional: boolean;
}

export interface RecetaApi {
    id: number;
    title: string;
    servings: number;
    prep_time: string | null;
    diet_type: string;
    allergens: string[];
    ingredients: IngredienteRecetaApi[];
    steps: string[];
}

// ===================== Formato del front =====================

export interface Meal {
    id: string;
    nombre: string;
    origen: OrigenPlato;
    recetaId?: number;
    esSobra?: boolean;
}

// Id de cada slot: "YYYY-MM-DD|almuerzo" o "YYYY-MM-DD|cena".
export type SlotId = `${string}|${TipoComida}`;

// Qué plato está en cada slot. Los slots vacíos simplemente no tienen clave.
export type Asignaciones = Record<SlotId, Meal>;

export interface MenuGuardado {
    id: number;
    nombre: string;
    inicio: string; // Primer día del menú (YYYY-MM-DD)
    fin: string; // Último día del menú (YYYY-MM-DD)
    comensales: number;
    recetas: { id: number; titulo: string }[]; // Recetas del menú (las que se pueden elegir al editar)
    asignaciones: Asignaciones;
}

// ----- Fechas (YYYY-MM-DD en hora local) -----

export function aClave(fecha: Date): string {
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mm}-${dd}`;
}

export function desdeClave(clave: string): Date {
    const [a, m, d] = clave.slice(0, 10).split('-').map(Number);
    return new Date(a, m - 1, d);
}

export function slotId(fecha: string, comida: TipoComida): SlotId {
    return `${fecha}|${comida}`;
}

export function leerSlot(id: string | number): { fecha: string; comida: TipoComida } {
    const [fecha, comida] = String(id).split('|');
    return { fecha, comida: comida as TipoComida };
}

// ----- Adaptadores -----

// Una comida casera es sobra si el día anterior, en la misma comida, se cocinó la misma receta
// (misma regla que usa el backend).
export function marcarSobras(asignaciones: Asignaciones): Asignaciones {
    for (const [id, meal] of Object.entries(asignaciones) as [SlotId, Meal][]) {
        if (meal.origen !== 'casera') continue;
        const { fecha, comida } = leerSlot(id);
        const anterior = desdeClave(fecha);
        anterior.setDate(anterior.getDate() - 1);
        const previo = asignaciones[slotId(aClave(anterior), comida)];
        meal.esSobra = Boolean(previo && previo.origen === 'casera' && previo.recetaId === meal.recetaId);
    }
    return asignaciones;
}

export function asignacionesDesdeMeals(meals: MealApi[]): Asignaciones {
    const asignaciones: Asignaciones = {};
    for (const m of meals) {
        asignaciones[slotId(m.date, m.slot)] = {
            id: String(m.id), // El backend conserva este id al mover el plato
            nombre: m.name,
            origen: m.source,
            recetaId: m.recipe_id ?? undefined,
        };
    }
    return marcarSobras(asignaciones);
}

export function menuDesdeApi(menu: MenuApi): MenuGuardado {
    return {
        id: menu.id,
        nombre: menu.name,
        inicio: menu.start_date,
        fin: menu.end_date,
        comensales: menu.diners,
        recetas: (menu.recipes ?? []).map((r) => ({ id: r.recipe_id, titulo: r.title })),
        asignaciones: asignacionesDesdeMeals(menu.meals),
    };
}

// Formato de PUT /api/menus/{id}/assignments: el calendario completo.
export function asignacionesParaApi(
    asignaciones: Asignaciones,
): Record<string, { origin: OrigenPlato; recipe_id: number | null }> {
    const salida: Record<string, { origin: OrigenPlato; recipe_id: number | null }> = {};
    for (const [id, meal] of Object.entries(asignaciones)) {
        salida[id] = { origin: meal.origen, recipe_id: meal.origen === 'casera' ? (meal.recetaId ?? null) : null };
    }
    return salida;
}

// Los mismos ítems que cotiza el backend al armar la canasta del menú (build_recipes_and_basket):
// cada ingrediente de cada receta, escalado por las porciones del menú.
export function itemsParaCotizar(menu: MenuApi) {
    return {
        items: (menu.recipes ?? []).flatMap((r) =>
            r.ingredients.map((linea) => ({ original_name: linea, scale: r.scale_factor })),
        ),
        pantry: menu.config?.pantry ?? [],
    };
}

// Clave de localStorage con los ajustes de la lista de compras de un menú (despensa y productos elegidos).
export function claveDespensa(menuId: number) {
    return `nutricart_despensa_${menuId}`;
}
