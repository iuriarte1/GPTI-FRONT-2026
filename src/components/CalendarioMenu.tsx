import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type Announcements,
    type DragEndEvent,
    type DragStartEvent,
    type UniqueIdentifier,
} from '@dnd-kit/core';
import { useAuth } from '../context/AuthContext';
import { useSesionVencida } from '../hooks/useSesionVencida';
import { guardarAsignaciones, moverPlato, obtenerMenu, obtenerReceta } from '../api/menus';
import {
    aClave,
    asignacionesDesdeMeals,
    asignacionesParaApi,
    desdeClave,
    leerSlot,
    marcarSobras,
    slotId,
    type Asignaciones,
    type Meal,
    type MenuApi,
    type MenuGuardado,
    type RecetaApi,
    type SlotId,
    type TipoComida,
} from '../data/menus';

const DISPLAY = "font-['Bricolage_Grotesque',sans-serif]";

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5FD0]';

// ----- Tipos -----

interface Day {
    fecha: string; // YYYY-MM-DD en hora local
    numero: number;
    mesCorto: string | null; // "nov", solo en el primer día visible y en cada día 1
    enMenu: boolean;
    esHoy: boolean;
}

const COMIDAS: { value: TipoComida; label: string }[] = [
    { value: 'almuerzo', label: 'Almuerzo' },
    { value: 'cena', label: 'Cena' },
];

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const RANGO = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long' });
const MES_CORTO = new Intl.DateTimeFormat('es-CL', { month: 'short' });
const FECHA_LARGA = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

// ----- Fechas -----

function describirSlot(id: UniqueIdentifier): string {
    const { fecha, comida } = leerSlot(id);
    return `${comida} del ${FECHA_LARGA.format(desdeClave(fecha))}`;
}

// Solo las semanas (de lunes a domingo) que tocan el período del menú.
function semanasDelMenu(inicio: string, fin: string): Day[][] {
    const hoy = aClave(new Date());
    const cursor = desdeClave(inicio);
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7)); // retrocede hasta el lunes

    const ultimo = desdeClave(fin);
    const semanas: Day[][] = [];
    while (cursor <= ultimo) {
        const semana: Day[] = [];
        for (let i = 0; i < 7; i++) {
            const fecha = aClave(cursor);
            const numero = cursor.getDate();
            semana.push({
                fecha,
                numero,
                mesCorto: (semanas.length === 0 && i === 0) || numero === 1 ? MES_CORTO.format(cursor).replace('.', '') : null,
                enMenu: fecha >= inicio && fecha <= fin,
                esHoy: fecha === hoy,
            });
            cursor.setDate(cursor.getDate() + 1);
        }
        semanas.push(semana);
    }
    return semanas;
}

// ----- Estilos por tipo de tarjeta -----

const ESTILO_TARJETA: Record<TipoComida | 'fuera', string> = {
    almuerzo: 'border-orange-200 bg-orange-50 text-orange-950',
    cena: 'border-blue-200 bg-blue-50 text-blue-950',
    fuera: 'border-gray-300 bg-gray-100 italic text-gray-700',
};

function estiloDe(meal: Meal, comida: TipoComida): string {
    return ESTILO_TARJETA[meal.origen === 'fuera' ? 'fuera' : comida];
}

// ----- Piezas del calendario -----

function ContenidoTarjeta({ meal }: { meal: Meal }) {
    return (
        <span className="flex items-start gap-1.5">
            {meal.origen === 'fuera' && (
                <span aria-hidden="true" className="not-italic">
                    🛵
                </span>
            )}
            <span className="line-clamp-2">
                {meal.nombre}
                {meal.esSobra && (
                    <span className="ml-1.5 inline-block rounded-full bg-white/80 px-1.5 text-[10px] font-bold uppercase not-italic tracking-wide text-[#42516A]">
                        Sobra
                    </span>
                )}
            </span>
        </span>
    );
}

// meal vacío = espacio sin plato (se abre el modal para agregar uno).
interface PlatoSeleccionado {
    meal?: Meal;
    slot: SlotId;
}

interface RecetaElegible {
    id: number;
    titulo: string;
}

// Lo que se guarda en un espacio al editar: una receta casera, comida fuera o nada (quitar).
type Cambio = { origen: 'casera'; recetaId: number } | { origen: 'fuera' } | null;

type AbrirReceta = (plato: PlatoSeleccionado) => void;

interface TarjetaPlatoProps {
    meal: Meal;
    comida: TipoComida;
    slot: SlotId;
    onAbrir: AbrirReceta;
    bloqueado: boolean;
}

function TarjetaPlato({ meal, comida, slot, onAbrir, bloqueado }: TarjetaPlatoProps) {
    // Mientras se guarda un movimiento no se puede tomar otro plato (evita carreras con el backend).
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: meal.id, data: { slot }, disabled: bloqueado });

    // Clic (sin arrastrar) o Enter abren la receta; Espacio queda para tomar el plato con el teclado.
    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        listeners?.onKeyDown?.(event);
        if (event.key === 'Enter' && !isDragging) {
            event.preventDefault();
            onAbrir({ meal, slot });
        }
    }

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onKeyDown={handleKeyDown}
            onClick={() => onAbrir({ meal, slot })}
            aria-label={`${meal.nombre}${meal.origen === 'fuera' ? ' (comida fuera)' : ''}, ${describirSlot(slot)}`}
            className={`cursor-grab touch-none rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold leading-snug shadow-sm transition select-none hover:-translate-y-px hover:shadow-md active:cursor-grabbing ${estiloDe(meal, comida)} ${isDragging ? 'opacity-40' : ''} ${FOCO}`}
        >
            <ContenidoTarjeta meal={meal} />
        </div>
    );
}

interface SlotComidaProps {
    fecha: string;
    comida: TipoComida;
    meal?: Meal;
    onAbrir: AbrirReceta;
    bloqueado: boolean;
}

function SlotComida({ fecha, comida, meal, onAbrir, bloqueado }: SlotComidaProps) {
    const id = slotId(fecha, comida);
    const { setNodeRef, isOver } = useDroppable({ id });
    const etiqueta = COMIDAS.find((c) => c.value === comida)?.label;

    return (
        <div
            ref={setNodeRef}
            className={`min-h-[52px] rounded-xl transition ${isOver ? 'bg-blue-100/70 ring-2 ring-[#0B5FD0]' : ''}`}
        >
            {meal ? (
                <TarjetaPlato meal={meal} comida={comida} slot={id} onAbrir={onAbrir} bloqueado={bloqueado} />
            ) : (
                <button
                    type="button"
                    onClick={() => onAbrir({ slot: id })}
                    disabled={bloqueado}
                    aria-label={`Agregar plato: ${describirSlot(id)}`}
                    className={`group flex h-full min-h-[52px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-blue-100 text-xs font-medium text-[#8A97AB] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] disabled:cursor-not-allowed ${FOCO}`}
                >
                    <span>{etiqueta}</span>
                    <span className="font-bold opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                        + Agregar
                    </span>
                </button>
            )}
        </div>
    );
}

interface CeldaDiaProps {
    dia: Day;
    asignaciones: Asignaciones;
    onAbrir: AbrirReceta;
    bloqueado: boolean;
}

function CeldaDia({ dia, asignaciones, onAbrir, bloqueado }: CeldaDiaProps) {
    return (
        <div
            className={`flex min-h-[156px] flex-col gap-1.5 p-2 ${dia.enMenu ? 'bg-white' : 'bg-[#F8FAFD]'}`}
        >
            <span className="flex items-center justify-end gap-1">
                {dia.mesCorto && (
                    <span className={`text-xs font-semibold uppercase ${dia.enMenu ? 'text-[#42516A]' : 'text-[#B3BDCC]'}`}>
                        {dia.mesCorto}
                    </span>
                )}
                <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                        dia.esHoy ? 'bg-[#0B5FD0] text-white' : dia.enMenu ? 'text-[#0A2350]' : 'text-[#B3BDCC]'
                    }`}
                >
                    {dia.numero}
                </span>
            </span>
            {/* Los días fuera del menú se muestran solo para completar la semana: no reciben platos. */}
            {dia.enMenu && COMIDAS.map(({ value }) => (
                <SlotComida
                    key={value}
                    fecha={dia.fecha}
                    comida={value}
                    meal={asignaciones[slotId(dia.fecha, value)]}
                    onAbrir={onAbrir}
                    bloqueado={bloqueado}
                />
            ))}
        </div>
    );
}

// ----- Modal de receta -----

// Usa <dialog> nativo: showModal() bloquea el fondo, atrapa el foco y cierra con Escape.
type EstadoReceta =
    | { estado: 'cargando' }
    | { estado: 'lista'; receta: RecetaApi }
    | { estado: 'error'; mensaje: string };

// Medidas que no tiene sentido usar con decimales en la cocina (1,6 cucharaditas o 1,5 huevos):
// se redondean hacia arriba. Los gramos, mililitros, kilos, litros y tazas se muestran tal cual.
const REDONDEAR_HACIA_ARRIBA = new Set(['cucharada', 'cucharadita', 'unidad', 'diente']);

const PLURALES: Record<string, string> = {
    cucharada: 'cucharadas',
    cucharadita: 'cucharaditas',
    unidad: 'unidades',
    diente: 'dientes',
    taza: 'tazas',
    lata: 'latas',
};

function formatearCantidad(cantidad: number, unidad: string): string {
    // El redondeo a 2 decimales evita que un 2,0000001 del escalado se convierta en 3.
    const valor = REDONDEAR_HACIA_ARRIBA.has(unidad) ? Math.ceil(Math.round(cantidad * 100) / 100) : cantidad;
    const texto = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(valor);
    const nombreUnidad = valor > 1 ? (PLURALES[unidad] ?? unidad) : unidad;
    return `${texto} ${nombreUnidad}`;
}

function DetalleReceta({ recetaId, comensales }: { recetaId: number; comensales: number }) {
    const { token } = useAuth();
    const manejarSesion = useSesionVencida();
    const [intento, setIntento] = useState(0);
    const [resultado, setResultado] = useState<EstadoReceta & { clave: string }>({ estado: 'cargando', clave: '' });
    const clave = `${recetaId}-${comensales}-${intento}`;

    useEffect(() => {
        let cancelado = false;
        obtenerReceta(token, recetaId, comensales)
            .then((receta: RecetaApi) => {
                if (!cancelado) setResultado({ estado: 'lista', receta, clave });
            })
            .catch((error: Error & { status?: number }) => {
                if (cancelado || manejarSesion(error)) return;
                const mensaje = error.status === 404 ? 'Esta receta ya no está disponible.' : error.message;
                setResultado({ estado: 'error', mensaje, clave });
            });
        return () => {
            cancelado = true;
        };
    }, [token, recetaId, comensales, clave, manejarSesion]);

    // Si cambió la receta pedida, lo anterior ya no sirve: se muestra como cargando.
    const actual: EstadoReceta = resultado.clave === clave ? resultado : { estado: 'cargando' };

    if (actual.estado === 'cargando') {
        return (
            <p role="status" className="rounded-[22px] bg-[#F4F7FB] p-6 text-center font-semibold text-[#42516A]">
                Cargando la receta…
            </p>
        );
    }

    if (actual.estado === 'error') {
        return (
            <div role="alert" className="rounded-[22px] border border-[#F5C2BF] bg-[#FDECEA] p-6 text-center">
                <p className="font-semibold text-[#A12A1F]">{actual.mensaje}</p>
                <button
                    type="button"
                    onClick={() => setIntento((n) => n + 1)}
                    className={`mt-3 rounded-full border border-[#F5C2BF] bg-white px-5 py-2 text-sm font-semibold text-[#A12A1F] ${FOCO}`}
                >
                    Reintentar
                </button>
            </div>
        );
    }

    const { receta } = actual;
    return (
        <div className="flex flex-col gap-5">
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-[#42516A]">
                <span>👥 {receta.servings} {receta.servings === 1 ? 'porción' : 'porciones'}</span>
                {receta.prep_time && <span>⏱️ {receta.prep_time}</span>}
            </p>

            <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#0B5FD0]">Ingredientes</h3>
                <ul className="divide-y divide-blue-50 rounded-2xl bg-[#F4F7FB] px-4">
                    {receta.ingredients.map((ing, i) => (
                        <li key={`${ing.name}-${i}`} className="flex justify-between gap-4 py-2 text-[15px]">
                            <span className="text-[#0A2350]">
                                {ing.name}
                                {ing.is_optional && <span className="ml-1 text-sm text-[#8A97AB]">(opcional)</span>}
                            </span>
                            <span className="shrink-0 text-right font-semibold text-[#0A2350]">
                                {ing.quantity === null ? 'al gusto' : formatearCantidad(ing.quantity, ing.unit)}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            {receta.steps.length > 0 && (
                <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#0B5FD0]">Preparación</h3>
                    <ol className="flex flex-col gap-3">
                        {receta.steps.map((paso, i) => (
                            <li key={i} className="flex gap-3 text-[15px] text-[#0F1B2D]">
                                <span
                                    aria-hidden="true"
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0B5FD0] text-sm font-bold text-white"
                                >
                                    {i + 1}
                                </span>
                                <span className="pt-0.5">{paso}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}

const BOTON_EDITAR = `rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] disabled:cursor-not-allowed disabled:opacity-50 ${FOCO}`;

interface EditorPlatoProps {
    meal?: Meal;
    recetas: RecetaElegible[];
    guardando: boolean;
    esUltimo: boolean;
    error: string | null;
    onGuardar: (cambio: Cambio) => void;
}

function EditorPlato({ meal, recetas, guardando, esUltimo, error, onGuardar }: EditorPlatoProps) {
    const esCasera = meal?.origen === 'casera';
    // Al cambiar una receta casera no tiene sentido ofrecer la misma.
    const opciones = esCasera ? recetas.filter((r) => r.id !== meal?.recetaId) : recetas;
    const [elegida, setElegida] = useState<number | ''>(opciones[0]?.id ?? '');
    const recetaValida = opciones.some((r) => r.id === elegida);

    const textoReceta = !meal ? 'Agregar receta' : esCasera ? 'Cambiar receta' : 'Cocinar en casa';

    return (
        <div className="rounded-[22px] border border-blue-100 p-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#0B5FD0]">
                {meal ? 'Editar este plato' : 'Elige qué comer'}
            </h3>

            {opciones.length > 0 && (
                <div className="mb-4 flex flex-wrap items-end gap-2">
                    <label className="min-w-[200px] flex-1">
                        <span className="mb-1 block text-sm font-semibold text-[#0A2350]">Receta del menú</span>
                        <select
                            value={elegida}
                            onChange={(e) => setElegida(Number(e.target.value))}
                            disabled={guardando}
                            className={`w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-[15px] text-[#0F1B2D] ${FOCO}`}
                        >
                            {opciones.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.titulo}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        onClick={() => recetaValida && onGuardar({ origen: 'casera', recetaId: Number(elegida) })}
                        disabled={guardando || !recetaValida}
                        className={`rounded-full bg-[#0B5FD0] px-5 py-2.5 text-sm font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`}
                    >
                        {textoReceta}
                    </button>
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {meal?.origen !== 'fuera' && (
                    <button type="button" onClick={() => onGuardar({ origen: 'fuera' })} disabled={guardando} className={BOTON_EDITAR}>
                        🛵 {meal ? 'Marcar como comida fuera' : 'Comida fuera'}
                    </button>
                )}
                {meal && (
                    <button
                        type="button"
                        onClick={() => onGuardar(null)}
                        disabled={guardando || esUltimo}
                        title={esUltimo ? 'El menú debe tener al menos un plato.' : undefined}
                        className={BOTON_EDITAR}
                    >
                        Quitar del calendario
                    </button>
                )}
            </div>
            {meal && esUltimo && (
                <p className="mt-2 text-sm text-[#42516A]">Es el único plato del menú, así que no se puede quitar.</p>
            )}

            {guardando && (
                <p aria-live="polite" className="mt-3 text-sm font-medium text-[#42516A]">
                    Guardando y recotizando tu lista de compras…
                </p>
            )}
            {error && (
                <p role="alert" className="mt-3 rounded-xl border border-[#F5C2BF] bg-[#FDECEA] px-4 py-3 text-sm font-medium text-[#A12A1F]">
                    {error}
                </p>
            )}
        </div>
    );
}

interface ModalRecetaProps {
    plato: PlatoSeleccionado | null;
    comensales: number;
    recetas: RecetaElegible[];
    guardando: boolean;
    esUltimo: boolean;
    error: string | null;
    onGuardar: (cambio: Cambio) => void;
    onCerrar: () => void;
}

function ModalReceta({ plato, comensales, recetas, guardando, esUltimo, error, onGuardar, onCerrar }: ModalRecetaProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (plato && !dialog.open) dialog.showModal();
        else if (!plato && dialog.open) dialog.close();
    }, [plato]);

    const comida = plato ? leerSlot(plato.slot) : null;
    const etiquetaComida = COMIDAS.find((c) => c.value === comida?.comida)?.label;
    const meal = plato?.meal;
    const esFuera = meal?.origen === 'fuera';
    const cerrar = () => {
        if (!guardando) onCerrar();
    };

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="receta-titulo"
            onCancel={(e) => {
                // Escape: se cierra controlando el estado, no el <dialog> por su cuenta.
                e.preventDefault();
                cerrar();
            }}
            onClick={(e) => {
                // Clic en el fondo oscuro (fuera de la caja) cierra el modal.
                if (e.target === e.currentTarget) cerrar();
            }}
            className="m-auto w-[calc(100%-32px)] max-w-[520px] rounded-[28px] bg-white p-0 text-[#0F1B2D] shadow-[0_24px_60px_rgba(10,35,80,0.25)] backdrop:bg-[#0A2350]/50 backdrop:backdrop-blur-sm"
        >
            {plato && comida && (
                <div className="flex max-h-[85vh] flex-col gap-5 overflow-y-auto p-7 sm:p-8">
                    <div>
                        <div className="mb-3 flex flex-wrap gap-2">
                            <span
                                className={`rounded-full border px-3 py-1 text-xs font-bold ${meal ? estiloDe(meal, comida.comida) : ESTILO_TARJETA[comida.comida]}`}
                            >
                                {esFuera ? '🛵 Comida fuera' : etiquetaComida}
                            </span>
                            <span className="rounded-full bg-[#F4F7FB] px-3 py-1 text-xs font-semibold capitalize text-[#42516A]">
                                {FECHA_LARGA.format(desdeClave(comida.fecha))}
                            </span>
                        </div>
                        <h2 id="receta-titulo" className={`${DISPLAY} text-3xl font-extrabold tracking-tight text-[#0A2350]`}>
                            {meal ? meal.nombre : `Agregar ${etiquetaComida?.toLowerCase()}`}
                        </h2>
                    </div>

                    {!meal ? null : esFuera || !meal.recetaId ? (
                        <div className="rounded-[22px] border border-dashed border-blue-200 bg-[#F4F7FB] p-6 text-center">
                            <p aria-hidden="true" className="mb-2 text-3xl">
                                {esFuera ? '🛵' : '🍽️'}
                            </p>
                            <p className="font-semibold text-[#0A2350]">
                                {esFuera ? 'Esta comida es fuera de casa.' : 'Este plato no tiene receta asociada.'}
                            </p>
                            {esFuera && (
                                <p className="mt-1 text-[15px] text-[#42516A]">
                                    No necesita receta ni ingredientes en tu lista de compras.
                                </p>
                            )}
                        </div>
                    ) : (
                        <>
                            {meal.esSobra && (
                                <p className="rounded-xl bg-[#FFF6D6] px-4 py-3 text-sm font-medium text-[#6B5200]">
                                    Es una sobra: este día no se cocina, se come lo que preparaste el día anterior.
                                </p>
                            )}
                            <DetalleReceta recetaId={meal.recetaId} comensales={comensales} />
                        </>
                    )}

                    {/* La key reinicia la receta elegida al abrir otro plato. */}
                    <EditorPlato
                        key={`${plato.slot}-${meal?.id ?? 'vacio'}`}
                        meal={meal}
                        recetas={recetas}
                        guardando={guardando}
                        esUltimo={esUltimo}
                        error={error}
                        onGuardar={onGuardar}
                    />

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={cerrar}
                            disabled={guardando}
                            autoFocus
                            className={`rounded-full bg-[#0B5FD0] px-7 py-3 font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </dialog>
    );
}

// ----- Accesibilidad del arrastre -----

const INSTRUCCIONES =
    'Presiona Enter para ver la receta. Para mover el plato, presiona espacio para tomarlo, usa las flechas para moverlo y vuelve a presionar espacio para soltarlo. Escape cancela.';

function anuncios(nombreDe: (id: UniqueIdentifier) => string): Announcements {
    return {
        onDragStart: ({ active }) => `Tomaste ${nombreDe(active.id)}.`,
        onDragOver: ({ active, over }) =>
            over ? `${nombreDe(active.id)} está sobre ${describirSlot(over.id)}.` : `${nombreDe(active.id)} no está sobre ningún día.`,
        onDragEnd: ({ active, over }) =>
            over ? `Soltaste ${nombreDe(active.id)} en ${describirSlot(over.id)}.` : `${nombreDe(active.id)} volvió a su lugar.`,
        onDragCancel: ({ active }) => `Movimiento cancelado. ${nombreDe(active.id)} volvió a su lugar.`,
    };
}

// ----- Vista -----

// Para cambiar de menú, el padre debe montar el componente con key={menu.id}: así se reinicia el estado.
interface CalendarioMenuProps {
    menu: MenuGuardado;
    // Se llama con el menú completo que devuelve el backend tras editar (trae la canasta recotizada).
    onMenuActualizado?: (menu: MenuApi) => void;
}

export default function CalendarioMenu({ menu, onMenuActualizado }: CalendarioMenuProps) {
    const { token } = useAuth();
    const manejarSesion = useSesionVencida();
    const [asignaciones, setAsignaciones] = useState<Asignaciones>(menu.asignaciones);
    // Recetas que se pueden elegir al editar. Se acumulan: si una receta deja de estar en el menú,
    // se puede volver a elegir.
    const [recetas, setRecetas] = useState<RecetaElegible[]>(menu.recetas);
    const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
    const [arrastrando, setArrastrando] = useState<{ meal: Meal; comida: TipoComida } | null>(null);
    const [receta, setReceta] = useState<PlatoSeleccionado | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [aviso, setAviso] = useState<string | null>(null);

    // La distancia mínima evita que un simple clic se tome como arrastre.
    // Con teclado solo Espacio toma el plato: Enter queda libre para abrir la receta.
    const sensores = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
        }),
    );

    // El período viene del menú: mover platos no agranda ni achica el calendario.
    const semanas = semanasDelMenu(menu.inicio, menu.fin);

    function nombreDe(id: UniqueIdentifier): string {
        return Object.values(asignaciones).find((m) => m.id === id)?.nombre ?? 'el plato';
    }

    function handleDragStart({ active }: DragStartEvent) {
        const origen = active.data.current?.slot as SlotId;
        setArrastrando({ meal: asignaciones[origen], comida: leerSlot(origen).comida });
    }

    function abrirPlato(plato: PlatoSeleccionado) {
        setErrorEdicion(null);
        setReceta(plato);
    }

    // Edita un espacio (cambiar receta, marcar como fuera, quitar o agregar) y guarda el calendario
    // completo. No es optimista: el backend recalcula las sobras y recotiza la lista de compras.
    async function guardarEdicion(cambio: Cambio) {
        if (!receta || guardando) return;
        const { slot } = receta;
        const siguientes: Asignaciones = { ...asignaciones };
        if (cambio === null) {
            delete siguientes[slot];
        } else {
            const titulo =
                cambio.origen === 'casera' ? recetas.find((r) => r.id === cambio.recetaId)?.titulo ?? 'Receta' : 'Comida fuera de casa';
            siguientes[slot] = {
                id: asignaciones[slot]?.id ?? `nuevo-${slot}`,
                nombre: titulo,
                origen: cambio.origen,
                recetaId: cambio.origen === 'casera' ? cambio.recetaId : undefined,
            };
        }

        setGuardando(true);
        setErrorEdicion(null);
        try {
            const actualizado: MenuApi = await guardarAsignaciones(token, menu.id, asignacionesParaApi(siguientes));
            setAsignaciones(asignacionesDesdeMeals(actualizado.meals));
            setRecetas((actuales) => {
                const nuevas = actualizado.recipes
                    .filter((r) => !actuales.some((a) => a.id === r.recipe_id))
                    .map((r) => ({ id: r.recipe_id, titulo: r.title }));
                return nuevas.length > 0 ? [...actuales, ...nuevas] : actuales;
            });
            setReceta(null);
            setAviso(null);
            onMenuActualizado?.(actualizado);
        } catch (error) {
            const err = error as Error & { status?: number };
            if (manejarSesion(err)) return;
            setErrorEdicion(
                err.status === 422 ? err.message : `No pudimos guardar el cambio. ${err.message}`,
            );
        } finally {
            setGuardando(false);
        }
    }

    // Trae el calendario guardado en el backend (por ejemplo, si otro cambio lo dejó desactualizado).
    async function recargar() {
        try {
            const actualizado: MenuApi = await obtenerMenu(token, menu.id);
            setAsignaciones(asignacionesDesdeMeals(actualizado.meals));
        } catch (error) {
            if (!manejarSesion(error)) setAviso('No pudimos actualizar el calendario. Recarga la página.');
        }
    }

    // Si el slot de destino está ocupado, los dos platos se intercambian.
    // Se muestra el cambio de inmediato y después se guarda; si el backend lo rechaza, se revierte.
    async function handleDragEnd({ active, over }: DragEndEvent) {
        setArrastrando(null);
        if (!over || guardando) return;
        const origen = active.data.current?.slot as SlotId;
        const destino = over.id as SlotId;
        if (origen === destino) return;

        const anteriores = asignaciones;
        const siguientes: Asignaciones = {};
        for (const [id, meal] of Object.entries(anteriores) as [SlotId, Meal][]) siguientes[id] = { ...meal };
        const movido = siguientes[origen];
        const desplazado = siguientes[destino];
        siguientes[destino] = movido;
        if (desplazado) siguientes[origen] = desplazado;
        else delete siguientes[origen];
        setAsignaciones(marcarSobras(siguientes));
        setAviso(null);
        setGuardando(true);

        const desde = leerSlot(origen);
        const hasta = leerSlot(destino);
        try {
            const { meals } = await moverPlato(
                token,
                menu.id,
                { date: desde.fecha, slot: desde.comida },
                { date: hasta.fecha, slot: hasta.comida },
            );
            setAsignaciones(asignacionesDesdeMeals(meals));
        } catch (error) {
            const err = error as Error & { status?: number };
            if (manejarSesion(err)) return;
            if (err.status === 409) {
                // El plato ya no estaba ahí: se muestra lo que tiene guardado el backend.
                setAviso(err.message);
                await recargar();
            } else {
                setAsignaciones(anteriores);
                setAviso(
                    err.status === 422
                        ? err.message
                        : `No pudimos guardar el cambio, así que el plato volvió a su lugar. ${err.message}`,
                );
            }
        } finally {
            setGuardando(false);
        }
    }

    return (
        <section aria-labelledby="titulo-calendario">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2
                        id="titulo-calendario"
                        className={`${DISPLAY} text-[clamp(28px,3vw,40px)] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#0A2350]`}
                    >
                        Mi calendario
                    </h2>
                    <p className="mt-2 text-[15px] text-[#42516A]">
                        Haz clic en un plato para ver su receta o editarlo, o arrástralo a otro día para moverlo.
                        Si el lugar está ocupado, se intercambian. En un espacio vacío puedes agregar un plato.
                    </p>
                </div>

                <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#0B5FD0]">{menu.nombre}</p>
                    <p className={`${DISPLAY} text-xl font-extrabold text-[#0A2350]`}>
                        {RANGO.formatRange(desdeClave(menu.inicio), desdeClave(menu.fin))}
                    </p>
                </div>
            </div>

            {aviso && (
                <div
                    role="alert"
                    className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F5C2BF] bg-[#FDECEA] px-4 py-3 text-sm font-medium text-[#A12A1F]"
                >
                    <span>{aviso}</span>
                    <button
                        type="button"
                        onClick={() => setAviso(null)}
                        className={`rounded-full px-3 py-1 font-semibold transition hover:bg-white/60 ${FOCO}`}
                    >
                        Cerrar
                    </button>
                </div>
            )}
            <p role="status" className="sr-only">
                {guardando ? 'Guardando el cambio…' : ''}
            </p>

            {/* Leyenda */}
            <ul className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-[#42516A]">
                <li className="flex items-center gap-2">
                    <span aria-hidden="true" className={`h-3.5 w-3.5 rounded border ${ESTILO_TARJETA.almuerzo}`} />
                    Almuerzo
                </li>
                <li className="flex items-center gap-2">
                    <span aria-hidden="true" className={`h-3.5 w-3.5 rounded border ${ESTILO_TARJETA.cena}`} />
                    Cena
                </li>
                <li className="flex items-center gap-2">
                    <span aria-hidden="true">🛵</span>
                    Comida fuera / delivery
                </li>
            </ul>

            <DndContext
                sensors={sensores}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setArrastrando(null)}
                accessibility={{
                    announcements: anuncios(nombreDe),
                    screenReaderInstructions: { draggable: INSTRUCCIONES },
                }}
            >
                {/* En pantallas angostas el calendario se desplaza horizontalmente. */}
                <div className="overflow-x-auto rounded-[28px] shadow-[0_16px_40px_rgba(10,35,80,0.08)]">
                    <div className="min-w-[980px] overflow-hidden rounded-[28px] bg-blue-100">
                        <div className="grid grid-cols-7 gap-px">
                            {DIAS_SEMANA.map((dia) => (
                                <div
                                    key={dia}
                                    className="bg-white px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-[#0B5FD0]"
                                >
                                    {dia}
                                </div>
                            ))}
                            {semanas.flat().map((dia) => (
                                <CeldaDia
                                    key={dia.fecha}
                                    dia={dia}
                                    asignaciones={asignaciones}
                                    onAbrir={abrirPlato}
                                    bloqueado={guardando}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
                    {arrastrando && (
                        <div
                            className={`cursor-grabbing rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold leading-snug shadow-xl rotate-2 ${estiloDe(arrastrando.meal, arrastrando.comida)}`}
                        >
                            <ContenidoTarjeta meal={arrastrando.meal} />
                        </div>
                    )}
                </DragOverlay>
            </DndContext>

            <ModalReceta
                plato={receta}
                comensales={menu.comensales}
                recetas={recetas}
                guardando={guardando}
                esUltimo={Object.keys(asignaciones).length <= 1}
                error={errorEdicion}
                onGuardar={guardarEdicion}
                onCerrar={() => setReceta(null)}
            />
        </section>
    );
}
