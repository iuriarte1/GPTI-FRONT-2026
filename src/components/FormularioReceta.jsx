import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSesionVencida } from '../hooks/useSesionVencida';
import { editarReceta } from '../api/admin';
import { ALERGENOS, ENFOQUES, TIPOS_DIETA } from '../constants/recetas';

const DISPLAY = "font-['Bricolage_Grotesque',sans-serif]";

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5FD0]';

const CAMPO = `w-full rounded-xl border bg-white px-4 py-3 text-base text-[#0F1B2D] transition placeholder:text-[#8A97AB] focus:border-[#0B5FD0] ${FOCO}`;
const OPCION = 'flex cursor-pointer items-center gap-3 rounded-full border border-blue-100 bg-white px-5 py-3 font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] has-checked:border-[#0B5FD0] has-checked:bg-blue-50';
const CONTROL = `h-4 w-4 shrink-0 accent-[#0B5FD0] ${FOCO}`;
const ETIQUETA = 'mb-1.5 block text-sm font-semibold text-[#0A2350]';
const TEXTO_ERROR = 'mt-1.5 text-sm text-[#C0392B]';

function lineasDe(texto) {
    return texto
        .split('\n')
        .map((linea) => linea.trim())
        .filter(Boolean);
}

// Mismas reglas que valida el back (RecipeIn).
function validar({ titulo, porciones, enfoques, ingredientes, instrucciones }) {
    const errores = {};
    const largo = titulo.trim().length;
    if (largo < 3 || largo > 120) errores.titulo = 'El título debe tener entre 3 y 120 caracteres.';
    const n = Number(porciones);
    if (!/^\d+$/.test(porciones.trim()) || n < 1 || n > 12) errores.porciones = 'Ingresa un número entero entre 1 y 12.';
    if (enfoques.length === 0) errores.enfoques = 'Elige al menos un enfoque.';
    if (lineasDe(ingredientes).length < 2) errores.ingredientes = 'Ingresa al menos 2 ingredientes, uno por línea.';
    if (instrucciones.trim().length < 20) errores.instrucciones = 'Las instrucciones deben tener al menos 20 caracteres.';
    return errores;
}

// Usa <dialog> nativo: showModal() bloquea el fondo, atrapa el foco y cierra con Escape.
export default function FormularioReceta({ receta, onGuardado, onCancelar }) {
    const { token } = useAuth();
    const manejarSesion = useSesionVencida();
    const dialogRef = useRef(null);

    const [titulo, setTitulo] = useState(receta.title);
    const [porciones, setPorciones] = useState(String(receta.servings));
    const [tiempo, setTiempo] = useState(receta.prep_time ?? '');
    const [dieta, setDieta] = useState(receta.diet_type);
    const [alergenos, setAlergenos] = useState(receta.allergens);
    const [enfoques, setEnfoques] = useState(receta.diet_focus);
    const [ingredientes, setIngredientes] = useState(receta.ingredients.join('\n'));
    const [instrucciones, setInstrucciones] = useState(receta.instructions);
    const [errores, setErrores] = useState({});
    const [errorGeneral, setErrorGeneral] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (dialog && !dialog.open) dialog.showModal();
    }, []);

    function alternar(lista, setLista, valor) {
        setLista(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);
    }

    function cancelar() {
        if (guardando) return;
        onCancelar();
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setErrorGeneral('');

        const nuevosErrores = validar({ titulo, porciones, enfoques, ingredientes, instrucciones });
        setErrores(nuevosErrores);
        if (Object.keys(nuevosErrores).length > 0) return;

        setGuardando(true);
        try {
            const actualizada = await editarReceta(token, receta.id, {
                title: titulo.trim(),
                servings: Number(porciones),
                prep_time: tiempo.trim() || null,
                diet_type: dieta,
                allergens: alergenos,
                diet_focus: enfoques,
                ingredients: lineasDe(ingredientes),
                instructions: instrucciones.trim(),
            });
            onGuardado(actualizada);
        } catch (error) {
            if (manejarSesion(error)) return;
            setErrorGeneral(error.message);
            setGuardando(false);
        }
    }

    const borde = (campo) => (errores[campo] ? 'border-[#D9534F]' : 'border-blue-100');

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="editar-receta-titulo"
            onCancel={(e) => {
                e.preventDefault();
                cancelar();
            }}
            className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[720px] overflow-y-auto rounded-[28px] bg-white p-0 text-[#0F1B2D] shadow-[0_24px_60px_rgba(10,35,80,0.25)] backdrop:bg-[#0A2350]/50 backdrop:backdrop-blur-sm"
        >
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 p-7 sm:p-8">
                <div>
                    <h2
                        id="editar-receta-titulo"
                        className={`${DISPLAY} text-2xl font-extrabold tracking-tight text-[#0A2350]`}
                    >
                        Editar receta
                    </h2>
                    <p className="mt-1 text-[15px] text-[#42516A]">
                        Corrige lo que haga falta antes de aprobarla. Al guardar se vuelven a calcular las advertencias
                        de alérgenos.
                    </p>
                </div>

                <div>
                    <label htmlFor="receta-titulo" className={ETIQUETA}>
                        Título
                    </label>
                    <input
                        id="receta-titulo"
                        type="text"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        aria-invalid={errores.titulo ? 'true' : 'false'}
                        aria-describedby={errores.titulo ? 'receta-titulo-error' : undefined}
                        className={`${CAMPO} ${borde('titulo')}`}
                    />
                    {errores.titulo && (
                        <p id="receta-titulo-error" className={TEXTO_ERROR}>
                            {errores.titulo}
                        </p>
                    )}
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                        <label htmlFor="receta-porciones" className={ETIQUETA}>
                            Porciones
                        </label>
                        <input
                            id="receta-porciones"
                            type="text"
                            inputMode="numeric"
                            value={porciones}
                            onChange={(e) => setPorciones(e.target.value)}
                            aria-invalid={errores.porciones ? 'true' : 'false'}
                            aria-describedby={errores.porciones ? 'receta-porciones-error' : undefined}
                            className={`${CAMPO} ${borde('porciones')}`}
                        />
                        {errores.porciones && (
                            <p id="receta-porciones-error" className={TEXTO_ERROR}>
                                {errores.porciones}
                            </p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="receta-tiempo" className={ETIQUETA}>
                            Tiempo de preparación (opcional)
                        </label>
                        <input
                            id="receta-tiempo"
                            type="text"
                            value={tiempo}
                            onChange={(e) => setTiempo(e.target.value)}
                            placeholder="Ej: 30 mins"
                            className={`${CAMPO} border-blue-100`}
                        />
                    </div>
                </div>

                <fieldset>
                    <legend className={ETIQUETA}>Tipo de dieta</legend>
                    <div className="flex flex-wrap gap-3">
                        {TIPOS_DIETA.map(({ value, label }) => (
                            <label key={value} className={OPCION}>
                                <input
                                    type="radio"
                                    name="receta-dieta"
                                    value={value}
                                    checked={dieta === value}
                                    onChange={() => setDieta(value)}
                                    className={CONTROL}
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                </fieldset>

                <fieldset>
                    <legend className={ETIQUETA}>Alérgenos que contiene</legend>
                    <div className="flex flex-wrap gap-3">
                        {ALERGENOS.map(({ value, label }) => (
                            <label key={value} className={OPCION}>
                                <input
                                    type="checkbox"
                                    value={value}
                                    checked={alergenos.includes(value)}
                                    onChange={() => alternar(alergenos, setAlergenos, value)}
                                    className={CONTROL}
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                </fieldset>

                <fieldset>
                    <legend className={ETIQUETA}>Enfoque nutricional</legend>
                    <div className="flex flex-wrap gap-3">
                        {ENFOQUES.map(({ value, label }) => (
                            <label key={value} className={OPCION}>
                                <input
                                    type="checkbox"
                                    value={value}
                                    checked={enfoques.includes(value)}
                                    onChange={() => alternar(enfoques, setEnfoques, value)}
                                    className={CONTROL}
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                    {errores.enfoques && <p className={TEXTO_ERROR}>{errores.enfoques}</p>}
                </fieldset>

                <div>
                    <label htmlFor="receta-ingredientes" className={ETIQUETA}>
                        Ingredientes (uno por línea)
                    </label>
                    <textarea
                        id="receta-ingredientes"
                        value={ingredientes}
                        onChange={(e) => setIngredientes(e.target.value)}
                        rows={6}
                        aria-invalid={errores.ingredientes ? 'true' : 'false'}
                        aria-describedby={errores.ingredientes ? 'receta-ingredientes-error' : undefined}
                        placeholder={'450 g de carne molida\n1 cebolla'}
                        className={`${CAMPO} ${borde('ingredientes')}`}
                    />
                    {errores.ingredientes && (
                        <p id="receta-ingredientes-error" className={TEXTO_ERROR}>
                            {errores.ingredientes}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="receta-instrucciones" className={ETIQUETA}>
                        Instrucciones
                    </label>
                    <textarea
                        id="receta-instrucciones"
                        value={instrucciones}
                        onChange={(e) => setInstrucciones(e.target.value)}
                        rows={5}
                        aria-invalid={errores.instrucciones ? 'true' : 'false'}
                        aria-describedby={errores.instrucciones ? 'receta-instrucciones-error' : undefined}
                        className={`${CAMPO} ${borde('instrucciones')}`}
                    />
                    {errores.instrucciones && (
                        <p id="receta-instrucciones-error" className={TEXTO_ERROR}>
                            {errores.instrucciones}
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

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={cancelar}
                        disabled={guardando}
                        className={`rounded-full border border-blue-100 px-6 py-3 font-semibold text-[#0A2350] transition hover:border-[#0B5FD0] hover:text-[#0B5FD0] disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={guardando}
                        className={`rounded-full bg-[#0B5FD0] px-7 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none ${FOCO}`}
                    >
                        {guardando ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                </div>
            </form>
        </dialog>
    );
}
