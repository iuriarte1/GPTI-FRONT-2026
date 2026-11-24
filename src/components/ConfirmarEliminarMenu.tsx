import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSesionVencida } from '../hooks/useSesionVencida';
import { eliminarMenu } from '../api/menus';
import { claveDespensa, desdeClave } from '../data/menus';

const DISPLAY = "font-['Bricolage_Grotesque',sans-serif]";

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5FD0]';

const RANGO = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' });

export interface MenuAEliminar {
    id: number;
    nombre: string;
    inicio: string; // YYYY-MM-DD
    fin: string;
}

interface ConfirmarEliminarMenuProps {
    menu: MenuAEliminar | null; // null = cerrado
    onEliminado: (id: number) => void;
    onCancelar: () => void;
}

// Usa <dialog> nativo: showModal() bloquea el fondo, atrapa el foco y cierra con Escape.
export default function ConfirmarEliminarMenu({ menu, onEliminado, onCancelar }: ConfirmarEliminarMenuProps) {
    const { token } = useAuth();
    const manejarSesion = useSesionVencida();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [eliminando, setEliminando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (menu && !dialog.open) dialog.showModal();
        else if (!menu && dialog.open) dialog.close();
    }, [menu]);

    function cancelar() {
        if (eliminando) return;
        setError(null);
        onCancelar();
    }

    async function confirmar() {
        if (!menu || eliminando) return;
        setEliminando(true);
        setError(null);
        try {
            await eliminarMenu(token, menu.id);
        } catch (e) {
            const err = e as Error & { status?: number };
            if (manejarSesion(err)) return;
            // 404: ya no existe, así que para el usuario el resultado es el mismo.
            if (err.status !== 404) {
                setError(err.message || 'No pudimos eliminar el menú. Intenta de nuevo.');
                setEliminando(false);
                return;
            }
        }
        try {
            localStorage.removeItem(claveDespensa(menu.id));
        } catch {
            // Nada que limpiar.
        }
        setEliminando(false);
        onEliminado(menu.id);
    }

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="eliminar-titulo"
            onCancel={(e) => {
                e.preventDefault();
                cancelar();
            }}
            className="m-auto w-[calc(100%-32px)] max-w-[480px] rounded-[28px] bg-white p-0 text-[#0F1B2D] shadow-[0_24px_60px_rgba(10,35,80,0.25)] backdrop:bg-[#0A2350]/50 backdrop:backdrop-blur-sm"
        >
            {menu && (
                <div className="flex flex-col gap-5 p-7 sm:p-8">
                    <div>
                        <h2 id="eliminar-titulo" className={`${DISPLAY} text-2xl font-extrabold tracking-tight text-[#0A2350]`}>
                            ¿Eliminar este menú?
                        </h2>
                        <p className="mt-2 text-[15px] text-[#42516A]">
                            Vas a eliminar <strong className="text-[#0A2350]">{menu.nombre}</strong> (
                            {RANGO.formatRange(desdeClave(menu.inicio), desdeClave(menu.fin))}), con su calendario y
                            su lista de compras. No se puede deshacer.
                        </p>
                    </div>

                    {error && (
                        <p
                            role="alert"
                            className="rounded-xl border border-[#F5C2BF] bg-[#FDECEA] px-4 py-3 text-sm font-medium text-[#A12A1F]"
                        >
                            {error}
                        </p>
                    )}

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={cancelar}
                            disabled={eliminando}
                            autoFocus
                            className={`rounded-full border border-blue-100 px-6 py-3 font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={confirmar}
                            disabled={eliminando}
                            className={`rounded-full bg-[#C0392B] px-7 py-3 font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`}
                        >
                            {eliminando ? 'Eliminando…' : error ? 'Reintentar' : 'Eliminar menú'}
                        </button>
                    </div>
                </div>
            )}
        </dialog>
    );
}
