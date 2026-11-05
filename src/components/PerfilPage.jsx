import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deleteDietaryProfile, getDietaryProfile, saveDietaryProfile, savePreferences } from '../api/user';
import { DIETAS, INTENCIONES, RESTRICCIONES } from '../constants/restricciones';

const DISPLAY = "font-['Bricolage_Grotesque',sans-serif]";

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5FD0]';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const FECHA = new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short' });

const PERFIL_VACIO = { diet_type: 'con_carne', allergies: [], consent_at: null, updated_at: null };

const TARJETA = 'rounded-[28px] bg-white p-8 shadow-[0_16px_40px_rgba(10,35,80,0.08)] sm:p-10';
const TITULO_TARJETA = `${DISPLAY} mb-6 text-2xl font-extrabold tracking-tight text-[#0A2350]`;
const BOTON_NAV = `rounded-full border border-blue-100 px-6 py-2.5 font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] ${FOCO}`;
const BOTON_PRIMARIO = `w-full rounded-full bg-[#0B5FD0] px-7 py-4 text-[17px] font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none sm:w-auto ${FOCO}`;
const OPCION = 'flex cursor-pointer items-center gap-3 rounded-full border border-blue-100 bg-white px-5 py-3 font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] has-checked:border-[#0B5FD0] has-checked:bg-blue-50';
const CONTROL = `h-4 w-4 shrink-0 accent-[#0B5FD0] ${FOCO}`;
const CHIP = 'rounded-full bg-[#0A2350] px-4 py-1.5 text-sm font-semibold text-white';
const ALERTA = 'rounded-xl border border-[#F5C2BF] bg-[#FDECEA] px-4 py-3 text-sm font-medium text-[#A12A1F]';
const EXITO = 'rounded-xl border border-[#BFE3C6] bg-[#EAF7EC] px-4 py-3 text-sm font-medium text-[#1E6B34]';

function intencionInicial(valor) {
    return INTENCIONES.some((i) => i.value === valor) ? valor : 'balance';
}

function etiqueta(lista, valor) {
    return lista.find((opcion) => opcion.value === valor)?.label ?? valor;
}

// El back entrega fechas UTC sin zona horaria: se les agrega la Z para no leerlas como hora local.
function formatearFecha(iso) {
    const conZona = /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`;
    return FECHA.format(new Date(conZona));
}

// Precarga el formulario solo si el perfil tiene consentimiento registrado.
function formularioDesde(perfil) {
    if (!perfil.consent_at) return { dieta: 'con_carne', alergias: [] };
    return { dieta: perfil.diet_type, alergias: perfil.allergies };
}

export default function PerfilPage() {
    const { token, user, logout, updateUser } = useAuth();
    const navigate = useNavigate();

    const [sesionVencida, setSesionVencida] = useState(false);

    // ----- Preferencias -----
    const [intencion, setIntencion] = useState(() => intencionInicial(user?.dietary_preference));
    const [presupuesto, setPresupuesto] = useState(() =>
        user?.budget_limit !== null && user?.budget_limit !== undefined ? String(user.budget_limit) : '',
    );
    const [errorPresupuesto, setErrorPresupuesto] = useState('');
    const [errorPref, setErrorPref] = useState('');
    const [exitoPref, setExitoPref] = useState('');
    const [guardandoPref, setGuardandoPref] = useState(false);

    // ----- Restricciones -----
    const [perfil, setPerfil] = useState(null);
    const [cargandoPerfil, setCargandoPerfil] = useState(true);
    const [errorCarga, setErrorCarga] = useState('');
    const [intento, setIntento] = useState(0);
    const [dieta, setDieta] = useState('con_carne');
    const [alergias, setAlergias] = useState([]);
    const [consentimiento, setConsentimiento] = useState(false);
    const [errorRestr, setErrorRestr] = useState('');
    const [exitoRestr, setExitoRestr] = useState('');
    const [guardandoRestr, setGuardandoRestr] = useState(false);
    const [confirmando, setConfirmando] = useState(false);
    const [eliminando, setEliminando] = useState(false);

    const botonEliminarRef = useRef(null);
    const cancelarRef = useRef(null);
    const tituloRestrRef = useRef(null);
    const devolverFoco = useRef(null);

    useEffect(() => {
        let cancelado = false;
        getDietaryProfile(token)
            .then((datos) => {
                if (cancelado) return;
                const { dieta: d, alergias: a } = formularioDesde(datos);
                setPerfil(datos);
                setDieta(d);
                setAlergias(a);
                setCargandoPerfil(false);
            })
            .catch((error) => {
                if (cancelado) return;
                if (error.status === 401) {
                    setSesionVencida(true);
                    return;
                }
                setErrorCarga(error.message);
                setCargandoPerfil(false);
            });
        return () => {
            cancelado = true;
        };
    }, [token, intento]);

    // Token vencido: se cierra la sesión y se vuelve al login.
    useEffect(() => {
        if (!sesionVencida) return;
        logout();
        navigate('/login', { replace: true });
    }, [sesionVencida, logout, navigate]);

    // Mueve el foco al abrir o cerrar la confirmación de eliminar.
    useEffect(() => {
        if (confirmando) {
            cancelarRef.current?.focus();
        } else if (devolverFoco.current) {
            devolverFoco.current.current?.focus();
            devolverFoco.current = null;
        }
    }, [confirmando]);

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    function reintentarCarga() {
        setErrorCarga('');
        setCargandoPerfil(true);
        setIntento((n) => n + 1);
    }

    async function handleGuardarPreferencias(event) {
        event.preventDefault();
        setErrorPref('');
        setExitoPref('');

        const limpio = presupuesto.replace(/[$.\s]/g, '');
        let budget_limit = null;
        if (limpio !== '') {
            if (!/^\d+$/.test(limpio) || Number(limpio) <= 0) {
                setErrorPresupuesto('Ingresa un monto en pesos, entero y mayor a 0.');
                return;
            }
            budget_limit = Number(limpio);
        }
        setErrorPresupuesto('');

        setGuardandoPref(true);
        try {
            const { data } = await savePreferences(token, { intent: intencion, budget_limit });
            // El back conserva el presupuesto anterior si se envía null: se usa lo que responde.
            updateUser({ dietary_preference: data.intent, budget_limit: data.budget_limit });
            setPresupuesto(data.budget_limit !== null && data.budget_limit !== undefined ? String(data.budget_limit) : '');
            setExitoPref('Guardamos tus preferencias.');
        } catch (error) {
            if (error.status === 401) setSesionVencida(true);
            else setErrorPref(error.message);
        } finally {
            setGuardandoPref(false);
        }
    }

    function toggleAlergia(valor) {
        setAlergias((actuales) =>
            actuales.includes(valor) ? actuales.filter((a) => a !== valor) : [...actuales, valor],
        );
    }

    async function handleGuardarRestricciones(event) {
        event.preventDefault();
        setErrorRestr('');
        setExitoRestr('');
        if (!consentimiento) return;

        setGuardandoRestr(true);
        try {
            const guardado = await saveDietaryProfile(token, { diet_type: dieta, allergies: alergias, consent: true });
            const { dieta: d, alergias: a } = formularioDesde(guardado);
            setPerfil(guardado);
            setDieta(d);
            setAlergias(a);
            setConsentimiento(false);
            setExitoRestr('Guardamos tus restricciones alimentarias.');
        } catch (error) {
            if (error.status === 401) setSesionVencida(true);
            else setErrorRestr(error.message);
        } finally {
            setGuardandoRestr(false);
        }
    }

    function cancelarEliminar() {
        devolverFoco.current = botonEliminarRef;
        setConfirmando(false);
    }

    async function confirmarEliminar() {
        setErrorRestr('');
        setExitoRestr('');
        setEliminando(true);
        try {
            await deleteDietaryProfile(token);
            setPerfil(PERFIL_VACIO);
            setDieta('con_carne');
            setAlergias([]);
            setConsentimiento(false);
            setExitoRestr('Eliminamos tus restricciones alimentarias.');
            devolverFoco.current = tituloRestrRef;
        } catch (error) {
            if (error.status === 401) {
                setSesionVencida(true);
                return;
            }
            setErrorRestr(error.message);
            devolverFoco.current = botonEliminarRef;
        } finally {
            setEliminando(false);
            setConfirmando(false);
        }
    }

    const tienePerfil = Boolean(perfil?.updated_at);
    const consentido = Boolean(perfil?.consent_at);
    const tienePresupuestoGuardado = user?.budget_limit !== null && user?.budget_limit !== undefined;

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
                        className={`${DISPLAY} mb-8 text-[clamp(36px,4vw,64px)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#0A2350]`}
                    >
                        Mi perfil
                    </h1>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* ----- Datos de la cuenta ----- */}
                        <section aria-labelledby="titulo-cuenta" className={TARJETA}>
                            <h2 id="titulo-cuenta" className={TITULO_TARJETA}>
                                Datos de la cuenta
                            </h2>
                            <dl className="flex flex-col gap-5">
                                <div>
                                    <dt className="text-xs font-bold uppercase tracking-wide text-[#0B5FD0]">Nombre</dt>
                                    <dd className="mt-1 text-lg font-semibold text-[#0A2350]">{user?.full_name}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-bold uppercase tracking-wide text-[#0B5FD0]">
                                        Correo electrónico
                                    </dt>
                                    <dd className="mt-1 text-lg font-semibold break-all text-[#0A2350]">{user?.email}</dd>
                                </div>
                            </dl>
                        </section>

                        {/* ----- Preferencias ----- */}
                        <section aria-labelledby="titulo-preferencias" className={TARJETA}>
                            <h2 id="titulo-preferencias" className={TITULO_TARJETA}>
                                Preferencias
                            </h2>
                            <form onSubmit={handleGuardarPreferencias} noValidate className="flex flex-col gap-6">
                                <fieldset>
                                    <legend className="mb-3 text-sm font-semibold text-[#0A2350]">
                                        ¿Qué priorizas en tu semana?
                                    </legend>
                                    <div className="flex flex-wrap gap-3">
                                        {INTENCIONES.map(({ value, label }) => (
                                            <label key={value} className={OPCION}>
                                                <input
                                                    type="radio"
                                                    name="intencion"
                                                    value={value}
                                                    checked={intencion === value}
                                                    onChange={() => setIntencion(value)}
                                                    className={CONTROL}
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>

                                <div>
                                    <label htmlFor="presupuesto" className="mb-1.5 block text-sm font-semibold text-[#0A2350]">
                                        Presupuesto semanal (CLP)
                                    </label>
                                    <input
                                        id="presupuesto"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        value={presupuesto}
                                        onChange={(e) => setPresupuesto(e.target.value)}
                                        aria-invalid={errorPresupuesto ? 'true' : 'false'}
                                        aria-describedby={errorPresupuesto ? 'presupuesto-error' : 'presupuesto-ayuda'}
                                        placeholder="Ej: 50000"
                                        className={`w-full rounded-xl border bg-white px-4 py-3 text-base text-[#0F1B2D] transition placeholder:text-[#8A97AB] focus:border-[#0B5FD0] ${FOCO} ${errorPresupuesto ? 'border-[#D9534F]' : 'border-blue-100'}`}
                                    />
                                    {errorPresupuesto ? (
                                        <p id="presupuesto-error" className="mt-1.5 text-sm text-[#C0392B]">
                                            {errorPresupuesto}
                                        </p>
                                    ) : (
                                        <p id="presupuesto-ayuda" className="mt-1.5 text-sm text-[#42516A]">
                                            {tienePresupuestoGuardado
                                                ? `Actual: ${CLP.format(Number(user.budget_limit))}. Si lo dejas vacío, se mantiene.`
                                                : 'Opcional. Monto entero en pesos.'}
                                        </p>
                                    )}
                                </div>

                                {errorPref && (
                                    <div role="alert" className={ALERTA}>
                                        {errorPref}
                                    </div>
                                )}
                                {exitoPref && (
                                    <div role="status" className={EXITO}>
                                        {exitoPref}
                                    </div>
                                )}

                                <div>
                                    <button type="submit" disabled={guardandoPref} className={BOTON_PRIMARIO}>
                                        {guardandoPref ? 'Guardando…' : 'Guardar preferencias'}
                                    </button>
                                </div>
                            </form>
                        </section>

                        {/* ----- Restricciones alimentarias ----- */}
                        <section aria-labelledby="titulo-restricciones" className={`${TARJETA} lg:col-span-2`}>
                            <h2
                                id="titulo-restricciones"
                                ref={tituloRestrRef}
                                tabIndex={-1}
                                className={`${TITULO_TARJETA} mb-2 rounded-md ${FOCO}`}
                            >
                                Restricciones alimentarias
                            </h2>
                            <p className="mb-6 max-w-[720px] text-[15px] text-[#42516A]">
                                Funcionan como un filtro excluyente: no te recomendaremos recetas que tengan esos
                                ingredientes.
                            </p>

                            {cargandoPerfil && (
                                <p role="status" className="text-[15px] font-medium text-[#42516A]">
                                    Cargando tus restricciones…
                                </p>
                            )}

                            {!cargandoPerfil && errorCarga && (
                                <div className="flex flex-col items-start gap-4">
                                    <div role="alert" className={ALERTA}>
                                        No pudimos cargar tus restricciones. {errorCarga}
                                    </div>
                                    <button type="button" onClick={reintentarCarga} className={BOTON_NAV}>
                                        Reintentar
                                    </button>
                                </div>
                            )}

                            {!cargandoPerfil && !errorCarga && perfil && (
                                <>
                                    {consentido && (
                                        <div className="mb-8 rounded-[22px] bg-[#F4F7FB] p-6">
                                            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#0B5FD0]">
                                                Guardadas actualmente
                                            </p>
                                            <ul className="flex flex-wrap gap-2">
                                                <li className={CHIP}>{etiqueta(DIETAS, perfil.diet_type)}</li>
                                                {perfil.allergies.map((a) => (
                                                    <li key={a} className={CHIP}>
                                                        {etiqueta(RESTRICCIONES, a)}
                                                    </li>
                                                ))}
                                            </ul>
                                            <p className="mt-3 text-sm text-[#42516A]">
                                                Consentimiento otorgado el {formatearFecha(perfil.consent_at)}.
                                            </p>
                                        </div>
                                    )}

                                    <form onSubmit={handleGuardarRestricciones} noValidate className="flex flex-col gap-6">
                                        <fieldset>
                                            <legend className="mb-3 text-sm font-semibold text-[#0A2350]">Dieta</legend>
                                            <div className="flex flex-wrap gap-3">
                                                {DIETAS.map(({ value, label }) => (
                                                    <label key={value} className={OPCION}>
                                                        <input
                                                            type="radio"
                                                            name="dieta"
                                                            value={value}
                                                            checked={dieta === value}
                                                            onChange={() => setDieta(value)}
                                                            className={CONTROL}
                                                        />
                                                        {label}
                                                    </label>
                                                ))}
                                            </div>
                                        </fieldset>

                                        <fieldset>
                                            <legend className="mb-3 text-sm font-semibold text-[#0A2350]">
                                                Restricciones y alergias
                                            </legend>
                                            <div className="flex flex-wrap gap-3">
                                                {RESTRICCIONES.map(({ value, label }) => (
                                                    <label key={value} className={OPCION}>
                                                        <input
                                                            type="checkbox"
                                                            value={value}
                                                            checked={alergias.includes(value)}
                                                            onChange={() => toggleAlergia(value)}
                                                            className={CONTROL}
                                                        />
                                                        {label}
                                                    </label>
                                                ))}
                                            </div>
                                        </fieldset>

                                        <label className="flex max-w-[720px] cursor-pointer items-start gap-3 rounded-[22px] border border-blue-100 p-5 text-[15px] text-[#0A2350] has-checked:border-[#0B5FD0] has-checked:bg-blue-50">
                                            <input
                                                id="consentimiento"
                                                type="checkbox"
                                                checked={consentimiento}
                                                onChange={(e) => setConsentimiento(e.target.checked)}
                                                className={`${CONTROL} mt-1`}
                                            />
                                            <span>
                                                Autorizo a NutriCart a guardar mis restricciones alimentarias y usarlas
                                                para excluir recetas de mis recomendaciones. Puedo eliminarlas cuando
                                                quiera.
                                            </span>
                                        </label>

                                        {errorRestr && (
                                            <div role="alert" className={ALERTA}>
                                                {errorRestr}
                                            </div>
                                        )}
                                        {exitoRestr && (
                                            <div role="status" className={EXITO}>
                                                {exitoRestr}
                                            </div>
                                        )}

                                        <div className="flex flex-wrap items-center gap-4">
                                            <button
                                                type="submit"
                                                disabled={!consentimiento || guardandoRestr}
                                                aria-describedby={consentimiento ? undefined : 'restricciones-ayuda'}
                                                className={BOTON_PRIMARIO}
                                            >
                                                {guardandoRestr ? 'Guardando…' : 'Guardar restricciones'}
                                            </button>
                                            {!consentimiento && (
                                                <p id="restricciones-ayuda" className="text-sm text-[#42516A]">
                                                    Marca la autorización para poder guardar.
                                                </p>
                                            )}
                                        </div>
                                    </form>

                                    {tienePerfil && (
                                        <div className="mt-8 border-t border-blue-100 pt-6">
                                            {!confirmando ? (
                                                <button
                                                    ref={botonEliminarRef}
                                                    type="button"
                                                    onClick={() => setConfirmando(true)}
                                                    className={`rounded-full border border-[#F5C2BF] px-6 py-2.5 font-semibold text-[#A12A1F] transition hover:bg-[#FDECEA] ${FOCO}`}
                                                >
                                                    Eliminar mis restricciones
                                                </button>
                                            ) : (
                                                <div
                                                    role="group"
                                                    aria-labelledby="confirmar-eliminar"
                                                    className="flex flex-col gap-4 rounded-[22px] border border-[#F5C2BF] bg-[#FDECEA] p-5"
                                                >
                                                    <p id="confirmar-eliminar" className="font-semibold text-[#A12A1F]">
                                                        ¿Seguro? Se borrarán tu dieta, tus restricciones y tu
                                                        consentimiento.
                                                    </p>
                                                    <div className="flex flex-wrap gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={confirmarEliminar}
                                                            disabled={eliminando}
                                                            className={`rounded-full bg-[#C0392B] px-6 py-2.5 font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`}
                                                        >
                                                            {eliminando ? 'Eliminando…' : 'Confirmar'}
                                                        </button>
                                                        <button
                                                            ref={cancelarRef}
                                                            type="button"
                                                            onClick={cancelarEliminar}
                                                            disabled={eliminando}
                                                            className={`${BOTON_NAV} bg-white disabled:cursor-not-allowed disabled:opacity-60`}
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
