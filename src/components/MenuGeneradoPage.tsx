import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSesionVencida } from '../hooks/useSesionVencida';
import { obtenerMenu } from '../api/menus';
import { desdeClave, menuDesdeApi, type MenuApi } from '../data/menus';
import CalendarioMenu from './CalendarioMenu';
import ListaCompras from './ListaCompras';
import ConfirmarEliminarMenu from './ConfirmarEliminarMenu';

const DISPLAY = "font-['Bricolage_Grotesque',sans-serif]";

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5FD0]';

const BOTON_SECUNDARIO = `rounded-full border border-blue-100 bg-white px-6 py-2.5 font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] ${FOCO}`;

const RANGO = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long' });

type Estado =
    | { estado: 'cargando' }
    | { estado: 'listo'; menu: MenuApi }
    | { estado: 'no-existe' }
    | { estado: 'error'; mensaje: string };

export default function MenuGeneradoPage() {
    const { id } = useParams();
    const location = useLocation();
    const { token } = useAuth();
    const manejarSesion = useSesionVencida();

    // Si venimos del formulario, el menú ya viene en la navegación y no se pide de nuevo.
    const recibido = (location.state as { menu?: MenuApi } | null)?.menu;
    const inicial: Estado = recibido && String(recibido.id) === id ? { estado: 'listo', menu: recibido } : { estado: 'cargando' };

    const [resultado, setResultado] = useState<Estado & { id?: string }>({ ...inicial, id });
    const [intento, setIntento] = useState(0);
    const yaCargado = resultado.id === id && resultado.estado === 'listo';

    useEffect(() => {
        if (yaCargado) return;
        let cancelado = false;
        obtenerMenu(token, id)
            .then((menu: MenuApi) => {
                if (!cancelado) setResultado({ estado: 'listo', menu, id });
            })
            .catch((error: Error & { status?: number }) => {
                if (cancelado || manejarSesion(error)) return;
                if (error.status === 404 || error.status === 422) setResultado({ estado: 'no-existe', id });
                else setResultado({ estado: 'error', mensaje: error.message, id });
            });
        return () => {
            cancelado = true;
        };
    }, [token, id, intento, yaCargado, manejarSesion]);

    function reintentar() {
        setResultado({ estado: 'cargando', id });
        setIntento((n) => n + 1);
    }

    // Si cambió el id de la URL, lo anterior ya no sirve.
    const actual: Estado = resultado.id === id ? resultado : { estado: 'cargando' };

    return (
        <div className="flex min-h-screen flex-col bg-white font-['DM_Sans',system-ui,sans-serif] leading-normal text-[#0F1B2D]">
            {/* ===== NAVBAR ===== */}
            <nav className="border-b border-blue-100 bg-white">
                <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-5 xl:px-10">
                    <Link
                        to="/app"
                        className={`${DISPLAY} flex items-center gap-2 rounded-lg text-3xl font-extrabold tracking-tight text-[#0B5FD0] ${FOCO}`}
                    >
                        <span className="text-4xl">❇️</span> NutriCart
                    </Link>
                    <Link to="/app" className={BOTON_SECUNDARIO}>
                        ← Ver mis menús
                    </Link>
                </div>
            </nav>

            <main className="flex-1 bg-[#F4F7FB]">
                <div className="mx-auto w-full max-w-[1440px] px-6 py-12 xl:px-10">
                    {actual.estado === 'cargando' && (
                        <p role="status" className="py-24 text-center text-lg font-semibold text-[#42516A]">
                            Cargando tu menú…
                        </p>
                    )}

                    {actual.estado === 'no-existe' && (
                        <div className="mx-auto max-w-[560px] rounded-[28px] bg-white p-10 text-center shadow-[0_16px_40px_rgba(10,35,80,0.08)]">
                            <h1 className={`${DISPLAY} text-3xl font-extrabold text-[#0A2350]`}>No encontramos ese menú</h1>
                            <p className="mt-2 text-[#42516A]">Puede que lo hayas eliminado o que el enlace esté incompleto.</p>
                            <Link to="/app" className={`mt-6 inline-block ${BOTON_SECUNDARIO}`}>
                                Volver al panel
                            </Link>
                        </div>
                    )}

                    {actual.estado === 'error' && (
                        <div
                            role="alert"
                            className="mx-auto max-w-[560px] rounded-[28px] border border-[#F5C2BF] bg-[#FDECEA] p-10 text-center"
                        >
                            <p className="font-semibold text-[#A12A1F]">{actual.mensaje}</p>
                            <button type="button" onClick={reintentar} className={`mt-5 ${BOTON_SECUNDARIO}`}>
                                Reintentar
                            </button>
                        </div>
                    )}

                    {actual.estado === 'listo' && <MenuListo menu={actual.menu} />}
                </div>
            </main>
        </div>
    );
}

function MenuListo({ menu: inicial }: { menu: MenuApi }) {
    const navigate = useNavigate();
    // Se reemplaza con lo que devuelve el backend al editar el calendario (trae la canasta recotizada).
    const [menu, setMenu] = useState(inicial);
    const [eliminando, setEliminando] = useState(false);
    // Solo se calcula una vez: el calendario maneja sus propios cambios después de montarse.
    const [guardado] = useState(() => menuDesdeApi(inicial));
    const caseras = menu.meals.filter((m) => m.source === 'casera').length;
    const fuera = menu.meals.length - caseras;

    return (
        <>
            <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#0B5FD0]">Menú generado</p>
                    <h1
                        className={`${DISPLAY} mt-1 text-[clamp(36px,4vw,64px)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#0A2350]`}
                    >
                        {menu.name}
                    </h1>
                    <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[17px] text-[#42516A]">
                        <span>{RANGO.formatRange(desdeClave(menu.start_date), desdeClave(menu.end_date))}</span>
                        <span>
                            👥 {menu.diners} {menu.diners === 1 ? 'comensal' : 'comensales'}
                        </span>
                        <span>
                            {caseras} caseras · {fuera} fuera
                        </span>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setEliminando(true)}
                    className={`rounded-full border border-[#F5C2BF] bg-white px-5 py-2.5 text-sm font-semibold text-[#A12A1F] transition hover:bg-[#FDECEA] ${FOCO}`}
                >
                    Eliminar menú
                </button>
            </header>

            {menu.warnings.length > 0 && (
                <div className="mb-8 rounded-2xl border border-[#F3DFA2] bg-[#FFF8E1] px-5 py-4 text-[#6B5200]">
                    <h2 className="mb-1 text-sm font-bold">Ten en cuenta</h2>
                    <ul className="list-disc pl-5 text-sm">
                        {menu.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                        ))}
                    </ul>
                </div>
            )}

            <CalendarioMenu key={`cal-${menu.id}`} menu={guardado} onMenuActualizado={setMenu} />

            <div className="mt-14">
                <ListaCompras key={`compras-${menu.id}`} menu={menu} />
            </div>

            <ConfirmarEliminarMenu
                menu={
                    eliminando ? { id: menu.id, nombre: menu.name, inicio: menu.start_date, fin: menu.end_date } : null
                }
                onCancelar={() => setEliminando(false)}
                onEliminado={() => navigate('/app', { replace: true })}
            />
        </>
    );
}
