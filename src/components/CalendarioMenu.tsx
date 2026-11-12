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
import {
    aClave,
    desdeClave,
    leerSlot,
    slotId,
    type Asignaciones,
    type Meal,
    type MenuGuardado,
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
            <span className="line-clamp-2">{meal.nombre}</span>
        </span>
    );
}

interface PlatoSeleccionado {
    meal: Meal;
    slot: SlotId;
}

type AbrirReceta = (plato: PlatoSeleccionado) => void;

function TarjetaPlato({ meal, comida, slot, onAbrir }: { meal: Meal; comida: TipoComida; slot: SlotId; onAbrir: AbrirReceta }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: meal.id, data: { slot } });

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

function SlotComida({ fecha, comida, meal, onAbrir }: { fecha: string; comida: TipoComida; meal?: Meal; onAbrir: AbrirReceta }) {
    const id = slotId(fecha, comida);
    const { setNodeRef, isOver } = useDroppable({ id });
    const etiqueta = COMIDAS.find((c) => c.value === comida)?.label;

    return (
        <div
            ref={setNodeRef}
            className={`min-h-[52px] rounded-xl transition ${isOver ? 'bg-blue-100/70 ring-2 ring-[#0B5FD0]' : ''}`}
        >
            {meal ? (
                <TarjetaPlato meal={meal} comida={comida} slot={id} onAbrir={onAbrir} />
            ) : (
                <div className="flex h-full min-h-[52px] items-center justify-center rounded-lg border border-dashed border-blue-100 text-xs font-medium text-[#8A97AB]">
                    {etiqueta}
                </div>
            )}
        </div>
    );
}

function CeldaDia({ dia, asignaciones, onAbrir }: { dia: Day; asignaciones: Asignaciones; onAbrir: AbrirReceta }) {
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
                />
            ))}
        </div>
    );
}

// ----- Modal de receta -----

// Usa <dialog> nativo: showModal() bloquea el fondo, atrapa el foco y cierra con Escape.
function ModalReceta({ plato, onCerrar }: { plato: PlatoSeleccionado | null; onCerrar: () => void }) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (plato && !dialog.open) dialog.showModal();
        else if (!plato && dialog.open) dialog.close();
    }, [plato]);

    const comida = plato ? leerSlot(plato.slot) : null;
    const etiquetaComida = COMIDAS.find((c) => c.value === comida?.comida)?.label;
    const esFuera = plato?.meal.origen === 'fuera';

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="receta-titulo"
            onCancel={(e) => {
                // Escape: se cierra controlando el estado, no el <dialog> por su cuenta.
                e.preventDefault();
                onCerrar();
            }}
            onClick={(e) => {
                // Clic en el fondo oscuro (fuera de la caja) cierra el modal.
                if (e.target === e.currentTarget) onCerrar();
            }}
            className="m-auto w-[calc(100%-32px)] max-w-[520px] rounded-[28px] bg-white p-0 text-[#0F1B2D] shadow-[0_24px_60px_rgba(10,35,80,0.25)] backdrop:bg-[#0A2350]/50 backdrop:backdrop-blur-sm"
        >
            {plato && comida && (
                <div className="flex flex-col gap-5 p-7 sm:p-8">
                    <div>
                        <div className="mb-3 flex flex-wrap gap-2">
                            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${estiloDe(plato.meal, comida.comida)}`}>
                                {esFuera ? '🛵 Comida fuera' : etiquetaComida}
                            </span>
                            <span className="rounded-full bg-[#F4F7FB] px-3 py-1 text-xs font-semibold capitalize text-[#42516A]">
                                {FECHA_LARGA.format(desdeClave(comida.fecha))}
                            </span>
                        </div>
                        <h2 id="receta-titulo" className={`${DISPLAY} text-3xl font-extrabold tracking-tight text-[#0A2350]`}>
                            {plato.meal.nombre}
                        </h2>
                    </div>

                    <div className="rounded-[22px] border border-dashed border-blue-200 bg-[#F4F7FB] p-6 text-center">
                        <p aria-hidden="true" className="mb-2 text-3xl">
                            {esFuera ? '🛵' : '👩‍🍳'}
                        </p>
                        <p className="font-semibold text-[#0A2350]">
                            {esFuera ? 'Esta comida es fuera de casa.' : 'Receta en preparación'}
                        </p>
                        <p className="mt-1 text-[15px] text-[#42516A]">
                            {esFuera
                                ? 'No necesita receta ni ingredientes en tu lista de compras.'
                                : 'Próximamente verás aquí la receta paso a paso, con ingredientes, cantidades, tiempos de preparación y toda la información del plato.'}
                        </p>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onCerrar}
                            autoFocus
                            className={`rounded-full bg-[#0B5FD0] px-7 py-3 font-bold text-white transition hover:shadow-lg ${FOCO}`}
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
export default function CalendarioMenu({ menu }: { menu: MenuGuardado }) {
    const [asignaciones, setAsignaciones] = useState<Asignaciones>(menu.asignaciones);
    const [arrastrando, setArrastrando] = useState<{ meal: Meal; comida: TipoComida } | null>(null);
    const [receta, setReceta] = useState<PlatoSeleccionado | null>(null);

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

    // Si el slot de destino está ocupado, los dos platos se intercambian.
    function handleDragEnd({ active, over }: DragEndEvent) {
        setArrastrando(null);
        if (!over) return;
        const origen = active.data.current?.slot as SlotId;
        const destino = over.id as SlotId;
        if (origen === destino) return;

        setAsignaciones((actuales) => {
            const siguientes = { ...actuales };
            const movido = actuales[origen];
            const desplazado = actuales[destino];
            siguientes[destino] = movido;
            if (desplazado) siguientes[origen] = desplazado;
            else delete siguientes[origen];
            return siguientes;
        });
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
                        Haz clic en un plato para ver su receta, o arrástralo a otro día para moverlo. Si el lugar
                        está ocupado, se intercambian.
                    </p>
                </div>

                <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#0B5FD0]">{menu.nombre}</p>
                    <p className={`${DISPLAY} text-xl font-extrabold text-[#0A2350]`}>
                        {RANGO.formatRange(desdeClave(menu.inicio), desdeClave(menu.fin))}
                    </p>
                </div>
            </div>

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
                                <CeldaDia key={dia.fecha} dia={dia} asignaciones={asignaciones} onAbrir={setReceta} />
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

            <ModalReceta plato={receta} onCerrar={() => setReceta(null)} />
        </section>
    );
}
