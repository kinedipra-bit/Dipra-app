"use client";

import { useState, useTransition } from "react";
import { calcVolumenBloque } from "@/lib/dipra/calc";
import type { FmsData } from "@/lib/dipra/calc";
import { blockTemplate, nuevosDias, ENFOQUES_PLAN } from "@/lib/dipra/constants";
import type {
  PlanSemana,
  DiaPlan,
  BloquePlan,
  EjercicioPlan,
  EjercicioBiblioteca,
  Sesion,
  CualidadFuerza,
  GrupoMuscular,
  Cita,
  PlantillaRutina,
} from "@/lib/dipra/types";
import {
  compartirSemana,
  crearSemana,
  guardarSemana,
  setSemanaActiva as marcarSemanaActiva,
  guardarEnBiblioteca,
  crearPlantilla,
  eliminarPlantilla,
  eliminarSemana,
} from "./actions";
import { ExerciseRow, EXERCISE_ROW_GRID_EDITABLE } from "./ExerciseRow";
import { ResumenDia } from "./ResumenDia";
import { BarraDeCarga } from "./BarraDeCarga";
import { FmsResumenPlan } from "./FmsResumenPlan";
import { SesionesPorDia } from "@/components/SesionesPorDia";
import { ResumenProgramacion } from "./ResumenProgramacion";
import {
  CUALIDADES,
  GRUPOS_MUSCULARES,
  TABLA_INTENSIDAD,
  aplicarDescansoSugerido,
  descansoDisponible,
} from "@/lib/dipra/tablaIntensidad";

type Vista = "editar" | "resumen-dia" | "resumen-semana";

function nuevoEjercicio(): EjercicioPlan {
  return {
    id: crypto.randomUUID(),
    nombre: "",
    series: 3,
    reps: 10,
    kg: 0,
    link: "",
    rpe: "",
    rir: "",
    tut: "",
    descanso: "",
    comentarioCliente: "",
  };
}

// IDs nuevos en todo el árbol — para "Copiar día" (de otro día de la misma
// semana a este), evita que choquen ids entre el día copiado y el original.
function clonarBloques(bloques: BloquePlan[]): BloquePlan[] {
  return bloques.map((b) => ({
    ...b,
    id: crypto.randomUUID(),
    exercises: b.exercises.map((e) => ({ ...e, id: crypto.randomUUID() })),
  }));
}

// Al clonar una semana (nueva semana o plantilla), el comentario que el
// CLIENTE haya escrito en un ejercicio (ex.comentarioCliente, editable desde
// el portal) no debe arrastrarse — vive pegado al id del ejercicio, y como
// "+ Nueva semana" clona bloques/ejercicios con el MISMO id que la semana
// anterior (ver comentario en crearNuevaSemana), un comentario de una
// semana vieja podía seguir apareciendo en la nueva sin que nadie lo haya
// escrito ahí.
function limpiarComentariosCliente(dias: DiaPlan[]): DiaPlan[] {
  return dias.map((d) => ({
    ...d,
    bloques: d.bloques.map((b) => ({
      ...b,
      exercises: b.exercises.map((e) => ({ ...e, comentarioCliente: "" })),
    })),
  }));
}

/**
 * Pestaña "Plan" del detalle de cliente. Migrado desde PlanTab
 * (dipra-app.jsx líneas 1287-1516).
 *
 * Decisión de persistencia: a diferencia del prototipo (que mutaba el
 * estado local en cada cambio y dejaba la persistencia a otro mecanismo),
 * acá se sigue el patrón ya establecido en FichaForm: los cambios de
 * contenido (mesociclo/objetivo/foco/bloques/ejercicios) se acumulan en
 * estado local y se persisten enteros con "Guardar cambios" — evita
 * disparar un update de todo el jsonb `dias` en cada tecla. Las acciones
 * estructurales (crear semana, cambiar la semana activa) sí se persisten
 * al toque, porque son navegación/alta, no edición de contenido.
 */
export function PlanView({
  clienteId,
  fms,
  semanaActivaId: semanaActivaIdInicial,
  semanasIniciales,
  bibliotecaInicial,
  sesiones,
  citas,
  plantillasIniciales,
}: {
  clienteId: string;
  fms: FmsData | null | undefined;
  semanaActivaId: string | null;
  semanasIniciales: PlanSemana[];
  bibliotecaInicial: EjercicioBiblioteca[];
  sesiones: Sesion[];
  citas: Pick<Cita, "fecha" | "hora" | "dia_plan_label">[];
  plantillasIniciales: PlantillaRutina[];
}) {
  const [semanas, setSemanas] = useState<PlanSemana[]>(semanasIniciales);
  // `semanaActivaId` es la semana que se está VIENDO/EDITANDO en esta
  // pantalla — no necesariamente la que el cliente ve en su portal.
  // `clienteVeSemanaId` es esa última: solo cambia con una acción explícita
  // (crear una semana nueva, usar una plantilla, o "Hacer esta la semana
  // activa"). Antes tocar la pestaña de CUALQUIER semana para revisarla ya
  // la volvía la activa para el cliente — mirar una semana vieja de
  // referencia le cambiaba sin querer a Karin qué semana veía en su portal.
  const [semanaActivaId, setSemanaActivaId] = useState<string | null>(
    semanaActivaIdInicial ?? semanasIniciales[0]?.id ?? null
  );
  const [clienteVeSemanaId, setClienteVeSemanaId] = useState<string | null>(
    semanaActivaIdInicial ?? semanasIniciales[0]?.id ?? null
  );
  const [activando, startActivar] = useTransition();
  const [borrando, startBorrar] = useTransition();
  const [diaIdx, setDiaIdx] = useState(0);
  const [diaFuenteCopiaId, setDiaFuenteCopiaId] = useState("");
  const [vista, setVista] = useState<Vista>("editar");
  const [biblioteca, setBiblioteca] = useState<EjercicioBiblioteca[]>(bibliotecaInicial);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [creando, startCrear] = useTransition();
  const [guardando, startGuardar] = useTransition();
  const [compartiendo, startCompartir] = useTransition();
  const [sharedAt, setSharedAt] = useState<number | null>(null);

  // Biblioteca de rutinas: guardar la semana actual como plantilla
  // reutilizable, y cargar una plantilla guardada como punto de partida de
  // una semana nueva (en vez de clonar la semana activa, como hace
  // "+ Nueva semana").
  const [plantillas, setPlantillas] = useState<PlantillaRutina[]>(plantillasIniciales);
  const [mostrarGuardarPlantilla, setMostrarGuardarPlantilla] = useState(false);
  const [tituloPlantilla, setTituloPlantilla] = useState("");
  const [alcancePlantilla, setAlcancePlantilla] = useState<"cliente" | "general">("cliente");
  const [plantillaElegidaId, setPlantillaElegidaId] = useState("");
  const [guardandoPlantilla, startGuardarPlantilla] = useTransition();

  const semanaIdx = Math.max(
    0,
    semanas.findIndex((s) => s.id === semanaActivaId)
  );
  const semana = semanas[semanaIdx];
  const dia = semana?.dias[diaIdx];

  // Posición de la semana actual dentro de su mesociclo (por nombre) — para
  // la cuenta regresiva de fin de ciclo. Cuenta solo semanas con el mismo
  // nombre de mesociclo, en el orden en que quedaron creadas.
  const semanasDelMesociclo = semana ? semanas.filter((s) => s.mesociclo === semana.mesociclo) : [];
  const semanaEnMesociclo = semana ? semanasDelMesociclo.findIndex((s) => s.id === semana.id) + 1 : 0;
  const cicloCompleto = semana ? semanaEnMesociclo >= semana.duracion_semanas : false;
  const enfoqueEsPreset = semana ? (ENFOQUES_PLAN as readonly string[]).includes(semana.objetivo) : true;

  const updateSemana = (next: PlanSemana) => {
    setSemanas((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  };
  const updateDia = (nextDia: DiaPlan) => {
    if (!semana) return;
    const nextDias = semana.dias.map((d, i) => (i === diaIdx ? nextDia : d));
    updateSemana({ ...semana, dias: nextDias });
  };

  // Clona la semana activa como punto de partida (mismo comportamiento que
  // agregarSemana en el prototipo: solo se regeneran los ids de los días,
  // bloques y ejercicios se clonan tal cual). Si todavía no hay ninguna
  // semana, arranca desde la plantilla en blanco de nuevosDias().
  const crearNuevaSemana = () => {
    const id = crypto.randomUUID();
    const numero = semanas.length + 1;
    const mesociclo = semana?.mesociclo ?? "";
    const objetivo = semana?.objetivo ?? "";
    const duracion_semanas = semana?.duracion_semanas ?? 6;
    const dias: DiaPlan[] = semana
      ? limpiarComentariosCliente(structuredClone(semana.dias).map((d: DiaPlan) => ({ ...d, id: crypto.randomUUID() })))
      : nuevosDias();

    startCrear(async () => {
      const creada = await crearSemana(clienteId, { id, numero, mesociclo, objetivo, duracion_semanas, dias });
      setSemanas((prev) => [...prev, creada]);
      setSemanaActivaId(creada.id);
      // crearSemana ya la activó server-side — se refleja acá también.
      setClienteVeSemanaId(creada.id);
      setDiaIdx(0);
      setVista("editar");
    });
  };

  // Abre el panel de guardado con un título ya sugerido (mesociclo/objetivo
  // de la semana actual) — el título es obligatorio para guardar, así toda
  // plantilla queda identificable en la biblioteca.
  const abrirGuardarPlantilla = () => {
    if (!semana) return;
    setTituloPlantilla([semana.objetivo, semana.mesociclo].filter(Boolean).join(" · "));
    setAlcancePlantilla("cliente");
    setMostrarGuardarPlantilla(true);
  };

  const guardarComoPlantilla = () => {
    if (!semana || !tituloPlantilla.trim()) return;
    startGuardarPlantilla(async () => {
      const creada = await crearPlantilla(clienteId, alcancePlantilla === "general" ? null : clienteId, {
        titulo: tituloPlantilla.trim(),
        mesociclo: semana.mesociclo,
        objetivo: semana.objetivo,
        dias: structuredClone(semana.dias),
      });
      setPlantillas((prev) => [creada, ...prev]);
      setMostrarGuardarPlantilla(false);
      setTituloPlantilla("");
    });
  };

  const borrarPlantilla = (id: string) => {
    if (!window.confirm("¿Eliminar esta plantilla de la biblioteca de rutinas?")) return;
    setPlantillas((prev) => prev.filter((p) => p.id !== id));
    void eliminarPlantilla(clienteId, id);
  };

  // Crea una semana nueva a partir de una plantilla de la biblioteca (en vez
  // de clonar la semana activa, como hace crearNuevaSemana) — regenera
  // todos los ids (día, bloques, ejercicios) porque una plantilla se reusa
  // muchas veces, a diferencia del clon puntual de la semana activa.
  const usarPlantilla = () => {
    const plantilla = plantillas.find((p) => p.id === plantillaElegidaId);
    if (!plantilla) return;
    const id = crypto.randomUUID();
    const numero = semanas.length + 1;
    const dias: DiaPlan[] = limpiarComentariosCliente(
      structuredClone(plantilla.dias).map((d: DiaPlan) => ({
        ...d,
        id: crypto.randomUUID(),
        bloques: clonarBloques(d.bloques),
      }))
    );

    startCrear(async () => {
      const creada = await crearSemana(clienteId, {
        id,
        numero,
        mesociclo: plantilla.mesociclo,
        objetivo: plantilla.objetivo,
        duracion_semanas: semana?.duracion_semanas ?? 6,
        dias,
      });
      setSemanas((prev) => [...prev, creada]);
      setSemanaActivaId(creada.id);
      setClienteVeSemanaId(creada.id);
      setDiaIdx(0);
      setVista("editar");
      setPlantillaElegidaId("");
    });
  };

  // Solo cambia qué semana se está VIENDO en esta pantalla — ya no activa
  // nada server-side por sí sola (ver nota junto a clienteVeSemanaId).
  const seleccionarSemana = (id: string) => {
    setSemanaActivaId(id);
    setDiaIdx(0);
  };

  // Acción explícita para que el cliente pase a ver ESTA semana en su
  // portal — antes esto pasaba solo con tocar la pestaña de la semana.
  const activarParaCliente = (id: string) => {
    startActivar(async () => {
      await marcarSemanaActiva(clienteId, id);
      setClienteVeSemanaId(id);
    });
  };

  // Borra una semana (ej. quedó una vacía por un corrimiento de numeración)
  // y renumera el resto 1..N para no dejar huecos — ver eliminarSemana en
  // actions.ts, que hace lo mismo server-side.
  const borrarSemana = (id: string) => {
    const target = semanas.find((s) => s.id === id);
    if (!target) return;
    if (!window.confirm(`¿Eliminar Semana ${target.numero}${target.mesociclo ? ` (${target.mesociclo})` : ""}? Se van a perder todos sus días, bloques y ejercicios planificados.`)) {
      return;
    }
    startBorrar(async () => {
      await eliminarSemana(clienteId, id);
      const restantes = semanas
        .filter((s) => s.id !== id)
        .sort((a, b) => a.numero - b.numero)
        .map((s, i) => ({ ...s, numero: i + 1 }));
      setSemanas(restantes);
      if (semanaActivaId === id) {
        setSemanaActivaId(restantes[0]?.id ?? null);
        setDiaIdx(0);
      }
      if (clienteVeSemanaId === id) {
        setClienteVeSemanaId(restantes[restantes.length - 1]?.id ?? null);
      }
    });
  };

  const guardarCambios = () => {
    if (!semana) return;
    startGuardar(async () => {
      await guardarSemana(clienteId, semana.id, {
        mesociclo: semana.mesociclo,
        objetivo: semana.objetivo,
        duracion_semanas: semana.duracion_semanas,
        dias: semana.dias,
      });
      updateSemana({ ...semana, cambios_sin_compartir: true });
      setSavedAt(Date.now());
    });
  };

  // "Compartir rutina": recién acá el cliente pasa a ver esto en su portal
  // (hasta entonces, sigue viendo la última versión compartida).
  // Comparte lo que está EN PANTALLA en este momento — antes publicaba
  // `dias` tal como estaba guardado en la base (compartirSemana lee la
  // columna directo), así que si había ediciones todavía no guardadas con
  // "Guardar cambios", "Compartir rutina" las dejaba afuera sin avisar: el
  // cliente seguía viendo la versión anterior aunque el profesional ya
  // hubiera tocado "Compartir". Ahora guarda primero, siempre.
  const compartirRutina = () => {
    if (!semana) return;
    startCompartir(async () => {
      await guardarSemana(clienteId, semana.id, {
        mesociclo: semana.mesociclo,
        objetivo: semana.objetivo,
        duracion_semanas: semana.duracion_semanas,
        dias: semana.dias,
      });
      await compartirSemana(clienteId, semana.id);
      updateSemana({ ...semana, dias_publicado: semana.dias, cambios_sin_compartir: false });
      setSharedAt(Date.now());
    });
  };

  const guardarEjercicioEnBiblioteca = async (ex: { nombre: string; link: string }) => {
    const creado = await guardarEnBiblioteca(ex.nombre, ex.link);
    setBiblioteca((prev) => [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)));
  };

  const addExercise = (bIdx: number) => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    const bloque = nextDia.bloques[bIdx];
    // "Tiempo" (tiempoSerie) es trabajo isométrico/por tiempo, no una
    // medida de intensidad — nunca se autocompleta, queda siempre vacío
    // hasta que el profesional lo cargue a mano si corresponde.
    const ex = nuevoEjercicio();
    bloque.exercises.push(ex);
    updateDia(nextDia);
  };
  const changeExercise = (bIdx: number, eIdx: number, nextEx: EjercicioPlan) => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques[bIdx].exercises[eIdx] = nextEx;
    updateDia(nextDia);
  };
  const removeExercise = (bIdx: number, eIdx: number) => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques[bIdx].exercises.splice(eIdx, 1);
    updateDia(nextDia);
  };
  const addBloque = () => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques.push({ id: crypto.randomUUID(), title: "Nuevo bloque", exercises: [] });
    updateDia(nextDia);
  };
  const insertBloqueAfter = (bIdx: number) => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques.splice(bIdx + 1, 0, { id: crypto.randomUUID(), title: "Nuevo bloque", exercises: [] });
    updateDia(nextDia);
  };
  const renameBloque = (bIdx: number, title: string) => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    // Grupo muscular y cualidad se asignan solo a mano (selectores de al
    // lado) — no se adivinan del título, para que la sugerencia semanal de
    // sets solo cuente bloques que el profesional describió explícitamente.
    nextDia.bloques[bIdx].title = title;
    updateDia(nextDia);
  };
  const removeBloque = (bIdx: number) => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques.splice(bIdx, 1);
    updateDia(nextDia);
  };
  const setBloqueCualidad = (bIdx: number, cualidad: CualidadFuerza | "") => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques[bIdx].cualidad = cualidad || undefined;
    updateDia(nextDia);
  };
  const setBloqueGrupoMuscular = (bIdx: number, grupoMuscular: GrupoMuscular | "") => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques[bIdx].grupoMuscular = grupoMuscular || undefined;
    updateDia(nextDia);
  };
  const aplicarDescanso = (bIdx: number) => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques[bIdx] = aplicarDescansoSugerido(nextDia.bloques[bIdx]);
    updateDia(nextDia);
  };

  // Días agregables/eliminables sobre la semana ACTIVA que se está editando
  // (no confundir con nuevosDias(), que solo se usa para la plantilla fija
  // de 4 días al crear la primera semana / clonar una semana nueva). El
  // label autogenerado es editable después vía renameDia.
  const addDia = () => {
    if (!semana) return;
    // El número sugerido es el primer "Día N" libre, no `dias.length + 1` —
    // si se borró "Día 1" y quedan 3 días, length+1 ofrecía "Día 4" (que ya
    // existe) en vez de reaparecer "Día 1".
    const usados = new Set(
      semana.dias.map((d) => Number(d.label.match(/^Día (\d+)$/)?.[1])).filter((n) => !Number.isNaN(n))
    );
    let numero = 1;
    while (usados.has(numero)) numero++;
    const nextDias: DiaPlan[] = [
      ...semana.dias,
      { id: crypto.randomUUID(), label: `Día ${numero}`, foco: "", bloques: blockTemplate() },
    ];
    updateSemana({ ...semana, dias: nextDias });
    setDiaIdx(nextDias.length - 1);
  };
  const removeDia = (idx: number) => {
    if (!semana || semana.dias.length <= 1) return;
    const target = semana.dias[idx];
    const ok = window.confirm(
      `¿Eliminar "${target.label}"? Se van a perder todos sus bloques y ejercicios.`
    );
    if (!ok) return;
    const nextDias = semana.dias.filter((_, i) => i !== idx);
    updateSemana({ ...semana, dias: nextDias });
    setDiaIdx((prev) => Math.min(prev, nextDias.length - 1));
  };
  const renameDia = (idx: number, label: string) => {
    if (!semana) return;
    const nextDias = semana.dias.map((d, i) => (i === idx ? { ...d, label } : d));
    updateSemana({ ...semana, dias: nextDias });
  };

  // Copia los bloques de otro día de la MISMA semana sobre el día actual —
  // ej. planificaste el día 1, te equivocaste en el día 2 y no querés
  // volver a armarlo de cero. Pisa los bloques del día actual (con confirm
  // si ya tenía algo cargado); el nombre/foco del día actual no se tocan.
  const copiarDiaDentroDeSemana = () => {
    if (!dia || !semana) return;
    const fuente = semana.dias.find((d) => d.id === diaFuenteCopiaId);
    if (!fuente) return;
    const teniaContenido = dia.bloques.some((b) => b.exercises.length > 0);
    if (teniaContenido && !window.confirm(`¿Reemplazar los bloques de "${dia.label}" por los de "${fuente.label}"?`)) {
      return;
    }
    updateDia({ ...dia, bloques: clonarBloques(fuente.bloques) });
    setDiaFuenteCopiaId("");
  };

  if (!semana) {
    return (
      <div className="flex flex-col gap-5">
        <FmsResumenPlan fms={fms} />
        <div className="dp-surface flex flex-col items-center gap-3 rounded-2xl p-10 text-center shadow-sm">
          <p className="dp-body text-sm">Este cliente todavía no tiene ninguna semana de plan cargada.</p>
          <button
            type="button"
            onClick={crearNuevaSemana}
            disabled={creando}
            className="dp-bg-brand rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {creando ? "Creando…" : "Crear primera semana"}
          </button>
          {plantillas.length > 0 && (
            <>
              <p className="dp-muted text-xs">o empezá de una plantilla de la biblioteca de rutinas</p>
              <div className="flex items-center gap-2">
                <select
                  value={plantillaElegidaId}
                  onChange={(e) => setPlantillaElegidaId(e.target.value)}
                  className="rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none focus:dp-border-brand"
                >
                  <option value="">Elegí una plantilla…</option>
                  {plantillas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.titulo}
                      {p.cliente_id ? "" : " (general)"}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={usarPlantilla}
                  disabled={!plantillaElegidaId || creando}
                  className="dp-text-brand rounded-lg border border-dashed border-black/15 px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
                >
                  Usar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <FmsResumenPlan fms={fms} />

      {semana.id !== clienteVeSemanaId && (
        <div className="dp-bg-faint flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3">
          <p className="dp-body text-sm">
            👁 Estás viendo Semana {semana.numero}
            {semana.mesociclo && ` (${semana.mesociclo})`} — el cliente sigue viendo otra semana en su portal.
          </p>
          <button
            type="button"
            onClick={() => activarParaCliente(semana.id)}
            disabled={activando}
            className="dp-bg-brand shrink-0 rounded-lg px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {activando ? "Activando…" : "Hacer esta la semana activa"}
          </button>
        </div>
      )}

      {semana.cambios_sin_compartir && (
        <div className="dp-bg-amber-soft flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3">
          <p className="dp-text-amber text-sm font-medium">
            ⚠ El cliente todavía NO ve esta versión de Semana {semana.numero}
            {semana.mesociclo && ` (${semana.mesociclo})`} — compartila cuando esté lista.
          </p>
          <button
            type="button"
            onClick={compartirRutina}
            disabled={compartiendo}
            className="dp-bg-ink shrink-0 rounded-lg px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {compartiendo ? "Compartiendo…" : "Compartir ahora"}
          </button>
        </div>
      )}

      <datalist id="biblioteca-datalist">
        {biblioteca.map((b) => (
          <option key={b.id} value={b.nombre} />
        ))}
      </datalist>

      <div className="dp-surface rounded-2xl p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {semanas.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-0.5 rounded-lg ${s.id === semana.id ? "dp-bg-brand" : "dp-bg-faint"}`}
            >
              <button
                type="button"
                onClick={() => seleccionarSemana(s.id)}
                title={s.id === clienteVeSemanaId ? `Semana ${s.numero} — el cliente ve esta` : `Semana ${s.numero}`}
                className={`rounded-lg py-1 pl-2.5 text-xs font-medium transition-colors ${
                  s.id === semana.id ? "text-white" : "dp-body"
                } ${semanas.length > 1 ? "pr-1" : "pr-2.5"}`}
              >
                {s.id === clienteVeSemanaId && "👁 "}
                Semana {s.numero}
                {s.mesociclo && ` · ${s.mesociclo}`}
                {s.objetivo && ` · ${s.objetivo}`}
              </button>
              {semanas.length > 1 && (
                <button
                  type="button"
                  onClick={() => borrarSemana(s.id)}
                  disabled={borrando}
                  title="Eliminar semana"
                  className={`pr-2 text-xs disabled:opacity-40 ${s.id === semana.id ? "text-white/70 hover:text-white" : "dp-muted hover:dp-alert"}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={crearNuevaSemana}
            disabled={creando}
            className="dp-text-brand rounded-lg border border-dashed border-black/15 px-2.5 py-1 text-xs font-medium disabled:opacity-50"
          >
            + {creando ? "Creando…" : "Nueva semana"}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={abrirGuardarPlantilla}
            className="dp-text-brand rounded-lg border border-dashed border-black/15 px-2.5 py-1 text-xs font-medium"
          >
            💾 Guardar como plantilla
          </button>
          {plantillas.length > 0 && (
            <>
              <select
                value={plantillaElegidaId}
                onChange={(e) => setPlantillaElegidaId(e.target.value)}
                className="rounded-lg border border-black/10 px-1.5 py-1 text-xs outline-none focus:dp-border-brand"
              >
                <option value="">Cargar plantilla en una semana nueva…</option>
                {plantillas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titulo}
                    {p.cliente_id ? "" : " (general)"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={usarPlantilla}
                disabled={!plantillaElegidaId || creando}
                className="dp-text-brand rounded-lg border border-dashed border-black/15 px-2.5 py-1 text-xs font-medium disabled:opacity-40"
              >
                Usar
              </button>
              {plantillaElegidaId && (
                <button
                  type="button"
                  onClick={() => borrarPlantilla(plantillaElegidaId)}
                  title="Eliminar esta plantilla de la biblioteca"
                  className="dp-alert text-xs hover:underline"
                >
                  ✕
                </button>
              )}
            </>
          )}
        </div>

        {mostrarGuardarPlantilla && (
          <div className="dp-bg-faint mb-4 flex flex-col gap-2 rounded-lg p-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">Título de la plantilla (obligatorio)</span>
              <input
                value={tituloPlantilla}
                onChange={(e) => setTituloPlantilla(e.target.value)}
                placeholder="Ej. Fuerza máxima, Adaptación, Hipertrofia base…"
                autoFocus
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
              />
            </label>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={alcancePlantilla === "cliente"}
                  onChange={() => setAlcancePlantilla("cliente")}
                />
                Solo para este cliente
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={alcancePlantilla === "general"}
                  onChange={() => setAlcancePlantilla("general")}
                />
                General (disponible para todos)
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={guardarComoPlantilla}
                disabled={!tituloPlantilla.trim() || guardandoPlantilla}
                className="dp-bg-brand w-fit rounded-lg px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {guardandoPlantilla ? "Guardando…" : "Guardar plantilla"}
              </button>
              <button
                type="button"
                onClick={() => setMostrarGuardarPlantilla(false)}
                className="dp-muted text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="mb-2 grid grid-cols-2 gap-4">
          <input
            value={semana.mesociclo || ""}
            onChange={(e) => updateSemana({ ...semana, mesociclo: e.target.value })}
            placeholder="Mesociclo (ej. Mesociclo 5)"
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
          />
          <label className="flex items-center gap-2 text-sm">
            <span className="dp-muted shrink-0 text-xs">Duración del ciclo</span>
            <input
              type="number"
              min={1}
              value={semana.duracion_semanas}
              onChange={(e) => updateSemana({ ...semana, duracion_semanas: Number(e.target.value) || 1 })}
              className="w-16 rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none focus:dp-border-brand"
            />
            <span className="dp-muted text-xs">semanas (sugerido 5-8)</span>
          </label>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <select
            value={enfoqueEsPreset ? semana.objetivo || "" : "Otro"}
            onChange={(e) =>
              updateSemana({ ...semana, objetivo: e.target.value === "Otro" ? "" : e.target.value })
            }
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
          >
            <option value="">Enfoque de la fase…</option>
            {ENFOQUES_PLAN.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
            <option value="Otro">Otro (especificar)</option>
          </select>
          {!enfoqueEsPreset && (
            <input
              value={semana.objetivo || ""}
              onChange={(e) => updateSemana({ ...semana, objetivo: e.target.value })}
              placeholder="Especificá el enfoque de la fase"
              autoFocus
              className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
            />
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="dp-bg-faint dp-body rounded-lg px-2.5 py-1 text-xs font-medium">
            Semana {semanaEnMesociclo} de {semana.duracion_semanas}
            {semana.mesociclo && ` — ${semana.mesociclo}`}
          </span>
          {cicloCompleto && (
            <span className="dp-bg-amber-soft dp-text-amber rounded-lg px-2.5 py-1 text-xs font-medium">
              ⏳ Este ciclo ya cumplió su duración sugerida — al armar la próxima semana, elegí si corresponde
              un enfoque nuevo.
            </span>
          )}
        </div>

        <h3 className="dp-ink mb-1 font-semibold">Carga semanal</h3>
        <BarraDeCarga dias={semana.dias} />
      </div>

      <div className="flex items-center gap-1.5">
        {(
          [
            { id: "editar", label: "Editar" },
            { id: "resumen-dia", label: "Resumen del día" },
            { id: "resumen-semana", label: "Resumen de la semana" },
          ] as const
        ).map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVista(v.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              vista === v.id ? "dp-bg-brand text-white" : "dp-bg-faint dp-body"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {vista === "resumen-semana" ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {semana.dias.map((d) => (
            <div key={d.id} className="w-72 shrink-0">
              <ResumenDia dia={d} />
            </div>
          ))}
        </div>
      ) : vista === "resumen-dia" ? (
        <>
          <div className="flex gap-1.5">
            {semana.dias.map((d, i) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDiaIdx(i)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  i === diaIdx ? "dp-bg-ink text-white" : "dp-bg-faint dp-body"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          {dia && <ResumenDia dia={dia} />}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {semana.dias.map((d, i) => (
              <div
                key={d.id}
                className={`flex items-center gap-0.5 rounded-lg ${i === diaIdx ? "dp-bg-ink" : "dp-bg-faint"}`}
              >
                <button
                  type="button"
                  onClick={() => setDiaIdx(i)}
                  className={`rounded-lg py-1.5 pl-3 text-sm font-medium transition-colors ${
                    i === diaIdx ? "text-white" : "dp-body"
                  } ${semana.dias.length > 1 ? "pr-1" : "pr-3"}`}
                >
                  {d.label}
                </button>
                {semana.dias.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDia(i)}
                    title="Eliminar día"
                    className={`pr-2 text-xs ${i === diaIdx ? "text-white/70 hover:text-white" : "dp-muted hover:dp-alert"}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addDia}
              className="dp-text-brand rounded-lg border border-dashed border-black/15 px-2.5 py-1 text-xs font-medium"
            >
              + Agregar día
            </button>
            {semana.dias.length > 1 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={diaFuenteCopiaId}
                  onChange={(e) => setDiaFuenteCopiaId(e.target.value)}
                  className="rounded-lg border border-black/10 px-1.5 py-1 text-xs outline-none focus:dp-border-brand"
                >
                  <option value="">Copiar día…</option>
                  {semana.dias
                    .filter((d) => d.id !== dia?.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={copiarDiaDentroDeSemana}
                  disabled={!diaFuenteCopiaId}
                  title={`Reemplaza los bloques de ${dia?.label ?? "este día"} por los del día elegido`}
                  className="dp-text-brand rounded-lg border border-dashed border-black/15 px-2.5 py-1 text-xs font-medium disabled:opacity-40"
                >
                  Copiar a {dia?.label}
                </button>
              </div>
            )}
          </div>

          {dia && (
            <div className="dp-surface rounded-2xl p-5 shadow-sm">
              <input
                value={dia.label}
                onChange={(e) => renameDia(diaIdx, e.target.value)}
                placeholder="Nombre del día (ej. Día 1)"
                className="dp-ink mb-2 w-full rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold outline-none focus:dp-border-brand"
              />
              <input
                value={dia.foco}
                onChange={(e) => updateDia({ ...dia, foco: e.target.value })}
                placeholder="Foco del día (ej. Empuje superior / Tracción inferior)"
                className="mb-4 w-full rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
              />

              <SesionesPorDia sesiones={sesiones} diaLabel={dia.label} semanaCreatedAt={semana.created_at} />

              <div className="flex flex-col gap-3">
                {dia.bloques.map((b, bIdx) => {
                  const vol = calcVolumenBloque(b);
                  return (
                    <div key={b.id}>
                      <div className="dp-bg-faint dp-border-brand rounded-xl border-l-4 p-3">
                        <div className="mb-1.5 flex items-center justify-between">
                          <input
                            value={b.title}
                            onChange={(e) => renameBloque(bIdx, e.target.value)}
                            className="dp-ink border-none bg-transparent text-lg font-semibold tracking-wide uppercase outline-none focus:underline"
                            style={{ minWidth: 120 }}
                          />
                          <div className="flex items-center gap-2">
                            <span className="dp-muted font-mono text-xs">{vol.toLocaleString("es-CL")} kg vol.</span>
                            <button
                              type="button"
                              onClick={() => removeBloque(bIdx)}
                              title="Eliminar bloque"
                              className="dp-muted hover:dp-alert text-sm"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          <select
                            value={b.grupoMuscular ?? ""}
                            onChange={(e) => setBloqueGrupoMuscular(bIdx, e.target.value as GrupoMuscular | "")}
                            className="dp-body rounded-md border border-black/10 bg-white px-1.5 py-0.5 text-[11px] outline-none focus:dp-border-brand"
                          >
                            <option value="">Grupo muscular…</option>
                            {GRUPOS_MUSCULARES.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                          <select
                            value={b.cualidad ?? ""}
                            onChange={(e) => setBloqueCualidad(bIdx, e.target.value as CualidadFuerza | "")}
                            className="dp-body rounded-md border border-black/10 bg-white px-1.5 py-0.5 text-[11px] outline-none focus:dp-border-brand"
                          >
                            <option value="">Cualidad de fuerza…</option>
                            {CUALIDADES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          {b.cualidad &&
                            TABLA_INTENSIDAD[b.cualidad] &&
                            (() => {
                              const fila = TABLA_INTENSIDAD[b.cualidad];
                              return (
                                <>
                                  <span className="dp-muted font-mono text-[10px]">
                                    reps {fila.reps} · {fila.porcentaje1RM} · series/ejerc. {fila.seriesPorEjercicio}
                                    · desc. {fila.descanso}
                                  </span>
                                  {descansoDisponible(b) && (
                                    <button
                                      type="button"
                                      onClick={() => aplicarDescanso(bIdx)}
                                      className="dp-text-amber text-[10px] font-medium hover:underline"
                                    >
                                      Aplicar descanso sugerido
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                        </div>

                        {b.exercises.length > 0 && (
                          <div
                            className="dp-muted grid gap-2 pb-1 text-[10px] font-medium tracking-wide uppercase"
                            style={{ gridTemplateColumns: EXERCISE_ROW_GRID_EDITABLE }}
                          >
                            <span>Ejercicio</span>
                            <span className="text-center">Ser.</span>
                            <span className="text-center">Rep.</span>
                            <span className="text-center">Kg</span>
                            <span className="text-right">Vol.</span>
                            <span />
                          </div>
                        )}

                        <div className="divide-y divide-black/5">
                          {b.exercises.map((ex, eIdx) => (
                            <ExerciseRow
                              key={ex.id}
                              ex={ex}
                              onChange={(next) => changeExercise(bIdx, eIdx, next)}
                              onRemove={() => removeExercise(bIdx, eIdx)}
                              biblioteca={biblioteca}
                              onSaveToBiblioteca={guardarEjercicioEnBiblioteca}
                              etiquetaBloque={{ grupoMuscular: b.grupoMuscular, cualidad: b.cualidad }}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => addExercise(bIdx)}
                          className="dp-text-brand mt-2 flex items-center gap-1 text-xs font-medium hover:underline"
                        >
                          + Agregar ejercicio
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => insertBloqueAfter(bIdx)}
                        className="dp-muted hover:dp-text-brand mt-1.5 flex w-full items-center justify-center gap-1 py-1 text-[11px] font-medium"
                      >
                        + Insertar bloque aquí
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={addBloque}
                className="dp-text-brand mt-5 flex items-center gap-1.5 text-sm font-medium hover:underline"
              >
                + Agregar bloque
              </button>
            </div>
          )}

          <ResumenProgramacion dias={semana.dias} citas={citas} />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={guardarCambios}
              disabled={guardando}
              className="dp-bg-brand rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
            {savedAt && !guardando && <span className="dp-muted text-xs">Guardado.</span>}

            <button
              type="button"
              onClick={compartirRutina}
              disabled={compartiendo || !semana.cambios_sin_compartir}
              className="dp-bg-ink rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
              title="El cliente solo ve cambios cuando compartís la rutina"
            >
              {compartiendo ? "Compartiendo…" : "Compartir rutina"}
            </button>
            {sharedAt && !compartiendo ? (
              <span className="dp-text-brand text-xs">✓ Compartida — el cliente ya la ve.</span>
            ) : semana.cambios_sin_compartir ? (
              <span className="dp-alert text-xs">⚠ Cambios sin compartir</span>
            ) : (
              <span className="dp-muted text-xs">✓ El cliente ve esta versión</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
