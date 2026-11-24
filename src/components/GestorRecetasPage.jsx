import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSesionVencida } from '../hooks/useSesionVencida';
import { aprobarReceta, listarRecetasGestor, rechazarReceta } from '../api/admin';
import { ALERGENOS, ENFOQUES, ESTADOS_RECETA, TIPOS_DIETA } from '../constants/recetas';

const DISPLAY = "font-['Bricolage_Grotesque',sans-serif]";

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5FD0]';

const FECHA = new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short' });

const ORIGENES = { llm: 'Generada por IA', manual: 'Subida a mano', scraping: 'Importada' };

const BOTON_NAV = `rounded-full border border-blue-100 px-6 py-2.5 font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] ${FOCO}`;
const BOTON_PRIMARIO = `rounded-full bg-[#0B5FD0] px-6 py-2.5 font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none ${FOCO}`;
const BOTON_PELIGRO = `rounded-full border border-[#F5C2BF] px-6 py-2.5 font-semibold text-[#A12A1F] transition hover:bg-[#FDECEA] disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`;
const BOTON_PELIGRO_SOLIDO = `rounded-full bg-[#C0392B] px-6 py-2.5 font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`;
const CHIP = 'rounded-full bg-[#0A2350] px-3 py-1 text-xs font-semibold text-white';
const CHIP_SUAVE = 'rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0A2350]';
const ALERTA = 'rounded-xl border border-[#F5C2BF] bg-[#FDECEA] px-4 py-3 text-sm font-medium text-[#A12A1F]';
const EXITO = 'rounded-xl border border-[#BFE3C6] bg-[#EAF7EC] px-4 py-3 text-sm font-medium text-[#1E6B34]';
const AVISO = 'rounded-xl border border-[#F2D88B] bg-[#FFF7DB] px-4 py-3 text-sm font-medium text-[#7A5B00]';

const SIN_ERROR = { id: null, texto: '' };

function etiqueta(lista, valor) {
    return lista.find((opcion) => opcion.value === valor)?.label ?? valor;
}

// El back entrega fechas UTC sin zona horaria: se les agrega la Z para no leerlas como hora local.
function formatearFecha(iso) {
    const conZona = /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`;
    return FECHA.format(new Date(conZona));
}

export default function GestorRecetasPage() {
    const { token, logout } = useAuth();
    const navigate = useNavigate();
    const manejarSesion = useSesionVencida();

    const [estado, setEstado] = useState('pendiente');
    const [recetas, setRecetas] = useState(null); // null = cargando
    const [errorCarga, setErrorCarga] = useState('');
    const [intento, setIntento] = useState(0);
    const [mensaje, setMensaje] = useState('');
    const [abiertas, setAbiertas] = useState({}); // ids con el detalle desplegado
    const [confirmando, setConfirmando] = useState(null); // receta con advertencias que se está por aprobar
    const [rechazando, setRechazando] = useState(null); // receta que se está rechazando
    const [motivo, setMotivo] = useState('');
    const [trabajando, setTrabajando] = useState(null); // receta con una acción en curso
    const [errorAccion, setErrorAccion] = useState(SIN_ERROR);

    useEffect(() => {
        let cancelado = false;
        listarRecetasGestor(token, estado)
            .then((datos) => {
                if (!cancelado) setRecetas(datos);
            })
            .catch((error) => {
                if (cancelado || manejarSesion(error)) return;
                setErrorCarga(
                    error.status === 403 ? 'Tu cuenta no tiene permisos de gestor de recetas.' : error.message,
                );
            });
        return () => {
            cancelado = true;
        };
    }, [token, estado, intento, manejarSesion]);

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    function limpiarAccion() {
        setConfirmando(null);
        setRechazando(null);
        setMotivo('');
        setErrorAccion(SIN_ERROR);
    }

    function cambiarEstado(valor) {
        if (valor === estado) return;
        setEstado(valor);
        setRecetas(null);
        setErrorCarga('');
        setMensaje('');
        setAbiertas({});
        limpiarAccion();
    }

    function reintentar() {
        setErrorCarga('');
        setRecetas(null);
        setIntento((n) => n + 1);
    }

    function alternarDetalle(id) {
        setAbiertas((actuales) => ({ ...actuales, [id]: !actuales[id] }));
    }

    // Tras aprobar o rechazar, la receta sale de la lista de pendientes.
    function quitar(receta, texto) {
        setRecetas((actuales) => actuales.filter((r) => r.id !== receta.id));
        setMensaje(texto);
        limpiarAccion();
    }

    async function aprobar(receta) {
        // Con advertencias de alérgenos se pide confirmación antes de aprobar.
        if (receta.warnings.length > 0 && confirmando !== receta.id) {
            setRechazando(null);
            setMotivo('');
            setErrorAccion(SIN_ERROR);
            setConfirmando(receta.id);
            return;
        }
        setTrabajando(receta.id);
        setErrorAccion(SIN_ERROR);
        try {
            await aprobarReceta(token, receta.id);
            quitar(receta, `Aprobamos «${receta.title}». Ya puede aparecer en los menús.`);
        } catch (error) {
            if (manejarSesion(error)) return;
            setErrorAccion({ id: receta.id, texto: error.message });
        } finally {
            setTrabajando(null);
        }
    }

    function empezarRechazo(id) {
        setConfirmando(null);
        setErrorAccion(SIN_ERROR);
        setMotivo('');
        setRechazando(id);
    }

    async function confirmarRechazo(receta) {
        setTrabajando(receta.id);
        setErrorAccion(SIN_ERROR);
        try {
            await rechazarReceta(token, receta.id, motivo.trim());
            quitar(receta, `Rechazamos «${receta.title}».`);
        } catch (error) {
            if (manejarSesion(error)) return;
            setErrorAccion({ id: receta.id, texto: error.message });
        } finally {
            setTrabajando(null);
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-white font-['DM_Sans',system-ui,sans-serif] leading-normal text-[#0F1B2D]">
            {/* ===== NAVBAR ===== */}
            <nav className="border-b border-blue-100">
                <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-5 xl:px-10">
                    <Link
                        to="/app"
                        className={`${DISPLAY} flex items-center gap-2 rounded-lg text-3xl font-extrabold tracking-tight text-[#0B5FD0] ${FOCO}`}
                    >
                        <span className="text-4xl">❇️</span> NutriCart
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link to="/app" className={BOTON_NAV}>
                            ← Volver al panel
                        </Link>
                        <button type="button" onClick={handleLogout} className={BOTON_NAV}>
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </nav>

            {/* ===== CONTENIDO ===== */}
            <main className="flex-1 bg-[#F4F7FB]">
                <div className="mx-auto w-full max-w-[1440px] px-6 py-12 xl:px-10">
                    <h1
                        className={`${DISPLAY} mb-3 text-[clamp(36px,4vw,64px)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#0A2350]`}
                    >
                        Panel de recetas
                    </h1>
                    <p className="mb-8 max-w-[720px] text-[17px] text-[#42516A]">
                        Revisa las recetas generadas por la IA o subidas por el equipo antes de que aparezcan en los
                        menús de los usuarios.
                    </p>

                    <div role="tablist" aria-label="Estado de las recetas" className="mb-6 flex flex-wrap gap-3">
                        {ESTADOS_RECETA.map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                role="tab"
                                aria-selected={estado === value}
                                onClick={() => cambiarEstado(value)}
                                className={`rounded-full border px-6 py-2.5 font-semibold transition ${FOCO} ${
                                    estado === value
                                        ? 'border-[#0B5FD0] bg-[#0B5FD0] text-white'
                                        : 'border-blue-100 bg-white text-[#0A2350] hover:border-[#0B5FD0] hover:text-[#0B5FD0]'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {mensaje && (
                        <div role="status" className={`${EXITO} mb-6`}>
                            {mensaje}
                        </div>
                    )}

                    {errorCarga && (
                        <div className="flex flex-col items-start gap-4">
                            <div role="alert" className={ALERTA}>
                                No pudimos cargar las recetas. {errorCarga}
                            </div>
                            <button type="button" onClick={reintentar} className={BOTON_NAV}>
                                Reintentar
                            </button>
                        </div>
                    )}

                    {!errorCarga && recetas === null && (
                        <p role="status" className="text-[15px] font-medium text-[#42516A]">
                            Cargando recetas…
                        </p>
                    )}

                    {!errorCarga && recetas !== null && recetas.length === 0 && (
                        <p className="rounded-[22px] bg-white p-8 text-center font-semibold text-[#42516A]">
                            No hay recetas {etiqueta(ESTADOS_RECETA, estado).toLowerCase()}.
                        </p>
                    )}

                    {!errorCarga && recetas !== null && recetas.length > 0 && (
                        <ul role="tabpanel" className="grid items-start gap-6 lg:grid-cols-2">
                            {recetas.map((receta) => (
                                <li
                                    key={receta.id}
                                    className="flex flex-col rounded-[28px] bg-white p-7 shadow-[0_16px_40px_rgba(10,35,80,0.08)]"
                                >
                                    <h2 className={`${DISPLAY} text-xl font-extrabold tracking-tight text-[#0A2350]`}>
                                        {receta.title}
                                    </h2>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className={CHIP}>{etiqueta(TIPOS_DIETA, receta.diet_type)}</span>
                                        <span className={CHIP_SUAVE}>
                                            {receta.servings} {receta.servings === 1 ? 'porción' : 'porciones'}
                                        </span>
                                        {receta.prep_time && <span className={CHIP_SUAVE}>{receta.prep_time}</span>}
                                        <span className={CHIP_SUAVE}>{ORIGENES[receta.source] ?? receta.source}</span>
                                    </div>

                                    {(receta.allergens.length > 0 || receta.diet_focus.length > 0) && (
                                        <p className="mt-3 text-sm text-[#42516A]">
                                            {receta.allergens.length > 0 && (
                                                <>
                                                    <span className="font-semibold text-[#0A2350]">Alérgenos:</span>{' '}
                                                    {receta.allergens.map((a) => etiqueta(ALERGENOS, a)).join(', ')}.{' '}
                                                </>
                                            )}
                                            {receta.diet_focus.length > 0 && (
                                                <>
                                                    <span className="font-semibold text-[#0A2350]">Enfoque:</span>{' '}
                                                    {receta.diet_focus.map((f) => etiqueta(ENFOQUES, f)).join(', ')}.
                                                </>
                                            )}
                                        </p>
                                    )}

                                    {receta.warnings.length > 0 && (
                                        <div className={`mt-4 ${AVISO}`}>
                                            <p className="font-bold">Revisa antes de aprobar:</p>
                                            <ul className="mt-1 list-disc pl-5">
                                                {receta.warnings.map((aviso) => (
                                                    <li key={aviso}>{aviso}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {receta.review_notes && (
                                        <p className="mt-4 text-sm text-[#42516A]">
                                            <span className="font-semibold text-[#0A2350]">
                                                {receta.status === 'rechazada' ? 'Motivo del rechazo:' : 'Notas de la revisión:'}
                                            </span>{' '}
                                            {receta.review_notes}
                                        </p>
                                    )}
                                    {receta.reviewed_at && receta.status !== 'pendiente' && (
                                        <p className="mt-1 text-sm text-[#42516A]">
                                            Revisada el {formatearFecha(receta.reviewed_at)}.
                                        </p>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => alternarDetalle(receta.id)}
                                        aria-expanded={Boolean(abiertas[receta.id])}
                                        className={`mt-4 w-fit rounded-md text-sm font-bold text-[#0B5FD0] hover:underline ${FOCO}`}
                                    >
                                        {abiertas[receta.id] ? 'Ocultar detalle' : 'Ver ingredientes e instrucciones'}
                                    </button>
                                    {abiertas[receta.id] && (
                                        <div className="mt-3 rounded-[22px] bg-[#F4F7FB] p-5 text-[15px] text-[#0F1B2D]">
                                            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#0B5FD0]">
                                                Ingredientes
                                            </h3>
                                            <ul className="mb-4 list-disc pl-5">
                                                {receta.ingredients.map((linea, i) => (
                                                    <li key={i}>{linea}</li>
                                                ))}
                                            </ul>
                                            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#0B5FD0]">
                                                Instrucciones
                                            </h3>
                                            <p className="whitespace-pre-line">{receta.instructions}</p>
                                        </div>
                                    )}

                                    {estado === 'pendiente' && (
                                        <div className="mt-6 flex flex-col gap-4">
                                            <div className="flex flex-wrap gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => aprobar(receta)}
                                                    disabled={trabajando === receta.id || confirmando === receta.id}
                                                    className={BOTON_PRIMARIO}
                                                >
                                                    Aprobar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => empezarRechazo(receta.id)}
                                                    disabled={trabajando === receta.id}
                                                    className={BOTON_PELIGRO}
                                                >
                                                    Rechazar
                                                </button>
                                            </div>

                                            {confirmando === receta.id && (
                                                <div
                                                    role="group"
                                                    aria-labelledby={`confirmar-${receta.id}`}
                                                    className={`${AVISO} flex flex-col gap-3`}
                                                >
                                                    <p id={`confirmar-${receta.id}`} className="font-semibold">
                                                        Esta receta tiene advertencias de alérgenos sin resolver. ¿Aprobarla
                                                        de todas formas?
                                                    </p>
                                                    <div className="flex flex-wrap gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => aprobar(receta)}
                                                            disabled={trabajando === receta.id}
                                                            className={BOTON_PRIMARIO}
                                                        >
                                                            {trabajando === receta.id ? 'Aprobando…' : 'Sí, aprobar'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={limpiarAccion}
                                                            disabled={trabajando === receta.id}
                                                            className={`${BOTON_NAV} bg-white`}
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {rechazando === receta.id && (
                                                <div className="flex flex-col gap-3 rounded-[22px] border border-[#F5C2BF] bg-[#FDECEA] p-5">
                                                    <label
                                                        htmlFor={`motivo-${receta.id}`}
                                                        className="text-sm font-semibold text-[#A12A1F]"
                                                    >
                                                        Motivo del rechazo (obligatorio)
                                                    </label>
                                                    <textarea
                                                        id={`motivo-${receta.id}`}
                                                        value={motivo}
                                                        onChange={(e) => setMotivo(e.target.value)}
                                                        rows={3}
                                                        maxLength={500}
                                                        className={`w-full rounded-xl border border-[#F5C2BF] bg-white px-4 py-3 text-base text-[#0F1B2D] focus:border-[#A12A1F] ${FOCO}`}
                                                    />
                                                    <div className="flex flex-wrap gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => confirmarRechazo(receta)}
                                                            disabled={!motivo.trim() || trabajando === receta.id}
                                                            className={BOTON_PELIGRO_SOLIDO}
                                                        >
                                                            {trabajando === receta.id ? 'Rechazando…' : 'Confirmar rechazo'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={limpiarAccion}
                                                            disabled={trabajando === receta.id}
                                                            className={`${BOTON_NAV} bg-white`}
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {errorAccion.id === receta.id && (
                                                <div role="alert" className={ALERTA}>
                                                    {errorAccion.texto}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </main>
        </div>
    );
}
