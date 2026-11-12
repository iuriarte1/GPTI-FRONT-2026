import { useRef } from 'react';
import { desdeClave, type MenuGuardado } from '../data/menus';

const DISPLAY = "font-['Bricolage_Grotesque',sans-serif]";

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5FD0]';

const FLECHA = `flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-white font-bold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] ${FOCO}`;

const RANGO = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' });
const CREADO = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

interface MenuCarruselProps {
    menus: MenuGuardado[]; // Del más nuevo al más antiguo
    seleccionado: string;
    onSeleccionar: (id: string) => void;
}

function contarPlatos(menu: MenuGuardado) {
    const platos = Object.values(menu.asignaciones);
    const fuera = platos.filter((p) => p.origen === 'fuera').length;
    return { caseros: platos.length - fuera, fuera };
}

export default function MenuCarrusel({ menus, seleccionado, onSeleccionar }: MenuCarruselProps) {
    const pistaRef = useRef<HTMLUListElement>(null);

    function desplazar(direccion: 1 | -1) {
        const pista = pistaRef.current;
        if (pista) pista.scrollBy({ left: direccion * pista.clientWidth * 0.8, behavior: 'smooth' });
    }

    return (
        <section
            aria-labelledby="titulo-mis-menus"
            className="min-w-0 rounded-[28px] border border-blue-200 bg-white/60 px-4 pt-4 pb-2"
        >
            <h2 id="titulo-mis-menus" className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-[#0B5FD0]">
                Mis menús
            </h2>
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => desplazar(-1)} aria-label="Ver menús más nuevos" className={FLECHA}>
                    ←
                </button>
                <ul ref={pistaRef} className="flex min-w-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth py-2">
                    {menus.map((menu, i) => {
                        const activo = menu.id === seleccionado;
                        const { caseros, fuera } = contarPlatos(menu);
                        return (
                            <li key={menu.id} className="shrink-0 snap-start">
                                <button
                                    type="button"
                                    onClick={() => onSeleccionar(menu.id)}
                                    aria-pressed={activo}
                                    className={`flex w-[240px] flex-col items-start gap-1 rounded-[22px] border-2 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                                        activo ? 'border-[#0B5FD0] shadow-md' : 'border-blue-100 shadow-sm'
                                    } ${FOCO}`}
                                >
                                    <span className="flex w-full items-center justify-between gap-2">
                                        <span className={`${DISPLAY} text-lg font-extrabold text-[#0A2350]`}>
                                            {RANGO.formatRange(desdeClave(menu.inicio), desdeClave(menu.fin))}
                                        </span>
                                        {i === 0 && (
                                            <span className="rounded-full bg-[#FFC629] px-2 py-0.5 text-[11px] font-bold uppercase text-[#0A2350]">
                                                Nuevo
                                            </span>
                                        )}
                                    </span>
                                    <span className="font-semibold text-[#0A2350]">{menu.nombre}</span>
                                    <span className="text-sm text-[#42516A]">
                                        {caseros} caseros · {fuera} fuera
                                    </span>
                                    <span className="text-xs text-[#8A97AB]">
                                        Creado el {CREADO.format(desdeClave(menu.creadoEn))}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
                <button type="button" onClick={() => desplazar(1)} aria-label="Ver menús más antiguos" className={FLECHA}>
                    →
                </button>
            </div>
        </section>
    );
}
