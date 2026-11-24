import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSesionVencida } from '../hooks/useSesionVencida';
import { generarRecetas } from '../api/admin';
import { ENFOQUES, TIPOS_DIETA } from '../constants/recetas';

const DISPLAY = "font-['Bricolage_Grotesque',sans-serif]";

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5FD0]';

const CAMPO = `w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-base text-[#0F1B2D] transition placeholder:text-[#8A97AB] focus:border-[#0B5FD0] ${FOCO}`;
const OPCION = 'flex cursor-pointer items-center gap-3 rounded-full border border-blue-100 bg-white px-5 py-3 font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] has-checked:border-[#0B5FD0] has-checked:bg-blue-50';
const CONTROL = `h-4 w-4 shrink-0 accent-[#0B5FD0] ${FOCO}`;
const ETIQUETA = 'mb-1.5 block text-sm font-semibold text-[#0A2350]';

const MAX_NOTAS = 300;

// Usa <dialog> nativo: showModal() bloquea el fondo, atrapa el foco y cierra con Escape.
export default function GenerarRecetasDialog({ onGenerado, onCancelar }) {
    const { token } = useAuth();
    const manejarSesion = useSesionVencida();
    const dialogRef = useRef(null);

    const [cantidad, setCantidad] = useState('2');
    const [dieta, setDieta] = useState(''); // '' = cualquiera
    const [enfoque, setEnfoque] = useState(''); // '' = cualquiera
    const [ahorro, setAhorro] = useState(true);
    const [notas, setNotas] = useState('');
    const [error, setError] = useState('');
    const [generando, setGenerando] = useState(false);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (dialog && !dialog.open) dialog.showModal();
    }, []);

    function cancelar() {
        if (generando) return;
        onCancelar();
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        setGenerando(true);
        try {
            const resultado = await generarRecetas(token, {
                count: Number(cantidad),
                diet_type: dieta || null,
                diet_focus: enfoque || null,
                prioritize_savings: ahorro,
                notes: notas.trim() || null,
            });
            onGenerado(resultado);
        } catch (e) {
            if (manejarSesion(e)) return;
            setError(e.message);
            setGenerando(false);
        }
    }

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="generar-recetas-titulo"
            onCancel={(e) => {
                e.preventDefault();
                cancelar();
            }}
            className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[560px] overflow-y-auto rounded-[28px] bg-white p-0 text-[#0F1B2D] shadow-[0_24px_60px_rgba(10,35,80,0.25)] backdrop:bg-[#0A2350]/50 backdrop:backdrop-blur-sm"
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-7 sm:p-8">
                <div>
                    <h2
                        id="generar-recetas-titulo"
                        className={`${DISPLAY} text-2xl font-extrabold tracking-tight text-[#0A2350]`}
                    >
                        Generar recetas con IA
                    </h2>
                    <p className="mt-1 text-[15px] text-[#42516A]">
                        La IA propone borradores que quedan como pendientes: tú los revisas antes de que lleguen a los
                        menús.
                    </p>
                </div>

                <fieldset disabled={generando}>
                    <legend className={ETIQUETA}>Cuántas recetas</legend>
                    <div className="flex flex-wrap gap-3">
                        {['1', '2', '3'].map((n) => (
                            <label key={n} className={OPCION}>
                                <input
                                    type="radio"
                                    name="generar-cantidad"
                                    value={n}
                                    checked={cantidad === n}
                                    onChange={() => setCantidad(n)}
                                    className={CONTROL}
                                />
                                {n}
                            </label>
                        ))}
                    </div>
                    <p className="mt-1.5 text-sm text-[#42516A]">Hasta 3 por vez, por el límite del servicio de IA.</p>
                </fieldset>

                <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                        <label htmlFor="generar-dieta" className={ETIQUETA}>
                            Tipo de dieta
                        </label>
                        <select
                            id="generar-dieta"
                            value={dieta}
                            onChange={(e) => setDieta(e.target.value)}
                            disabled={generando}
                            className={CAMPO}
                        >
                            <option value="">Cualquiera</option>
                            {TIPOS_DIETA.map(({ value, label }) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="generar-enfoque" className={ETIQUETA}>
                            Enfoque nutricional
                        </label>
                        <select
                            id="generar-enfoque"
                            value={enfoque}
                            onChange={(e) => setEnfoque(e.target.value)}
                            disabled={generando}
                            className={CAMPO}
                        >
                            <option value="">Cualquiera</option>
                            {ENFOQUES.map(({ value, label }) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <label className={`${OPCION} w-fit`}>
                    <input
                        type="checkbox"
                        checked={ahorro}
                        onChange={(e) => setAhorro(e.target.checked)}
                        disabled={generando}
                        className={CONTROL}
                    />
                    Priorizar ingredientes económicos
                </label>

                <div>
                    <label htmlFor="generar-notas" className={ETIQUETA}>
                        Indicaciones (opcional)
                    </label>
                    <textarea
                        id="generar-notas"
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        maxLength={MAX_NOTAS}
                        rows={3}
                        disabled={generando}
                        placeholder="Ej: platos chilenos de invierno"
                        className={CAMPO}
                    />
                    <p className="mt-1 text-right text-xs text-[#42516A]">
                        {notas.length}/{MAX_NOTAS}
                    </p>
                </div>

                {generando && (
                    <p
                        role="status"
                        className="rounded-xl bg-[#F4F7FB] px-4 py-3 text-sm font-medium text-[#42516A]"
                    >
                        Pidiendo recetas a la IA… puede tardar hasta un minuto. No cierres esta ventana.
                    </p>
                )}

                {error && (
                    <div
                        role="alert"
                        className="rounded-xl border border-[#F5C2BF] bg-[#FDECEA] px-4 py-3 text-sm font-medium text-[#A12A1F]"
                    >
                        {error}
                    </div>
                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={cancelar}
                        disabled={generando}
                        className={`rounded-full border border-blue-100 px-6 py-3 font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={generando}
                        className={`rounded-full bg-[#0B5FD0] px-7 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none ${FOCO}`}
                    >
                        {generando ? 'Generando…' : error ? 'Reintentar' : 'Generar recetas'}
                    </button>
                </div>
            </form>
        </dialog>
    );
}
