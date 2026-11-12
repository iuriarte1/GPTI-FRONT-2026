import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MENUS_MOCK } from '../data/menus';
import CalendarioMenu from './CalendarioMenu';
import MenuCarrusel from './MenuCarrusel';

const DISPLAY = "font-['Bricolage_Grotesque',sans-serif]";

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5FD0]';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

// TODO: reemplazar por los menús del usuario cuando exista el endpoint.
// Del más nuevo al más antiguo, que es como los muestra el carrusel.
const menus = [...MENUS_MOCK].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));

function existe(valor) {
    return valor !== null && valor !== undefined && valor !== '';
}

export default function AppHome() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    // Por defecto se muestra el menú más nuevo.
    const [menuId, setMenuId] = useState(menus[0]?.id);

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    const menuActivo = menus.find((m) => m.id === menuId) ?? menus[0];

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

                        {menus.length > 0 && (
                            <div className="min-w-[280px] flex-1">
                                <MenuCarrusel menus={menus} seleccionado={menuActivo.id} onSeleccionar={setMenuId} />
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

                    {menuActivo && (
                        <div className="mt-12">
                            {/* La key reinicia el calendario al cambiar de menú. */}
                            <CalendarioMenu key={menuActivo.id} menu={menuActivo} />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
