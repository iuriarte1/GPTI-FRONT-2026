import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

const DISPLAY = "font-['Bricolage_Grotesque',sans-serif]";

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5FD0]';

const TARJETA = 'rounded-[28px] bg-white p-8 shadow-[0_16px_40px_rgba(10,35,80,0.08)] sm:p-10';
const TITULO_TARJETA = `${DISPLAY} mb-6 flex items-center gap-3 text-2xl font-extrabold tracking-tight text-[#0A2350]`;
const ETIQUETA = 'mb-1.5 block text-sm font-semibold text-[#0A2350]';
const LEYENDA = 'mb-3 text-sm font-semibold text-[#0A2350]';
const AYUDA = 'mt-1.5 text-sm text-[#42516A]';
const ERROR = 'mt-1.5 text-sm text-[#C0392B]';
const INPUT = `w-full rounded-xl border bg-white px-4 py-3 text-base text-[#0F1B2D] transition placeholder:text-[#8A97AB] focus:border-[#0B5FD0] ${FOCO}`;
const CHIP_OPCION = 'flex cursor-pointer items-center gap-3 rounded-full border border-blue-100 bg-white px-5 py-3 font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] has-checked:border-[#0B5FD0] has-checked:bg-blue-50';
const CARD_OPCION = 'flex h-full cursor-pointer items-start gap-3 rounded-2xl border border-blue-100 bg-white p-4 text-[#0A2350] transition hover:border-[#0B5FD0] has-checked:border-[#0B5FD0] has-checked:bg-blue-50 has-checked:shadow-sm';
const CONTROL = `h-4 w-4 shrink-0 accent-[#0B5FD0] ${FOCO}`;
const ALERTA = 'rounded-xl border border-[#F5C2BF] bg-[#FDECEA] px-4 py-3 text-sm font-medium text-[#A12A1F]';
const EXITO = 'rounded-xl border border-[#BFE3C6] bg-[#EAF7EC] px-4 py-3 text-sm font-medium text-[#1E6B34]';

// ----- Opciones (value = lo que viaja al backend, label = lo que ve el usuario) -----

type Comida = 'almuerzo' | 'cena';
type EnfoqueDieta = 'balanceada' | 'alta_proteina' | 'baja_carbohidratos' | 'baja_grasas';
type FrecuenciaCocina = 'diaria' | 'dias_por_medio' | 'meal_prep';
type ToleranciaSobras = 'sin_problema' | 'un_dia' | 'nada';

interface Opcion<T extends string> {
    value: T;
    label: string;
    detalle?: string;
}

const COMIDAS: Opcion<Comida>[] = [
    { value: 'almuerzo', label: 'Almuerzo' },
    { value: 'cena', label: 'Cena' },
];

const ENFOQUES: Opcion<EnfoqueDieta>[] = [
    { value: 'balanceada', label: 'Balanceada', detalle: 'Un poco de todo, en proporciones equilibradas.' },
    { value: 'alta_proteina', label: 'Alta en proteína', detalle: 'Más carnes, legumbres, huevos y lácteos.' },
    { value: 'baja_carbohidratos', label: 'Baja en carbohidratos', detalle: 'Menos pan, arroz, pasta y papas.' },
    { value: 'baja_grasas', label: 'Baja en grasas', detalle: 'Preparaciones más livianas, menos frituras.' },
];

const FRECUENCIAS: Opcion<FrecuenciaCocina>[] = [
    { value: 'diaria', label: 'Todos los días' },
    { value: 'dias_por_medio', label: 'Días por medio' },
    { value: 'meal_prep', label: '1 vez a la semana / Meal Prep' },
];

const TOLERANCIAS: Opcion<ToleranciaSobras>[] = [
    { value: 'sin_problema', label: 'Ningún problema, ahorro tiempo' },
    { value: 'un_dia', label: 'Solo 1 día después' },
    { value: 'nada', label: 'No me gusta, prefiero todo fresco' },
];

const DIAS_MIN = 1;
const DIAS_MAX = 14;

// ----- Componentes de apoyo -----

function Seccion({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
    const id = `seccion-${numero}`;
    return (
        <section aria-labelledby={id} className={TARJETA}>
            <h2 id={id} className={TITULO_TARJETA}>
                <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B5FD0] text-base text-white"
                >
                    {numero}
                </span>
                {titulo}
            </h2>
            <div className="flex flex-col gap-7">{children}</div>
        </section>
    );
}

interface GrupoRadioProps<T extends string> {
    nombre: string;
    leyenda: string;
    opciones: Opcion<T>[];
    valor: T;
    onChange: (valor: T) => void;
}

// Radio buttons con forma de tarjeta (si la opción trae detalle) o de chip.
function GrupoRadio<T extends string>({ nombre, leyenda, opciones, valor, onChange }: GrupoRadioProps<T>) {
    const conDetalle = opciones.some((o) => o.detalle);
    return (
        <fieldset>
            <legend className={LEYENDA}>{leyenda}</legend>
            <div className={conDetalle ? 'grid gap-3 sm:grid-cols-2' : 'flex flex-wrap gap-3'}>
                {opciones.map(({ value, label, detalle }) => (
                    <label key={value} className={conDetalle ? CARD_OPCION : CHIP_OPCION}>
                        <input
                            type="radio"
                            name={nombre}
                            value={value}
                            checked={valor === value}
                            onChange={() => onChange(value)}
                            className={`${CONTROL} ${conDetalle ? 'mt-1' : ''}`}
                        />
                        {detalle ? (
                            <span>
                                <span className="block font-semibold">{label}</span>
                                <span className="mt-0.5 block text-sm text-[#42516A]">{detalle}</span>
                            </span>
                        ) : (
                            label
                        )}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

// ----- Validación -----

type CampoNumerico = 'comensales' | 'dias' | 'comidasFuera' | 'comidas';
type Errores = Partial<Record<CampoNumerico, string>>;

function entero(texto: string): number | null {
    return /^\d+$/.test(texto.trim()) ? Number(texto.trim()) : null;
}

// ----- Vista -----

export default function ConfigMenuPage() {
    // Sección 1: logística
    const [comensales, setComensales] = useState('2');
    const [dias, setDias] = useState(7);
    const [comidas, setComidas] = useState<Comida[]>(['almuerzo', 'cena']);
    const [comidasFuera, setComidasFuera] = useState('0');

    // Sección 2: nutrición
    const [enfoque, setEnfoque] = useState<EnfoqueDieta>('balanceada');
    const [excluidos, setExcluidos] = useState<string[]>([]);
    const [ingrediente, setIngrediente] = useState('');

    // Sección 3: cocina
    const [frecuencia, setFrecuencia] = useState<FrecuenciaCocina>('diaria');
    const [sobras, setSobras] = useState<ToleranciaSobras>('un_dia');

    const [errores, setErrores] = useState<Errores>({});
    const [pendiente, setPendiente] = useState<GenerarMenuPayload | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState(false);

    const totalComidas = dias * comidas.length;

    function toggleComida(valor: Comida) {
        setComidas((actuales) =>
            actuales.includes(valor) ? actuales.filter((c) => c !== valor) : [...actuales, valor],
        );
    }

    // ----- Tag input de ingredientes excluidos -----

    function agregarIngrediente() {
        const limpio = ingrediente.trim().replace(/\s+/g, ' ').toLowerCase();
        if (limpio && !excluidos.includes(limpio)) setExcluidos((actuales) => [...actuales, limpio]);
        setIngrediente('');
    }

    function quitarIngrediente(valor: string) {
        setExcluidos((actuales) => actuales.filter((i) => i !== valor));
    }

    function handleTeclaIngrediente(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter' || event.key === ',') {
            // Evita que Enter envíe el formulario.
            event.preventDefault();
            agregarIngrediente();
        } else if (event.key === 'Backspace' && ingrediente === '' && excluidos.length > 0) {
            setExcluidos((actuales) => actuales.slice(0, -1));
        }
    }

    // ----- Envío -----

    function validar(): Errores {
        const nuevos: Errores = {};
        const nComensales = entero(comensales);
        const nFuera = entero(comidasFuera);

        if (nComensales === null || nComensales < 1) nuevos.comensales = 'Ingresa un número entero mayor o igual a 1.';
        if (dias < DIAS_MIN || dias > DIAS_MAX) nuevos.dias = `Elige entre ${DIAS_MIN} y ${DIAS_MAX} días.`;
        if (comidas.length === 0) nuevos.comidas = 'Elige al menos una comida.';
        if (nFuera === null) nuevos.comidasFuera = 'Ingresa un número entero (0 si comes todo en casa).';
        else if (comidas.length > 0 && nFuera >= totalComidas)
            nuevos.comidasFuera = `Debe ser menor al total de comidas del menú (${totalComidas}).`;
        return nuevos;
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setEnviado(false);

        const nuevos = validar();
        setErrores(nuevos);
        if (Object.keys(nuevos).length > 0) return;

        const payload: GenerarMenuPayload = {
            logistics: {
                diners: Number(comensales),
                days: dias,
                meals: comidas,
                meals_out: Number(comidasFuera),
            },
            nutrition: {
                diet_focus: enfoque,
                excluded_ingredients: excluidos,
            },
            cooking: {
                cooking_frequency: frecuencia,
                leftovers_tolerance: sobras,
            },
        };

        // No se envía todavía: primero se muestra el resumen para confirmar.
        setPendiente(payload);
    }

    function cerrarResumen() {
        setPendiente(null);
    }

    async function confirmarEnvio() {
        if (!pendiente) return;
        setEnviando(true);

        console.log(pendiente);
        setEnviado(true);
        setEnviando(false);
        setPendiente(null);

        // TODO: conectar con el backend cuando exista el endpoint (y manejar el error dentro del modal).
        // Usar el helper del proyecto, que agrega la URL base, el token y el manejo de errores:
        //
        //   import { request } from '../api/client';
        //   import { useAuth } from '../context/AuthContext';
        //   const { token } = useAuth();
        //
        //   const menu = await request('/api/generar-menu', { method: 'POST', token, body: pendiente });
        //
        // O directamente con fetch:
        //
        //   const response = await fetch(`${import.meta.env.VITE_API_URL}/api/generar-menu`, {
        //       method: 'POST',
        //       headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        //       body: JSON.stringify(pendiente),
        //   });
        //   if (!response.ok) throw new Error('No pudimos generar el menú.');
        //   const menu = await response.json();
    }

    const hayErrores = Object.keys(errores).length > 0;

    return (
        <div className="flex min-h-screen flex-col bg-white font-['DM_Sans',system-ui,sans-serif] leading-normal text-[#0F1B2D]">
            {/* ===== NAVBAR ===== */}
            <nav className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-blue-100 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-5 xl:px-10">
                    <Link
                        to="/app"
                        className={`${DISPLAY} flex items-center gap-2 rounded-lg text-3xl font-extrabold tracking-tight text-[#0B5FD0] ${FOCO}`}
                    >
                        <span className="text-4xl">❇️</span> NutriCart
                    </Link>
                    <Link
                        to="/app"
                        className={`rounded-full border border-blue-100 px-6 py-2.5 font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] ${FOCO}`}
                    >
                        ← Volver al panel
                    </Link>
                </div>
            </nav>

            {/* ===== CONTENIDO ===== */}
            <main className="flex-1 bg-[#F4F7FB]">
                <form onSubmit={handleSubmit} noValidate>
                    <div className="mx-auto w-full max-w-[960px] px-6 pt-12 pb-8 xl:px-10">
                        <h1
                            className={`${DISPLAY} mb-3 text-[clamp(36px,4vw,64px)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#0A2350]`}
                        >
                            Configura tu menú
                        </h1>
                        <p className="mb-8 max-w-[640px] text-[17px] text-[#42516A]">
                            Cuéntanos cómo comes y cómo compras. Con esto armamos tu menú y la lista de compras en
                            Lider.
                        </p>

                        <div className="flex flex-col gap-6">
                            {/* ----- Sección 1 ----- */}
                            <Seccion numero={1} titulo="Logística de planificación">
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="comensales" className={ETIQUETA}>
                                            Número de comensales
                                        </label>
                                        <input
                                            id="comensales"
                                            type="number"
                                            inputMode="numeric"
                                            min={1}
                                            step={1}
                                            value={comensales}
                                            onChange={(e) => setComensales(e.target.value)}
                                            aria-invalid={errores.comensales ? 'true' : 'false'}
                                            aria-describedby={errores.comensales ? 'comensales-error' : undefined}
                                            className={`${INPUT} ${errores.comensales ? 'border-[#D9534F]' : 'border-blue-100'}`}
                                        />
                                        {errores.comensales && (
                                            <p id="comensales-error" className={ERROR}>
                                                {errores.comensales}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="dias" className={ETIQUETA}>
                                            Duración del menú:{' '}
                                            <span className="text-[#0B5FD0]">
                                                {dias} {dias === 1 ? 'día' : 'días'}
                                            </span>
                                        </label>
                                        <input
                                            id="dias"
                                            type="range"
                                            min={DIAS_MIN}
                                            max={DIAS_MAX}
                                            step={1}
                                            value={dias}
                                            onChange={(e) => setDias(Number(e.target.value))}
                                            aria-valuetext={`${dias} ${dias === 1 ? 'día' : 'días'}`}
                                            className={`mt-3 w-full cursor-pointer accent-[#0B5FD0] ${FOCO}`}
                                        />
                                        <div aria-hidden="true" className="mt-1 flex justify-between text-xs text-[#8A97AB]">
                                            <span>{DIAS_MIN}</span>
                                            <span>{DIAS_MAX}</span>
                                        </div>
                                    </div>
                                </div>

                                <fieldset aria-describedby={errores.comidas ? 'comidas-error' : undefined}>
                                    <legend className={LEYENDA}>Comidas a incluir</legend>
                                    <div className="flex flex-wrap gap-3">
                                        {COMIDAS.map(({ value, label }) => (
                                            <label key={value} className={CHIP_OPCION}>
                                                <input
                                                    type="checkbox"
                                                    value={value}
                                                    checked={comidas.includes(value)}
                                                    onChange={() => toggleComida(value)}
                                                    className={CONTROL}
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                    {errores.comidas && (
                                        <p id="comidas-error" className={ERROR}>
                                            {errores.comidas}
                                        </p>
                                    )}
                                </fieldset>

                                <div className="sm:max-w-[50%]">
                                    <label htmlFor="comidas-fuera" className={ETIQUETA}>
                                        Comidas fuera de casa
                                    </label>
                                    <input
                                        id="comidas-fuera"
                                        type="number"
                                        inputMode="numeric"
                                        min={0}
                                        step={1}
                                        value={comidasFuera}
                                        onChange={(e) => setComidasFuera(e.target.value)}
                                        aria-invalid={errores.comidasFuera ? 'true' : 'false'}
                                        aria-describedby={errores.comidasFuera ? 'comidas-fuera-error' : 'comidas-fuera-ayuda'}
                                        className={`${INPUT} ${errores.comidasFuera ? 'border-[#D9534F]' : 'border-blue-100'}`}
                                    />
                                    {errores.comidasFuera ? (
                                        <p id="comidas-fuera-error" className={ERROR}>
                                            {errores.comidasFuera}
                                        </p>
                                    ) : (
                                        <p id="comidas-fuera-ayuda" className={AYUDA}>
                                            De las {totalComidas} comidas del menú, cuántas no harás en casa.
                                        </p>
                                    )}
                                </div>
                            </Seccion>

                            {/* ----- Sección 2 ----- */}
                            <Seccion numero={2} titulo="Perfil nutricional y gustos">
                                <GrupoRadio
                                    nombre="enfoque"
                                    leyenda="Enfoque de dieta"
                                    opciones={ENFOQUES}
                                    valor={enfoque}
                                    onChange={setEnfoque}
                                />

                                <div>
                                    <label htmlFor="ingrediente" className={ETIQUETA}>
                                        Ingredientes excluidos
                                    </label>
                                    <div
                                        className={`flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 transition focus-within:border-[#0B5FD0]`}
                                    >
                                        {excluidos.map((item) => (
                                            <span
                                                key={item}
                                                className="flex items-center gap-1 rounded-full bg-[#0A2350] py-1 pr-1 pl-3 text-sm font-semibold text-white"
                                            >
                                                {item}
                                                <button
                                                    type="button"
                                                    onClick={() => quitarIngrediente(item)}
                                                    aria-label={`Quitar ${item}`}
                                                    className={`flex h-6 w-6 items-center justify-center rounded-full text-base leading-none transition hover:bg-white/20 ${FOCO}`}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            id="ingrediente"
                                            type="text"
                                            autoComplete="off"
                                            value={ingrediente}
                                            onChange={(e) => setIngrediente(e.target.value)}
                                            onKeyDown={handleTeclaIngrediente}
                                            onBlur={agregarIngrediente}
                                            aria-describedby="ingrediente-ayuda"
                                            placeholder={excluidos.length === 0 ? 'Ej: cebolla' : ''}
                                            className="min-w-[140px] flex-1 border-0 bg-transparent px-1 py-1.5 text-base text-[#0F1B2D] outline-none placeholder:text-[#8A97AB]"
                                        />
                                    </div>
                                    <p id="ingrediente-ayuda" className={AYUDA}>
                                        Escribe un ingrediente y presiona Enter. No aparecerá en ninguna receta.
                                    </p>
                                </div>
                            </Seccion>

                            {/* ----- Sección 3 ----- */}
                            <Seccion numero={3} titulo="Hábitos de cocina y sobras">
                                <GrupoRadio
                                    nombre="frecuencia"
                                    leyenda="Disponibilidad para cocinar"
                                    opciones={FRECUENCIAS}
                                    valor={frecuencia}
                                    onChange={setFrecuencia}
                                />
                                <GrupoRadio
                                    nombre="sobras"
                                    leyenda="Tolerancia a comer sobras"
                                    opciones={TOLERANCIAS}
                                    valor={sobras}
                                    onChange={setSobras}
                                />
                            </Seccion>
                        </div>
                    </div>

                    {/* ===== BARRA DE ENVÍO ===== */}
                    <div className="sticky bottom-0 border-t border-blue-100 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur">
                        <div className="mx-auto flex w-full max-w-[960px] flex-wrap items-center justify-end gap-4 px-6 py-4 xl:px-10">
                            {hayErrores && (
                                <div role="alert" className={`${ALERTA} mr-auto`}>
                                    Revisa los campos marcados.
                                </div>
                            )}
                            {enviado && !hayErrores && (
                                <div role="status" className={`${EXITO} mr-auto`}>
                                    Enviamos tu configuración (revisa el payload en la consola).
                                </div>
                            )}
                            <button
                                type="submit"
                                className={`w-full rounded-full bg-[#0B5FD0] px-7 py-4 text-[17px] font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg sm:w-auto ${FOCO}`}
                            >
                                Generar menú
                            </button>
                        </div>
                    </div>
                </form>
            </main>

            <ModalResumen
                payload={pendiente}
                enviando={enviando}
                onCancelar={cerrarResumen}
                onConfirmar={confirmarEnvio}
            />
        </div>
    );
}

// ----- Modal de confirmación -----

function etiqueta<T extends string>(opciones: Opcion<T>[], valor: T): string {
    return opciones.find((o) => o.value === valor)?.label ?? valor;
}

function plural(n: number, singular: string, varias: string): string {
    return `${n} ${n === 1 ? singular : varias}`;
}

interface ModalResumenProps {
    payload: GenerarMenuPayload | null;
    enviando: boolean;
    onCancelar: () => void;
    onConfirmar: () => void;
}

// Usa <dialog> nativo: showModal() bloquea el fondo, atrapa el foco y cierra con Escape.
function ModalResumen({ payload, enviando, onCancelar, onConfirmar }: ModalResumenProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (payload && !dialog.open) dialog.showModal();
        else if (!payload && dialog.open) dialog.close();
    }, [payload]);

    const filas: { titulo: string; items: [string, ReactNode][] }[] = payload
        ? [
            {
                titulo: 'Logística',
                items: [
                    ['Comensales', payload.logistics.diners],
                    ['Duración', plural(payload.logistics.days, 'día', 'días')],
                    ['Comidas', payload.logistics.meals.map((m) => etiqueta(COMIDAS, m)).join(' y ')],
                    ['Fuera de casa', plural(payload.logistics.meals_out, 'comida', 'comidas')],
                ],
            },
            {
                titulo: 'Nutrición',
                items: [
                    ['Enfoque', etiqueta(ENFOQUES, payload.nutrition.diet_focus)],
                    [
                        'Excluidos',
                        payload.nutrition.excluded_ingredients.length > 0
                            ? payload.nutrition.excluded_ingredients.join(', ')
                            : 'Ninguno',
                    ],
                ],
            },
            {
                titulo: 'Cocina',
                items: [
                    ['Cocinar', etiqueta(FRECUENCIAS, payload.cooking.cooking_frequency)],
                    ['Sobras', etiqueta(TOLERANCIAS, payload.cooking.leftovers_tolerance)],
                ],
            },
        ]
        : [];

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="resumen-titulo"
            onCancel={(e) => {
                // Escape: se cierra controlando el estado, no el <dialog> por su cuenta.
                e.preventDefault();
                if (!enviando) onCancelar();
            }}
            className="m-auto w-[calc(100%-32px)] max-w-[560px] rounded-[28px] bg-white p-0 text-[#0F1B2D] shadow-[0_24px_60px_rgba(10,35,80,0.25)] backdrop:bg-[#0A2350]/50 backdrop:backdrop-blur-sm"
        >
            <div className="flex max-h-[85vh] flex-col">
                <div className="px-7 pt-7 sm:px-8 sm:pt-8">
                    <h2 id="resumen-titulo" className={`${DISPLAY} text-2xl font-extrabold tracking-tight text-[#0A2350]`}>
                        Revisa tu configuración
                    </h2>
                    <p className="mt-1 text-[15px] text-[#42516A]">
                        Si todo está bien, confirmamos y generamos tu menú.
                    </p>
                </div>

                <div className="flex flex-col gap-5 overflow-y-auto px-7 py-6 sm:px-8">
                    {filas.map(({ titulo, items }) => (
                        <div key={titulo}>
                            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#0B5FD0]">{titulo}</h3>
                            <dl className="divide-y divide-blue-50 rounded-2xl bg-[#F4F7FB] px-4">
                                {items.map(([nombre, valor]) => (
                                    <div key={nombre} className="flex justify-between gap-4 py-2.5 text-[15px]">
                                        <dt className="text-[#42516A]">{nombre}</dt>
                                        <dd className="text-right font-semibold text-[#0A2350]">{valor}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-blue-100 px-7 py-5 sm:flex-row sm:justify-end sm:px-8">
                    <button
                        type="button"
                        onClick={onCancelar}
                        disabled={enviando}
                        className={`rounded-full border border-blue-100 px-6 py-3 font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`}
                    >
                        Editar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirmar}
                        disabled={enviando}
                        autoFocus
                        className={`rounded-full bg-[#0B5FD0] px-7 py-3 font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`}
                    >
                        {enviando ? 'Enviando…' : 'Confirmar y generar'}
                    </button>
                </div>
            </div>
        </dialog>
    );
}

/*
 * ============================================================================
 *  PAYLOAD ENVIADO AL BACKEND — POST /api/generar-menu
 * ============================================================================
 *
 *  Convención: claves en inglés snake_case y valores enumerados en español
 *  snake_case, igual que el resto de la API (ej: diet_type: 'con_carne').
 *
 *  interface GenerarMenuPayload {
 *      logistics: {
 *          diners: number;                 // Comensales, entero >= 1
 *          days: number;                   // Duración del menú, entero entre 1 y 14
 *          meals: ('almuerzo' | 'cena')[]; // Al menos una comida
 *          meals_out: number;              // Comidas fuera de casa, entero >= 0 y < days * meals.length
 *      };
 *      nutrition: {
 *          diet_focus: 'balanceada' | 'alta_proteina' | 'baja_carbohidratos' | 'baja_grasas';
 *          excluded_ingredients: string[]; // En minúsculas, sin repetidos (puede ir vacío)
 *      };
 *      cooking: {
 *          cooking_frequency: 'diaria' | 'dias_por_medio' | 'meal_prep';
 *          leftovers_tolerance: 'sin_problema' | 'un_dia' | 'nada';
 *      };
 *  }
 *
 *  Ejemplo:
 *
 *  {
 *      "logistics": {
 *          "diners": 2,
 *          "days": 7,
 *          "meals": ["almuerzo", "cena"],
 *          "meals_out": 3
 *      },
 *      "nutrition": {
 *          "diet_focus": "alta_proteina",
 *          "excluded_ingredients": ["cebolla", "cilantro"]
 *      },
 *      "cooking": {
 *          "cooking_frequency": "dias_por_medio",
 *          "leftovers_tolerance": "un_dia"
 *      }
 *  }
 *
 *  Significado de los valores:
 *      diet_focus           balanceada = Balanceada · alta_proteina = Alta en proteína
 *                           baja_carbohidratos = Baja en carbohidratos · baja_grasas = Baja en grasas
 *      cooking_frequency    diaria = Todos los días · dias_por_medio = Días por medio
 *                           meal_prep = 1 vez a la semana / Meal Prep
 *      leftovers_tolerance  sin_problema = Ningún problema, ahorro tiempo
 *                           un_dia = Solo 1 día después · nada = Prefiero todo fresco
 * ============================================================================
 */
export interface GenerarMenuPayload {
    logistics: {
        diners: number;
        days: number;
        meals: Comida[];
        meals_out: number;
    };
    nutrition: {
        diet_focus: EnfoqueDieta;
        excluded_ingredients: string[];
    };
    cooking: {
        cooking_frequency: FrecuenciaCocina;
        leftovers_tolerance: ToleranciaSobras;
    };
}
