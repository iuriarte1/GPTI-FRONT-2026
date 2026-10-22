import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DISPLAY = "font-['Bricolage_Grotesque',sans-serif]";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5FD0]';

function validar(email, password) {
    const errores = {};
    if (!email.trim()) errores.email = 'Ingresa tu correo electrónico.';
    else if (!EMAIL_REGEX.test(email.trim())) errores.email = 'Ingresa un correo con formato válido.';
    if (!password) errores.password = 'Ingresa tu contraseña.';
    return errores;
}

function mensajeDeError(error) {
    if (error.status === 401) return 'Correo o contraseña incorrectos.';
    if (error.status === 422) return 'Revisa el formato del correo.';
    return error.message;
}

export default function LoginPage() {
    const { token, login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [errores, setErrores] = useState({});
    const [errorGeneral, setErrorGeneral] = useState('');
    const [cargando, setCargando] = useState(false);

    if (token) return <Navigate to="/app" replace />;

    async function handleSubmit(event) {
        event.preventDefault();
        setErrorGeneral('');

        const nuevosErrores = validar(email, password);
        setErrores(nuevosErrores);
        if (Object.keys(nuevosErrores).length > 0) return;

        setCargando(true);
        try {
            await login(email.trim(), password);
            navigate('/app', { replace: true });
        } catch (error) {
            setErrorGeneral(mensajeDeError(error));
            setCargando(false);
        }
    }

    const inputBase = `w-full rounded-xl border bg-white px-4 py-3 text-base text-[#0F1B2D] transition placeholder:text-[#8A97AB] focus:border-[#0B5FD0] ${FOCO}`;
    const borde = (campo) => (errores[campo] ? 'border-[#D9534F]' : 'border-blue-100');

    return (
        <div className="flex min-h-screen bg-white font-['DM_Sans',system-ui,sans-serif] leading-normal text-[#0F1B2D]">
            {/* ===== PANEL IZQUIERDO ===== */}
            <aside className="hidden flex-1 flex-col justify-between bg-[#0A2350] p-10 text-white lg:flex xl:p-14">
                <Link
                    to="/"
                    className={`${DISPLAY} flex w-fit items-center gap-2 rounded-lg text-3xl font-extrabold tracking-tight text-white ${FOCO}`}
                >
                    <span className="text-4xl">❇️</span> NutriCart
                </Link>

                <div>
                    <p
                        className={`${DISPLAY} max-w-[520px] text-[clamp(40px,4.2vw,72px)] font-extrabold leading-[1.02] tracking-[-0.03em]`}
                    >
                        Tu semana de comidas, lista en minutos
                    </p>

                    <div className="mt-10 w-fit -rotate-3 rounded-[20px] bg-[#FFC629] px-[22px] py-4 text-[#0A2350] shadow-[0_16px_32px_rgba(0,0,0,0.25)] 2xl:px-7 2xl:py-5">
                        <div className="text-[13px] font-bold 2xl:text-base">Semana completa en Lider.cl</div>
                        <div
                            className={`${DISPLAY} text-[36px] font-extrabold leading-tight tracking-[-0.02em] 2xl:text-[48px]`}
                        >
                            $42.380
                        </div>
                        <div className="text-xs font-medium 2xl:text-sm">para 3 personas · precio de ejemplo</div>
                    </div>
                </div>

                <p className="text-sm text-[#B9C6DA]">7 platos · una sola lista · el precio total</p>
            </aside>

            {/* ===== FORMULARIO ===== */}
            <main className="flex flex-1 items-center justify-center bg-[#F4F7FB] px-6 py-12">
                <div className="w-full max-w-[440px]">
                    <Link
                        to="/"
                        className={`mb-6 inline-block rounded-md text-sm font-semibold text-[#42516A] transition hover:text-[#0B5FD0] ${FOCO}`}
                    >
                        ← Volver al inicio
                    </Link>

                    <div className="rounded-[28px] bg-white p-8 shadow-[0_16px_40px_rgba(10,35,80,0.08)] sm:p-10">
                        <div
                            className={`${DISPLAY} mb-6 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-[#0B5FD0] lg:hidden`}
                        >
                            <span className="text-3xl">❇️</span> NutriCart
                        </div>

                        <h1 className={`${DISPLAY} mb-8 text-4xl font-extrabold tracking-tight text-[#0A2350]`}>
                            Inicia sesión
                        </h1>

                        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                            <div>
                                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-[#0A2350]">
                                    Correo electrónico
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="username"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    aria-invalid={errores.email ? 'true' : 'false'}
                                    aria-describedby={errores.email ? 'email-error' : undefined}
                                    placeholder="tu@correo.cl"
                                    className={`${inputBase} ${borde('email')}`}
                                />
                                {errores.email && (
                                    <p id="email-error" className="mt-1.5 text-sm text-[#C0392B]">
                                        {errores.email}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-[#0A2350]">
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={mostrarPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        aria-invalid={errores.password ? 'true' : 'false'}
                                        aria-describedby={errores.password ? 'password-error' : undefined}
                                        className={`${inputBase} ${borde('password')} pr-24`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setMostrarPassword((v) => !v)}
                                        aria-pressed={mostrarPassword}
                                        aria-controls="password"
                                        className={`absolute inset-y-0 right-2 my-auto h-fit rounded-lg px-3 py-1.5 text-sm font-semibold text-[#0B5FD0] transition hover:bg-blue-50 ${FOCO}`}
                                    >
                                        {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                                    </button>
                                </div>
                                {errores.password && (
                                    <p id="password-error" className="mt-1.5 text-sm text-[#C0392B]">
                                        {errores.password}
                                    </p>
                                )}
                            </div>

                            {errorGeneral && (
                                <div
                                    role="alert"
                                    className="rounded-xl border border-[#F5C2BF] bg-[#FDECEA] px-4 py-3 text-sm font-medium text-[#A12A1F]"
                                >
                                    {errorGeneral}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={cargando}
                                className={`w-full rounded-full bg-[#0B5FD0] px-7 py-4 text-[17px] font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none ${FOCO}`}
                            >
                                {cargando ? 'Ingresando…' : 'Ingresar'}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-[15px] text-[#42516A]">
                            ¿No tienes cuenta?{' '}
                            <Link
                                to="/registro"
                                className={`rounded font-bold text-[#0B5FD0] hover:underline ${FOCO}`}
                            >
                                Crea una
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
