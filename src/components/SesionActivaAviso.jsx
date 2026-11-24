import { Link } from 'react-router-dom';

const DISPLAY = "font-['Bricolage_Grotesque',sans-serif]";

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5FD0]';

// Se muestra en /login y /registro cuando ya hay una sesión iniciada. En vez de redirigir en silencio,
// deja elegir entre seguir con esa cuenta o cerrar la sesión para usar otra.
export default function SesionActivaAviso({ user, accion, onCerrarSesion }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#F4F7FB] px-6 py-12 font-['DM_Sans',system-ui,sans-serif] leading-normal text-[#0F1B2D]">
            <div className="w-full max-w-[440px]">
                <Link
                    to="/"
                    className={`mb-6 inline-block rounded-md text-sm font-semibold text-[#42516A] transition hover:text-[#0B5FD0] ${FOCO}`}
                >
                    ← Volver al inicio
                </Link>

                <div className="rounded-[28px] bg-white p-8 shadow-[0_16px_40px_rgba(10,35,80,0.08)] sm:p-10">
                    <div
                        className={`${DISPLAY} mb-6 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-[#0B5FD0]`}
                    >
                        <span className="text-3xl">❇️</span> NutriCart
                    </div>

                    <div role="status">
                        <h1 className={`${DISPLAY} mb-3 text-3xl font-extrabold tracking-tight text-[#0A2350]`}>
                            Ya iniciaste sesión
                        </h1>
                        <p className="mb-8 text-[17px] text-[#42516A]">
                            Estás usando NutriCart como <strong className="text-[#0A2350]">{user?.full_name}</strong>
                            {user?.email ? <span className="break-all"> ({user.email})</span> : null}.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Link
                            to="/app"
                            className={`w-full rounded-full bg-[#0B5FD0] px-7 py-4 text-center text-[17px] font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg ${FOCO}`}
                        >
                            Continuar a mi panel
                        </Link>
                        <button
                            type="button"
                            onClick={onCerrarSesion}
                            className={`w-full rounded-full border border-blue-100 px-7 py-4 text-[17px] font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] ${FOCO}`}
                        >
                            Cerrar sesión y {accion}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
