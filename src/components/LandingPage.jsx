import React from 'react';

const FUENTES = `@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap');`;

const DISPLAY = "font-['Bricolage_Grotesque',sans-serif]";

const SEMANA = [
    {
        dia: 'LUN',
        plato: 'Pollo al limón',
        dibujo: (
            <>
                <circle cx="50" cy="42" r="28" fill="#F3E3B5" />
                <circle cx="40" cy="36" r="10" fill="#E9A23B" />
                <circle cx="60" cy="48" r="7" fill="#7FB069" />
            </>
        ),
    },
    {
        dia: 'MAR',
        plato: 'Lentejas',
        dibujo: (
            <>
                <circle cx="50" cy="42" r="28" fill="#A0673B" />
                <circle cx="42" cy="38" r="5" fill="#E7783A" />
                <circle cx="58" cy="46" r="5" fill="#7FB069" />
            </>
        ),
    },
    {
        dia: 'MIÉ',
        plato: 'Pescado al horno',
        dibujo: (
            <>
                <rect x="28" y="32" width="34" height="18" rx="9" fill="#F28C6B" />
                <circle cx="68" cy="46" r="9" fill="#F5EBD6" />
            </>
        ),
    },
    {
        dia: 'JUE',
        plato: 'Tortilla',
        dibujo: (
            <>
                <circle cx="50" cy="42" r="27" fill="#F6D365" />
                <circle cx="44" cy="38" r="4" fill="#7FB069" />
                <circle cx="58" cy="46" r="4" fill="#D9534F" />
            </>
        ),
    },
    {
        dia: 'VIE',
        plato: 'Pasta pomodoro',
        dibujo: (
            <>
                <circle cx="50" cy="42" r="28" fill="#F1D9A0" />
                <circle cx="50" cy="42" r="14" fill="#D9534F" />
            </>
        ),
    },
    {
        dia: 'SÁB',
        plato: 'Cazuela',
        dibujo: (
            <>
                <circle cx="50" cy="42" r="28" fill="#F2C57C" />
                <circle cx="42" cy="40" r="8" fill="#E9A23B" />
                <rect x="54" y="34" width="10" height="16" rx="5" fill="#F6D365" />
            </>
        ),
    },
    {
        dia: 'DOM',
        plato: 'Ensalada',
        dibujo: (
            <>
                <circle cx="50" cy="42" r="28" fill="#A8D5A2" />
                <circle cx="44" cy="38" r="6" fill="#FFFFFF" />
                <circle cx="44" cy="38" r="3" fill="#F6C343" />
                <circle cx="60" cy="48" r="5" fill="#D9534F" />
            </>
        ),
    },
];

export default function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col bg-white font-['DM_Sans',system-ui,sans-serif] leading-normal text-[#0F1B2D]">
            <style>{FUENTES}</style>

            {/* ===== NAVBAR ===== */}
            <nav className="border-b border-blue-100">
                <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 xl:px-10">
                    <div className={`${DISPLAY} flex items-center gap-2 text-3xl font-extrabold tracking-tight text-[#0B5FD0]`}>
                        <span className="text-4xl">❇️</span> NutriCart
                    </div>
                    <div className="flex items-center gap-6">
                        <button className="font-semibold text-gray-600 transition hover:text-[#0B5FD0]">
                            Iniciar Sesión
                        </button>
                        <button className="rounded-full bg-[#0B5FD0] px-6 py-2.5 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                            Crear cuenta
                        </button>
                    </div>
                </div>
            </nav>

            {/* ===== HERO ===== */}
            <section className="flex flex-1 items-center">
                <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-12 px-6 py-12 xl:gap-20 xl:px-10">
                    {/* Texto */}
                    <div className="min-w-0 flex-[1_1_420px]">
                        <h1
                            className={`${DISPLAY} mb-6 text-[clamp(44px,5.4vw,104px)] font-extrabold leading-[0.98] tracking-[-0.035em]`}
                        >
                            Come rico toda la semana.
                            <br />
                            <span className="text-[#0B5FD0]">Compra todo en Lider.cl.</span>
                        </h1>
                        <p className="mb-9 max-w-[560px] text-[19px] leading-[1.6] text-[#42516A] 2xl:text-[23px]">
                            7 platos pensados para tu casa, una sola lista y el precio total antes de ir al
                            supermercado.
                        </p>
                        <div className="flex flex-wrap items-center gap-4">
                            <a
                                href="#"
                                className="rounded-full bg-[#0B5FD0] px-7 py-[17px] text-[17px] font-bold text-white no-underline transition hover:-translate-y-0.5 hover:shadow-lg 2xl:px-9 2xl:py-5 2xl:text-xl"
                            >
                                Planificar mi semana
                            </a>
                            <span className="text-[15px] text-[#42516A] 2xl:text-lg">
                                Gratis · menos de 2 minutos
                            </span>
                        </div>
                    </div>

                    {/* Platos de la semana */}
                    <div className="flex min-w-0 flex-[1.2_1_520px] flex-col">
                        <div className="grid grid-cols-4 gap-3 2xl:gap-4">
                            {SEMANA.map(({ dia, plato, dibujo }) => (
                                <div
                                    key={dia}
                                    className="rounded-[22px] bg-[#F4F7FB] p-3.5 text-center 2xl:rounded-[28px] 2xl:p-5"
                                >
                                    <svg
                                        viewBox="0 0 100 84"
                                        aria-hidden="true"
                                        className="h-[84px] w-full xl:h-[104px] 2xl:h-[128px]"
                                    >
                                        <circle cx="50" cy="42" r="38" fill="#FFFFFF" />
                                        {dibujo}
                                    </svg>
                                    <div className="mt-1 text-xs font-bold text-[#0B5FD0] 2xl:text-sm">{dia}</div>
                                    <div className="mt-0.5 text-[13px] font-medium xl:text-sm 2xl:text-base">
                                        {plato}
                                    </div>
                                </div>
                            ))}

                            <div className="flex flex-col items-center justify-center gap-1.5 rounded-[22px] bg-[#0A2350] p-3.5 text-center text-white 2xl:rounded-[28px] 2xl:p-5">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#FFC629"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                    className="h-[30px] w-[30px] 2xl:h-10 2xl:w-10"
                                >
                                    <path d="M3 4h2.2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.1" />
                                    <circle cx="9.5" cy="20" r="1.3" />
                                    <circle cx="17.5" cy="20" r="1.3" />
                                </svg>
                                <div className="text-[13px] font-bold 2xl:text-base">24 productos</div>
                                <div className="text-xs text-[#B9C6DA] 2xl:text-sm">en tu lista</div>
                            </div>
                        </div>

                        {/* Etiqueta de precio */}
                        <div className="-mt-4 ml-auto mr-2 w-fit -rotate-3 rounded-[20px] bg-[#FFC629] px-[22px] py-4 text-[#0A2350] shadow-[0_16px_32px_rgba(10,35,80,0.18)] 2xl:px-7 2xl:py-5">
                            <div className="text-[13px] font-bold 2xl:text-base">Semana completa en Lider.cl</div>
                            <div
                                className={`${DISPLAY} text-[36px] font-extrabold leading-tight tracking-[-0.02em] 2xl:text-[48px]`}
                            >
                                $42.380
                            </div>
                            <div className="text-xs font-medium 2xl:text-sm">
                                para 3 personas · precio de ejemplo
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}