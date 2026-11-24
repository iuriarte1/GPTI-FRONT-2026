import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DISPLAY = "font-['Bricolage_Grotesque',sans-serif]";

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5FD0]';

const BOTON_NAV = `rounded-full border border-blue-100 px-6 py-2.5 font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] ${FOCO}`;

export default function GestorRecetasPage() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
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
                        className={`${DISPLAY} mb-8 text-[clamp(36px,4vw,64px)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#0A2350]`}
                    >
                        Panel de recetas
                    </h1>
                    <p className="text-[17px] text-[#42516A]">Aquí revisarás y aprobarás las recetas que usa NutriCart.</p>
                </div>
            </main>
        </div>
    );
}
