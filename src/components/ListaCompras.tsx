import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { cotizar } from '../api/menus';
import {
    claveDespensa,
    itemsParaCotizar,
    type CanastaApi,
    type LineaCanastaApi,
    type MenuApi,
    type OpcionProductoApi,
} from '../data/menus';

const DISPLAY = "font-['Bricolage_Grotesque',sans-serif]";

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5FD0]';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const NUMERO = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });

const BOTON_PASO = `flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-white text-lg font-bold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] disabled:cursor-not-allowed disabled:opacity-40 ${FOCO}`;

// Unidades que el usuario decidió comprar, por ingrediente. Se guarda el sku para descartar
// el ajuste si la cotización cambió de producto.
type Ajustes = Record<string, { sku: string; unidades: number }>;

// Producto elegido por ingrediente ({ingrediente: sku}), cuando no es el que cotiza el backend por defecto.
type Selecciones = Record<string, string>;

interface Guardado {
    unidades: Ajustes;
    selecciones: Selecciones;
}

function leerGuardado(menuId: number): Guardado {
    try {
        const datos = JSON.parse(localStorage.getItem(claveDespensa(menuId)) ?? '{}');
        if (!datos || typeof datos !== 'object') return { unidades: {}, selecciones: {} };
        if ('unidades' in datos || 'selecciones' in datos) {
            return { unidades: datos.unidades ?? {}, selecciones: datos.selecciones ?? {} };
        }
        return { unidades: datos, selecciones: {} }; // Formato anterior: solo las unidades
    } catch {
        return { unidades: {}, selecciones: {} };
    }
}

function guardar(menuId: number, datos: Guardado) {
    try {
        if (Object.keys(datos.unidades).length === 0 && Object.keys(datos.selecciones).length === 0) {
            localStorage.removeItem(claveDespensa(menuId));
        } else {
            localStorage.setItem(claveDespensa(menuId), JSON.stringify(datos));
        }
    } catch {
        // Sin localStorage los ajustes duran mientras la página esté abierta.
    }
}

// Mismo criterio que el backend: el producto marcado por defecto o, si no hay, el más barato.
function productoPorDefecto(linea: LineaCanastaApi): OpcionProductoApi {
    return linea.options.find((o) => o.is_default) ?? linea.options[0] ?? linea.selected;
}

function describirOpcion(o: OpcionProductoApi) {
    return `${o.name} · ${NUMERO.format(o.packages)} × ${NUMERO.format(o.package_quantity)} ${o.package_unit} · ${CLP.format(o.cost)}`;
}

// A granel se compra por fracciones; el resto por unidades enteras.
function pasoDe(linea: LineaCanastaApi) {
    return linea.selected.sold_by_weight ? 0.25 : 1;
}

function redondear(valor: number) {
    return Math.round(valor * 1000) / 1000;
}

function describirEnvase(linea: LineaCanastaApi) {
    const { package_quantity, package_unit, sold_by_weight } = linea.selected;
    const envase = `${NUMERO.format(package_quantity)} ${package_unit}`;
    return sold_by_weight ? `a granel, precio por ${envase}` : `envase de ${envase}`;
}

// El backend manda una línea por cada receta que usa el ingrediente, así que el mismo texto
// puede repetirse. Se agrupan las líneas iguales (sin importar mayúsculas ni espacios) y se cuentan.
function agruparRepetidos(items: string[]): { texto: string; veces: number }[] {
    const grupos = new Map<string, { texto: string; veces: number }>();
    for (const item of items) {
        const clave = item.trim().replace(/\s+/g, ' ').toLowerCase();
        if (!clave) continue;
        const grupo = grupos.get(clave);
        if (grupo) grupo.veces += 1;
        else grupos.set(clave, { texto: item.trim(), veces: 1 });
    }
    return [...grupos.values()];
}

interface ListaSimpleProps {
    titulo: string;
    items: string[];
    tono: 'info' | 'aviso';
    id?: string;
}

function ListaSimple({ titulo, items, tono, id }: ListaSimpleProps) {
    const agrupados = agruparRepetidos(items);
    if (agrupados.length === 0) return null;
    const estilos =
        tono === 'aviso'
            ? 'border-[#F3DFA2] bg-[#FFF8E1] text-[#6B5200]'
            : 'border-blue-100 bg-[#F4F7FB] text-[#42516A]';
    return (
        <div id={id} tabIndex={id ? -1 : undefined} className={`scroll-mt-6 rounded-2xl border px-5 py-4 ${estilos}`}>
            <h3 className="mb-1 text-sm font-bold">{titulo}</h3>
            <ul className="list-disc pl-5 text-sm">
                {agrupados.map(({ texto, veces }) => (
                    <li key={texto}>
                        {texto}
                        {veces > 1 && (
                            <span
                                className="ml-1.5 font-semibold"
                                aria-label={`, aparece en ${veces} recetas`}
                            >
                                × {veces}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

const BOTON_CHICO = `rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${FOCO}`;

// Para cambiar de menú, el padre debe montar el componente con key={menu.id}.
export default function ListaCompras({ menu }: { menu: MenuApi }) {
    const { token } = useAuth();
    const menuId = menu.id;
    const base = menu.basket; // Cotización del backend con los productos por defecto
    const [inicial] = useState(() => leerGuardado(menuId));
    const [ajustes, setAjustes] = useState<Ajustes>(inicial.unidades);
    const [selecciones, setSelecciones] = useState<Selecciones>(inicial.selecciones);
    const [cotizacion, setCotizacion] = useState<{ clave: string; canasta: CanastaApi; selecciones: Selecciones } | null>(null);
    const [errorCotizacion, setErrorCotizacion] = useState<{ clave: string; mensaje: string } | null>(null);
    const [intento, setIntento] = useState(0);
    const ultimasValidas = useRef<Selecciones>({});
    // Solo se revierte un cambio que hizo el usuario; si falla la carga inicial, se conservan sus productos guardados.
    const cambioDelUsuario = useRef(false);

    // Solo cuentan las selecciones de ingredientes que siguen en la canasta (el menú pudo cambiar).
    const ingredientesBase = new Set((base?.lines ?? []).map((l) => l.ingredient));
    const efectivas: Selecciones = Object.fromEntries(
        Object.entries(selecciones)
            .filter(([ingrediente]) => ingredientesBase.has(ingrediente))
            .sort(([a], [b]) => a.localeCompare(b)),
    );
    const hayCambiosDeProducto = Object.keys(efectivas).length > 0;
    // Identifica lo que hay que cotizar: las recetas del menú, la despensa y los productos elegidos.
    const firmaMenu = `${menu.recipes.map((r) => `${r.recipe_id}:${r.scale_factor}`).join(',')}|${(menu.config?.pantry ?? []).join(',')}`;
    const clave = `${firmaMenu}|${JSON.stringify(efectivas)}`;

    useEffect(() => {
        guardar(menuId, { unidades: ajustes, selecciones });
    }, [menuId, ajustes, selecciones]);

    // Recotiza con POST /api/basket/quote cuando hay productos elegidos que no son los por defecto.
    useEffect(() => {
        if (!hayCambiosDeProducto || cotizacion?.clave === clave) return;
        let cancelado = false;
        cotizar(token, { ...itemsParaCotizar(menu), selections: efectivas })
            .then((canasta: CanastaApi) => {
                if (cancelado) return;
                ultimasValidas.current = efectivas;
                setCotizacion({ clave, canasta, selecciones: efectivas });
                setErrorCotizacion(null);
            })
            .catch((error: Error) => {
                if (cancelado) return;
                if (cambioDelUsuario.current) {
                    setErrorCotizacion({ clave: '', mensaje: `No pudimos cambiar el producto. ${error.message}` });
                    setSelecciones(ultimasValidas.current); // Vuelve a lo último que sí se pudo cotizar
                } else {
                    setErrorCotizacion({ clave, mensaje: `No pudimos aplicar los productos que elegiste. ${error.message}` });
                }
            });
        return () => {
            cancelado = true;
        };
        // efectivas y menu quedan representados por clave.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave, token, intento]);

    const fallo = errorCotizacion?.clave === clave;
    const cotizando = hayCambiosDeProducto && cotizacion?.clave !== clave && !fallo;
    // Mientras se recotiza se sigue mostrando la última cotización.
    // Si falló la carga inicial, se muestra la cotización por defecto del backend.
    const canasta: CanastaApi | null =
        !hayCambiosDeProducto || (fallo && !cotizacion) ? base : (cotizacion?.canasta ?? base);
    const lineas = canasta?.lines ?? [];

    function elegirProducto(linea: LineaCanastaApi, sku: string) {
        cambioDelUsuario.current = true;
        setErrorCotizacion(null);
        setSelecciones((actuales) => {
            const siguientes = { ...actuales };
            if (sku === productoPorDefecto(linea).sku) delete siguientes[linea.ingredient];
            else siguientes[linea.ingredient] = sku;
            return siguientes;
        });
    }

    function usarTodasLasAlternativas() {
        cambioDelUsuario.current = true;
        setErrorCotizacion(null);
        setSelecciones((actuales) => {
            const siguientes = { ...actuales };
            for (const linea of lineas) {
                if (linea.cheaper_alternative) siguientes[linea.ingredient] = linea.cheaper_alternative.sku;
            }
            return siguientes;
        });
    }

    function restablecer() {
        setAjustes({});
        setSelecciones({});
        setErrorCotizacion(null);
    }

    function unidadesDe(linea: LineaCanastaApi): number {
        const ajuste = ajustes[linea.ingredient];
        // Si cambió el producto o la cantidad cotizada bajó, el ajuste viejo ya no aplica.
        if (!ajuste || ajuste.sku !== linea.selected.sku || ajuste.unidades > linea.selected.packages) {
            return linea.selected.packages;
        }
        return ajuste.unidades;
    }

    function cambiarUnidades(linea: LineaCanastaApi, unidades: number) {
        const valor = Math.min(linea.selected.packages, Math.max(0, redondear(unidades)));
        setAjustes((actuales) => {
            const siguientes = { ...actuales };
            if (valor === linea.selected.packages) delete siguientes[linea.ingredient];
            else siguientes[linea.ingredient] = { sku: linea.selected.sku, unidades: valor };
            return siguientes;
        });
    }

    const costoDe = (linea: LineaCanastaApi) => Math.round(linea.selected.price * unidadesDe(linea));
    const totalOriginal = lineas.reduce((suma, l) => suma + l.selected.cost, 0);
    const total = lineas.reduce((suma, l) => suma + costoDe(l), 0);
    const ahorro = totalOriginal - total;
    // Diferencia entre los productos por defecto y los elegidos (solo si hay cambios de producto).
    const ahorroProductos = hayCambiosDeProducto && canasta ? canasta.total_default - canasta.total : 0;
    const ahorroPosible = canasta?.potential_savings ?? 0;
    const hayAjustes = hayCambiosDeProducto || lineas.some((l) => unidadesDe(l) !== l.selected.packages);
    // Mismo conteo que la lista del final (los repetidos cuentan una vez).
    const noCotizados = agruparRepetidos(canasta?.not_quoted ?? []).length;

    return (
        <section aria-labelledby="titulo-cotizacion">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2
                        id="titulo-cotizacion"
                        className={`${DISPLAY} text-[clamp(28px,3vw,40px)] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#0A2350]`}
                    >
                        Tu lista de compras
                    </h2>
                    <p className="mt-2 max-w-[640px] text-[15px] text-[#42516A]">
                        Revisa tu despensa: si ya tienes algo, baja las unidades o marca “Ya lo tengo” para no
                        comprarlo de nuevo. También puedes cambiar un producto por otro; al cambiarlo, sus unidades
                        vuelven a la cantidad que necesitas del producto nuevo.
                    </p>
                </div>
                {hayAjustes && (
                    <button
                        type="button"
                        onClick={restablecer}
                        disabled={cotizando}
                        className={`rounded-full border border-blue-100 bg-white px-5 py-2.5 text-sm font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] ${FOCO}`}
                    >
                        Restablecer lista
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-4">
                {noCotizados > 0 ? (
                    // El mensaje del backend repite la lista completa; aquí solo va el resumen y el detalle queda al final.
                    <p className="rounded-2xl border border-[#F3DFA2] bg-[#FFF8E1] px-5 py-4 text-sm text-[#6B5200]">
                        <span className="font-semibold">
                            {noCotizados === 1
                                ? '1 ingrediente no se pudo cotizar'
                                : `${noCotizados} ingredientes no se pudieron cotizar`}
                        </span>{' '}
                        y no {noCotizados === 1 ? 'está incluido' : 'están incluidos'} en el total.{' '}
                        <a href="#no-cotizados" className={`font-semibold underline ${FOCO}`}>
                            Ver detalle
                        </a>
                    </p>
                ) : (
                    canasta?.message && (
                        <p className="rounded-2xl border border-blue-100 bg-[#F4F7FB] px-5 py-4 text-sm text-[#42516A]">
                            {canasta.message}
                        </p>
                    )
                )}
                {canasta && canasta.warnings.length > 0 && (
                    <ListaSimple titulo="Avisos de la cotización" items={canasta.warnings} tono="aviso" />
                )}

                {errorCotizacion && (
                    <div
                        role="alert"
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F5C2BF] bg-[#FDECEA] px-5 py-4 text-sm font-medium text-[#A12A1F]"
                    >
                        <span>{errorCotizacion.mensaje}</span>
                        {fallo && (
                            <button
                                type="button"
                                onClick={() => {
                                    setErrorCotizacion(null);
                                    setIntento((n) => n + 1);
                                }}
                                className={`${BOTON_CHICO} border-[#F5C2BF] bg-white text-[#A12A1F]`}
                            >
                                Reintentar
                            </button>
                        )}
                    </div>
                )}
                <p aria-live="polite" className={cotizando ? 'text-sm font-semibold text-[#0B5FD0]' : 'sr-only'}>
                    {cotizando ? 'Actualizando precios…' : ''}
                </p>

                {ahorroPosible > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#BFE3C6] bg-[#EAF7EC] px-5 py-4 text-sm text-[#1E6B34]">
                        <span>
                            Hay productos más baratos para algunos ingredientes. Podrías ahorrar{' '}
                            <strong>{CLP.format(ahorroPosible)}</strong>.
                        </span>
                        <button
                            type="button"
                            onClick={usarTodasLasAlternativas}
                            disabled={cotizando}
                            className={`rounded-full bg-[#1E6B34] px-5 py-2 font-semibold text-white transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`}
                        >
                            Usar todas las alternativas más baratas
                        </button>
                    </div>
                )}

                {lineas.length === 0 ? (
                    <div className="rounded-[28px] border border-dashed border-blue-200 bg-white p-8 text-center">
                        <p className="font-semibold text-[#0A2350]">No hay ingredientes para cotizar.</p>
                        <p className="mt-1 text-[15px] text-[#42516A]">
                            Este menú no tiene comidas caseras o no encontramos sus ingredientes en Lider.
                        </p>
                    </div>
                ) : (
                    <div
                        aria-busy={cotizando}
                        className={`overflow-hidden rounded-[28px] bg-white shadow-[0_16px_40px_rgba(10,35,80,0.08)] transition ${cotizando ? 'opacity-70' : ''}`}
                    >
                        <ul className="divide-y divide-blue-50">
                            {lineas.map((linea) => {
                                const unidades = unidadesDe(linea);
                                const paso = pasoDe(linea);
                                const loTiene = unidades === 0;
                                const nombre = linea.ingredient;
                                const alternativa = linea.cheaper_alternative;
                                const esPorDefecto = linea.selected.sku === productoPorDefecto(linea).sku;
                                return (
                                    <li
                                        key={nombre}
                                        className={`flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 sm:px-7 ${loTiene ? 'bg-[#F8FAFD]' : ''}`}
                                    >
                                        <div className={`min-w-[200px] flex-1 ${loTiene ? 'opacity-60' : ''}`}>
                                            <p
                                                className={`font-bold capitalize text-[#0A2350] ${loTiene ? 'line-through' : ''}`}
                                            >
                                                {nombre}
                                            </p>
                                            <p className="text-sm text-[#42516A]">
                                                {linea.selected.name} · {describirEnvase(linea)} ·{' '}
                                                {CLP.format(linea.selected.price)}
                                            </p>
                                            {linea.selected.price_stale && (
                                                <span className="mt-1 inline-block rounded-full bg-[#FFF8E1] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#6B5200]">
                                                    Precio desactualizado
                                                </span>
                                            )}
                                            {!loTiene && (
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    {linea.options.length > 1 && (
                                                        <label className="flex items-center gap-2 text-xs font-semibold text-[#42516A]">
                                                            <span className="sr-only">Producto para {nombre}</span>
                                                            <select
                                                                value={linea.selected.sku}
                                                                onChange={(e) => elegirProducto(linea, e.target.value)}
                                                                disabled={cotizando}
                                                                className={`max-w-[280px] rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-xs text-[#0F1B2D] ${FOCO}`}
                                                            >
                                                                {linea.options.map((o) => (
                                                                    <option key={o.sku} value={o.sku}>
                                                                        {describirOpcion(o)}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </label>
                                                    )}
                                                    {alternativa && (
                                                        <button
                                                            type="button"
                                                            onClick={() => elegirProducto(linea, alternativa.sku)}
                                                            disabled={cotizando}
                                                            className={`${BOTON_CHICO} border-[#BFE3C6] bg-[#EAF7EC] text-[#1E6B34] hover:border-[#1E6B34]`}
                                                        >
                                                            Cambiar por {alternativa.name} · ahorra {CLP.format(alternativa.savings)}
                                                        </button>
                                                    )}
                                                    {!esPorDefecto && (
                                                        <button
                                                            type="button"
                                                            onClick={() => elegirProducto(linea, productoPorDefecto(linea).sku)}
                                                            disabled={cotizando}
                                                            className={`${BOTON_CHICO} border-blue-100 bg-white text-[#0A2350] hover:border-[#0B5FD0]`}
                                                        >
                                                            Volver al producto sugerido
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => cambiarUnidades(linea, unidades - paso)}
                                                disabled={cotizando || unidades <= 0}
                                                aria-label={`Quitar ${NUMERO.format(paso)} de ${nombre}`}
                                                className={BOTON_PASO}
                                            >
                                                −
                                            </button>
                                            <span
                                                aria-label={`${NUMERO.format(unidades)} de ${NUMERO.format(linea.selected.packages)} ${linea.selected.sold_by_weight ? '' : 'unidades '}de ${nombre}`}
                                                className="min-w-[64px] text-center text-[15px] font-bold text-[#0A2350]"
                                            >
                                                {NUMERO.format(unidades)}
                                                <span className="font-medium text-[#8A97AB]">
                                                    {' '}
                                                    / {NUMERO.format(linea.selected.packages)}
                                                </span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => cambiarUnidades(linea, unidades + paso)}
                                                disabled={cotizando || unidades >= linea.selected.packages}
                                                aria-label={`Agregar ${NUMERO.format(paso)} de ${nombre}`}
                                                className={BOTON_PASO}
                                            >
                                                +
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => cambiarUnidades(linea, loTiene ? linea.selected.packages : 0)}
                                            aria-pressed={loTiene}
                                            disabled={cotizando}
                                            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${FOCO} ${
                                                loTiene
                                                    ? 'border-[#0B5FD0] bg-blue-50 text-[#0B5FD0]'
                                                    : 'border-blue-100 bg-white text-[#0A2350] hover:border-[#0B5FD0]'
                                            }`}
                                        >
                                            {loTiene ? '✓ Ya lo tengo' : 'Ya lo tengo'}
                                        </button>

                                        <p className="w-[96px] text-right font-bold text-[#0A2350]">
                                            {CLP.format(costoDe(linea))}
                                        </p>
                                    </li>
                                );
                            })}
                        </ul>

                        <div
                            aria-live="polite"
                            className="flex flex-wrap items-end justify-between gap-4 border-t border-blue-100 bg-[#F4F7FB] px-5 py-5 sm:px-7"
                        >
                            <div className="text-sm text-[#42516A]">
                                {ahorro > 0 || ahorroProductos > 0 ? (
                                    <>
                                        <p>
                                            Cotización original:{' '}
                                            {CLP.format(hayCambiosDeProducto && canasta ? canasta.total_default : totalOriginal)}
                                        </p>
                                        {ahorroProductos > 0 && (
                                            <p className="font-semibold text-[#1E6B34]">
                                                Ahorras {CLP.format(ahorroProductos)} por cambio de productos
                                            </p>
                                        )}
                                        {ahorro > 0 && (
                                            <p className="font-semibold text-[#1E6B34]">
                                                Ahorras {CLP.format(ahorro)} con lo que tienes en tu despensa
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p>Precios del catálogo de Lider.</p>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold uppercase tracking-wide text-[#0B5FD0]">Total a comprar</p>
                                <p className={`${DISPLAY} text-[36px] font-extrabold leading-tight text-[#0A2350]`}>
                                    {CLP.format(total)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {canasta && (
                    <>
                        <ListaSimple titulo="Ya en tu despensa (no se cotizan)" items={canasta.in_pantry} tono="info" />
                        <ListaSimple
                            id="no-cotizados"
                            titulo="No encontramos estos ingredientes en Lider"
                            items={canasta.not_quoted}
                            tono="aviso"
                        />
                    </>
                )}
            </div>
        </section>
    );
}
