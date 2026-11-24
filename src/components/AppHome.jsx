import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSesionVencida } from '../hooks/useSesionVencida';
import { listarMenus, obtenerMenu } from '../api/menus';
import { menuDesdeApi } from '../data/menus';
import CalendarioMenu from './CalendarioMenu';
import MenuCarrusel from './MenuCarrusel';
import ConfirmarEliminarMenu from './ConfirmarEliminarMenu';

const DISPLAY = "font-['Bricolage_Grotesque',sans-serif]";

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5FD0]';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const BOTON_SECUNDARIO = `rounded-full border border-blue-100 bg-white px-5 py-2.5 text-sm font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] ${FOCO}`;

function existe(valor) {
    return valor !== null && valor !== undefined && valor !== '';
}

export default function AppHome() {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const manejarSesion = useSesionVencida();

    // Historial de menús (del backend, del más nuevo al más antiguo).
    const [menus, setMenus] = useState(null);
    const [errorMenus, setErrorMenus] = useState(null);
    const [intentoMenus, setIntentoMenus] = useState(0);

    // Menú elegido en el carrusel; por defecto, el más nuevo.
    const [menuId, setMenuId] = useState(null);
    const [detalle, setDetalle] = useState(null); // { id, menu } | { id, error }
    const [intentoDetalle, setIntentoDetalle] = useState(0);
    const [aEliminar, setAEliminar] = useState(null); // Menú del diálogo de confirmación

    useEffect(() => {
        let cancelado = false;
        listarMenus(token)
            .then((lista) => {
                if (cancelado) return;
                setMenus(lista);
                setErrorMenus(null);
            })
            .catch((error) => {
                if (cancelado || manejarSesion(error)) return;
                setErrorMenus(error.message);
            });
        return () => {
            cancelado = true;
        };
    }, [token, intentoMenus, manejarSesion]);

    const idActivo = menus?.some((m) => m.id === menuId) ? menuId : menus?.[0]?.id;

    useEffect(() => {
        if (idActivo === undefined) return;
        let cancelado = false;
        obtenerMenu(token, idActivo)
            .then((menu) => {
                if (!cancelado) setDetalle({ id: idActivo, menu: menuDesdeApi(menu) });
            })
            .catch((error) => {
                if (cancelado || manejarSesion(error)) return;
                setDetalle({ id: idActivo, error: error.message });
            });
        return () => {
            cancelado = true;
        };
    }, [token, idActivo, intentoDetalle, manejarSesion]);

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    function reintentarMenus() {
        setErrorMenus(null);
        setMenus(null);
        setIntentoMenus((n) => n + 1);
    }

    // Tras editar el calendario, el carrusel muestra conteos y costo nuevos (sin volver a "Cargando").
    function refrescarLista() {
        listarMenus(token)
            .then(setMenus)
            .catch((error) => manejarSesion(error));
    }

    function menuEliminado(id) {
        setAEliminar(null);
        setMenus((actuales) => actuales.filter((m) => m.id !== id));
        setMenuId(null); // Queda seleccionado el más nuevo de los que quedan
    }

    function reintentarDetalle() {
        setDetalle(null);
        setIntentoDetalle((n) => n + 1);
    }

    // Solo sirve el detalle del menú elegido; si no coincide, aún está cargando.
    const detalleActivo = detalle && detalle.id === idActivo ? detalle : null;

    const tienePreferencia = existe(user?.dietary_preference);
    const tienePresupuesto = existe(user?.budget_limit);

    return (
        <div className="flex min-h-screen flex-col bg-white font-['DM_Sans',system-ui,sans-serif] leading-normal text-[#0F1B2D]">
            {/* ===== NAVBAR ===== */}
            <nav className="border-b border-blue-100">
                <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 xl:px-10">
                    <div className={`${DISPLAY} flex items-center gap-2 text-3xl font-extrabold tracking-tight text-[#0B5FD0]`}>
                        <span className="text-4xl">❇️</span> NutriCart
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/perfil"
                            className={`rounded-full border border-blue-100 px-6 py-2.5 font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] ${FOCO}`}
                        >
                            Mi perfil
                        </Link>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className={`rounded-full border border-blue-100 px-6 py-2.5 font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] ${FOCO}`}
                        >
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
                        Hola, {user?.full_name}
                    </h1>

                    <div className="flex flex-wrap items-center justify-between gap-6">
                        <Link
                            to="/menu"
                            className={`inline-block rounded-full bg-[#0B5FD0] px-7 py-4 text-[17px] font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg ${FOCO}`}
                        >
                            Configurar un menú nuevo→
                        </Link>

                        {menus && menus.length > 0 && (
                            <div className="min-w-[280px] flex-1">
                                <MenuCarrusel menus={menus} seleccionado={idActivo} onSeleccionar={setMenuId} />
                            </div>
                        )}

                        {(tienePreferencia || tienePresupuesto) && (
                            <dl className="flex flex-wrap gap-4">
                                {tienePreferencia && (
                                    <div className="min-w-[220px] rounded-[22px] bg-white p-6 shadow-[0_16px_40px_rgba(10,35,80,0.08)]">
                                        <dt className="text-xs font-bold uppercase tracking-wide text-[#0B5FD0]">
                                            Preferencia alimentaria
                                        </dt>
                                        <dd className={`${DISPLAY} mt-1 text-2xl font-extrabold text-[#0A2350]`}>
                                            {user.dietary_preference}
                                        </dd>
                                    </div>
                                )}
                                {tienePresupuesto && (
                                    <div className="min-w-[220px] -rotate-2 rounded-[22px] bg-[#FFC629] p-6 text-[#0A2350] shadow-[0_16px_32px_rgba(10,35,80,0.18)]">
                                        <dt className="text-xs font-bold uppercase tracking-wide">Presupuesto semanal</dt>
                                        <dd className={`${DISPLAY} mt-1 text-[36px] font-extrabold leading-tight tracking-[-0.02em]`}>
                                            {Number.isFinite(Number(user.budget_limit))
                                                ? CLP.format(Number(user.budget_limit))
                                                : user.budget_limit}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        )}
                    </div>

                    <div className="mt-12">
                        {errorMenus ? (
                            <div
                                role="alert"
                                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F5C2BF] bg-[#FDECEA] px-5 py-4 text-[#A12A1F]"
                            >
                                <span className="font-medium">No pudimos cargar tus menús. {errorMenus}</span>
                                <button type="button" onClick={reintentarMenus} className={BOTON_SECUNDARIO}>
                                    Reintentar
                                </button>
                            </div>
                        ) : menus === null ? (
                            <p role="status" className="py-12 text-center font-semibold text-[#42516A]">
                                Cargando tus menús…
                            </p>
                        ) : menus.length === 0 ? (
                            <div className="rounded-[28px] border border-dashed border-blue-200 bg-white p-10 text-center">
                                <p className={`${DISPLAY} text-2xl font-extrabold text-[#0A2350]`}>Aún no tienes menús</p>
                                <p className="mt-2 text-[#42516A]">
                                    Configura tu primer menú y armamos el calendario y la lista de compras.
                                </p>
                            </div>
                        ) : !detalleActivo ? (
                            <p role="status" className="py-12 text-center font-semibold text-[#42516A]">
                                Cargando el calendario…
                            </p>
                        ) : detalleActivo.error ? (
                            <div
                                role="alert"
                                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F5C2BF] bg-[#FDECEA] px-5 py-4 text-[#A12A1F]"
                            >
                                <span className="font-medium">No pudimos cargar este menú. {detalleActivo.error}</span>
                                <button type="button" onClick={reintentarDetalle} className={BOTON_SECUNDARIO}>
                                    Reintentar
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6 flex flex-wrap justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setAEliminar(detalleActivo.menu)}
                                        className={`rounded-full border border-[#F5C2BF] bg-white px-5 py-2.5 text-sm font-semibold text-[#A12A1F] transition hover:bg-[#FDECEA] ${FOCO}`}
                                    >
                                        Eliminar menú
                                    </button>
                                    <Link to={`/menus/${idActivo}`} className={BOTON_SECUNDARIO}>
                                        Ver menú y lista de compras →
                                    </Link>
                                </div>
                                {/* La key reinicia el calendario al cambiar de menú. */}
                                <CalendarioMenu
                                    key={idActivo}
                                    menu={detalleActivo.menu}
                                    onMenuActualizado={refrescarLista}
                                />
                            </>
                        )}
                    </div>
                </div>
            </main>

            <ConfirmarEliminarMenu menu={aEliminar} onCancelar={() => setAEliminar(null)} onEliminado={menuEliminado} />
        </div>
    );
}
