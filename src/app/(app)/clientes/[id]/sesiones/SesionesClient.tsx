"use client";

import { useState, useTransition } from "react";
import { tonoEscalaPilar } from "@/lib/dipra/calc";
import { agruparPorBloque, ejerciciosDesdeDia } from "@/lib/dipra/agruparEjercicios";
import { PILARES_KEYS, TIPOS_SESION, emptySesionPilares } from "@/lib/dipra/constants";
import { esYoutubeVertical, normalizeLink, youtubeEmbedUrl } from "@/lib/youtube";
import {
  CUALIDADES,
  GRUPOS_MUSCULARES,
  TABLA_INTENSIDAD,
  aplicarDescansoSugerido,
  descansoDisponible,
} from "@/lib/dipra/tablaIntensidad";
import type {
  BloquePlan,
  CualidadFuerza,
  DiaEntrenamiento,
  DiaPlan,
  EjercicioBiblioteca,
  EjercicioPlan,
  EjercicioSesion,
  GrupoMuscular,
  Sesion,
} from "@/lib/dipra/types";
import {
  actualizarEjerciciosSesion,
  actualizarTipoYAutoriaSesion,
  copiarSesionAPlanFuerza,
  copiarSesionATareas,
  crearSesion,
  eliminarSesion,
  marcarSesionRevisada,
  type NuevaSesionInput,
} from "./actions";
import { guardarEnBiblioteca } from "../plan/actions";
import { ExerciseRow, EXERCISE_ROW_GRID_EDITABLE } from "../plan/ExerciseRow";
import { crearPrHistorial } from "../evolucion/actions";
import { METRICS, type MetricKey } from "../evolucion/metricas";
import { EscalaUnoADiez } from "./EscalaUnoADiez";

const inputClass = "rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand";

function nuevoDraft(esPrimeraSesion: boolean): NuevaSesionInput {
  return {
    fecha: new Date().toISOString().slice(0, 10),
    tipo: TIPOS_SESION[0],
    dia_plan_label: "",
    es_primera_sesion: esPrimeraSesion,
    comentarios_pre: "",
    pilares: emptySesionPilares(),
    comentarios: "",
    ejercicios: [],
  };
}

// Nombre de bloque único (no choca con uno ya usado en el registro) para
// "+ Agregar bloque" dentro de la sesión — mismo criterio que PlanView para
// que dos bloques sin renombrar no se vean mezclados en uno solo al
// agruparPorBloque.
function tituloBloqueUnicoEnDraft(ejercicios: EjercicioSesion[]): string {
  const existentes = new Set(ejercicios.map((e) => e.bloqueTitle ?? ""));
  if (!existentes.has("Nuevo bloque")) return "Nuevo bloque";
  let n = 2;
  while (existentes.has(`Nuevo bloque ${n}`)) n++;
  return `Nuevo bloque ${n}`;
}

function nuevoEjercicioSesionVacio(bloqueTitle: string): EjercicioSesion {
  return {
    id: crypto.randomUUID(),
    nombre: "",
    seriesPlan: 0,
    repsPlan: 0,
    kgPlan: 0,
    seriesReal: 3,
    repsReal: 10,
    kgReal: 0,
    bloqueTitle,
    rpe: "",
    extra: true,
  };
}

function nuevoEjercicioExtra(): EjercicioPlan {
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

// Convierte lo planificado en "Ejercicios planificados en esta sesión"
// (mismo formato que Plan/Tareas) a lo que se guarda en el registro de la
// sesión — se usan los valores cargados como si fueran lo realmente hecho
// (seriesReal/repsReal/kgReal), ya que es lo único que tiene sentido acá:
// esta pantalla no tiene el concepto de "planificado vs. real" para algo
// que no viene de un día del plan.
function ejercicioSesionDesdePlan(ex: EjercicioPlan, bloqueTitle: string): EjercicioSesion {
  return {
    id: crypto.randomUUID(),
    nombre: ex.nombre,
    seriesPlan: 0,
    repsPlan: 0,
    kgPlan: 0,
    seriesReal: ex.series,
    repsReal: ex.reps,
    kgReal: ex.kg,
    pesosSeriesReal: ex.pesosSeries,
    repsSeriesReal: ex.repsSeries,
    unilateral: ex.unilateral,
    pesoCadaUno: ex.pesoCadaUno,
    tipoCarga: ex.tipoCarga,
    tiempoSerie: ex.tiempoSerie,
    cargaTipo: ex.cargaTipo,
    vueltas: ex.vueltas,
    link: ex.link,
    notaReps: ex.notaReps,
    rpe: ex.rpe,
    bloqueTitle,
    extra: true,
  };
}

// Camino inverso a ejercicioSesionDesdePlan: una sesión YA REGISTRADA
// (lo que el cliente hizo de verdad, seriesReal/repsReal/kgReal) pasa al
// mismo formato BloquePlan/EjercicioPlan que "Ejercicios planificados en
// esta sesión" — para poder arrancar la planificación de hoy a partir de
// una sesión anterior en vez de empezar de cero, con todos los campos
// editables igual que en Plan (no solo nombre y números).
function ejercicioPlanDesdeSesionPasada(ex: EjercicioSesion): EjercicioPlan {
  return {
    id: crypto.randomUUID(),
    nombre: ex.nombre,
    series: ex.seriesReal,
    reps: ex.repsReal,
    kg: ex.kgReal,
    pesosSeries: ex.pesosSeriesReal,
    repsSeries: ex.repsSeriesReal,
    notaReps: ex.notaReps,
    tiempoSerie: ex.tiempoSerie,
    tipoCarga: ex.tipoCarga,
    cargaTipo: ex.cargaTipo,
    vueltas: ex.vueltas,
    unilateral: ex.unilateral,
    pesoCadaUno: ex.pesoCadaUno,
    link: ex.link ?? "",
    rpe: typeof ex.rpe === "string" ? ex.rpe : "",
    rir: "",
    tut: "",
    descanso: "",
    comentarioCliente: "",
  };
}

function bloquesDesdeSesionPasada(sesion: Sesion): BloquePlan[] {
  return agruparPorBloque(sesion.ejercicios).map((grupo) => ({
    id: crypto.randomUUID(),
    title: grupo.bloqueTitle || "Bloque",
    exercises: grupo.items.map(({ ejercicio }) => ejercicioPlanDesdeSesionPasada(ejercicio)),
  }));
}

function fmtFechaCorta(f: string) {
  const d = new Date(f + "T00:00:00");
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" }).replace(/\.$/, "");
}

// Listado de solo lectura de los ejercicios de una sesión ya registrada,
// agrupado por bloque — se usa tanto en el historial (lista de sesiones
// pasadas) como en el panel de referencia "Sesión anterior" al planificar
// una nueva, para no duplicar el mismo formateo dos veces.
function ListaEjerciciosSesion({ ejercicios }: { ejercicios: EjercicioSesion[] }) {
  return (
    <div className="flex flex-col gap-2">
      {agruparPorBloque(ejercicios).map((grupo, gIdx) => (
        <div key={gIdx}>
          {grupo.bloqueTitle && (
            <p className="dp-text-brand mb-0.5 text-sm font-semibold tracking-wide uppercase">
              {grupo.bloqueTitle}
            </p>
          )}
          <div className="divide-y divide-black/5">
            {grupo.items.map(({ ejercicio: ex }) => {
              const kgPlanTexto =
                ex.pesosSeriesPlan && ex.pesosSeriesPlan.filter((p) => Number(p) > 0).length > 0
                  ? ex.pesosSeriesPlan.map((p) => Number(p) || 0).join("/")
                  : String(ex.kgPlan);
              const kgRealTexto =
                ex.pesosSeriesReal && ex.pesosSeriesReal.filter((p) => Number(p) > 0).length > 0
                  ? ex.pesosSeriesReal.map((p) => Number(p) || 0).join("/")
                  : String(ex.kgReal);
              const rpeTexto =
                ex.rpeSeries && ex.rpeSeries.some((r) => r !== "" && r !== undefined)
                  ? ex.rpeSeries.map((r) => (r === "" || r === undefined ? "—" : r)).join("/")
                  : ex.rpe;
              const repsRealTexto =
                ex.repsSeriesReal && ex.repsSeriesReal.some((r) => Number(r) > 0)
                  ? ex.repsSeriesReal.map((r) => Number(r) || 0).join("/")
                  : String(ex.repsReal);
              return (
                <div key={ex.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <span className="dp-text-heading truncate">{ex.nombre}</span>
                  <span className="dp-muted shrink-0 font-mono text-xs">
                    {ex.extra ? "agregado en la sesión" : `plan ${ex.seriesPlan}×${ex.repsPlan}×${kgPlanTexto}kg`}
                    {" → "}real {ex.seriesReal}×
                    {repsRealTexto}×{kgRealTexto}kg{rpeTexto ? ` · RPE ${rpeTexto}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Solo el pilar "Estrés" trae la marca `invertido` (ver constants.ts) — el
// resto del union type de PILARES_KEYS no tiene esa propiedad en absoluto.
function pilarInvertido(p: (typeof PILARES_KEYS)[number]): boolean {
  return "invertido" in p && p.invertido === true;
}

function pilarBajo(pilares: NuevaSesionInput["pilares"], esPrimeraSesion: boolean) {
  if (esPrimeraSesion) return false;
  return PILARES_KEYS.some((p) => {
    const raw = pilares[p.key];
    const v = Number(raw);
    return raw !== "" && !isNaN(v) && tonoEscalaPilar(v, pilarInvertido(p)) === "dp-bg-alert";
  });
}

function tieneAlerta(s: Sesion) {
  return pilarBajo(s.pilares, s.es_primera_sesion);
}

function fmtFechaDiaConfirmado(f: string) {
  const d = new Date(f + "T00:00:00");
  return d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" }).replace(/\.$/, "");
}

export function SesionesClient({
  clienteId,
  sesionesIniciales,
  diasPlan,
  diasConfirmados,
  bibliotecaInicial,
}: {
  clienteId: string;
  sesionesIniciales: Sesion[];
  diasPlan: DiaPlan[];
  diasConfirmados: DiaEntrenamiento[];
  bibliotecaInicial: EjercicioBiblioteca[];
}) {
  const [modo, setModo] = useState<"list" | "form">("list");
  const [draft, setDraft] = useState<NuevaSesionInput | null>(null);
  // Ejercicios que el profesional planifica acá mismo (no vienen de un día
  // del plan) — mismo formato que Plan/Tareas (ver "Ejercicios planificados
  // en esta sesión" más abajo), para poder copiarlos después sin perder
  // nada (link, carga, RPE/RIR/tempo/descanso, etc.).
  const [bloquesExtra, setBloquesExtra] = useState<BloquePlan[]>([]);
  const [sesionFuenteId, setSesionFuenteId] = useState("");
  const [biblioteca, setBiblioteca] = useState<EjercicioBiblioteca[]>(bibliotecaInicial);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [videoAbiertoId, setVideoAbiertoId] = useState<string | null>(null);
  // Qué ejercicio del registro está mostrando el input de nombre en vez del
  // texto/link fijo — no se puede inferir de "nombre vacío" (apenas se
  // escribe la primera letra deja de estar vacío y el input desaparecía
  // solo, expulsando al que estaba tipeando).
  const [nombreEditandoId, setNombreEditandoId] = useState<string | null>(null);
  const [editandoMetaId, setEditandoMetaId] = useState<string | null>(null);
  const [metaTipo, setMetaTipo] = useState("");
  const [metaPorCliente, setMetaPorCliente] = useState(false);
  // Corregir los pesos/series/reps de una sesión ya registrada (ej. se
  // anotaron en papel) — separado de "Editar tipo / autoría".
  const [editandoEjerciciosId, setEditandoEjerciciosId] = useState<string | null>(null);
  const [ejerciciosEdicion, setEjerciciosEdicion] = useState<EjercicioSesion[]>([]);
  const [guardandoEjerciciosEdicion, startGuardarEjerciciosEdicion] = useTransition();
  // "Guardar como PR" — manda el peso de un ejercicio puntual (de la
  // sesión, ya sea en registro vivo o corrigiendo una pasada) al historial
  // de PRs que usan Evaluación/Evolución, para no tener que cargarlo de
  // nuevo a mano ahí.
  const [prFormExId, setPrFormExId] = useState<string | null>(null);
  const [prMetric, setPrMetric] = useState<MetricKey | "">("");
  const [prValor, setPrValor] = useState("");
  const [prFecha, setPrFecha] = useState("");
  const [guardandoPr, startGuardarPr] = useTransition();
  const [prGuardadoExId, setPrGuardadoExId] = useState<string | null>(null);
  const [copiandoA, setCopiandoA] = useState<"tareas" | "plan" | null>(null);
  const [, startCopia] = useTransition();
  const [mensajeCopia, setMensajeCopia] = useState<string | null>(null);

  const sesiones = [...sesionesIniciales].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const sesionesConEjercicios = sesiones.filter((s) => s.ejercicios.length > 0);
  const sesionFuente = sesionesConEjercicios.find((s) => s.id === sesionFuenteId);

  const iniciarNueva = () => {
    setDraft(nuevoDraft(sesiones.length === 0));
    setBloquesExtra([]);
    // Precarga la más reciente como referencia — así entra directo viendo
    // "qué hizo la última vez" sin tener que elegir nada.
    setSesionFuenteId(sesionesConEjercicios[0]?.id ?? "");
    setModo("form");
  };

  const cancelar = () => {
    setDraft(null);
    setBloquesExtra([]);
    setSesionFuenteId("");
    setModo("list");
  };

  const elegirDia = (label: string) => {
    if (!draft) return;
    const dia = diasPlan.find((d) => d.label === label);
    const ejercicios = dia ? ejerciciosDesdeDia(dia) : [];
    setDraft({ ...draft, dia_plan_label: label, ejercicios });
  };

  const updateEjercicio = (idx: number, patch: Partial<EjercicioSesion>) => {
    if (!draft) return;
    const next = [...draft.ejercicios];
    next[idx] = { ...next[idx], ...patch };
    setDraft({ ...draft, ejercicios: next });
  };

  // Agregar/renombrar bloques y ejercicios directo en el registro de la
  // sesión (no en "Ejercicios planificados en esta sesión", que es algo
  // aparte) — para poder mejorar/completar sobre la marcha lo que el día
  // del plan ya trajo, en vez de solo poder cargar números sobre lo
  // existente. `insertAfterIdx` en -1 inserta al principio.
  const addEjercicioEnDraft = (bloqueTitle: string, insertAfterIdx: number) => {
    if (!draft) return;
    const nuevo = nuevoEjercicioSesionVacio(bloqueTitle);
    const next = [...draft.ejercicios];
    next.splice(insertAfterIdx + 1, 0, nuevo);
    setDraft({ ...draft, ejercicios: next });
    setNombreEditandoId(nuevo.id);
  };

  const addBloqueEnDraft = (insertAfterIdx: number) => {
    if (!draft) return;
    const titulo = tituloBloqueUnicoEnDraft(draft.ejercicios);
    const nuevo = nuevoEjercicioSesionVacio(titulo);
    const next = [...draft.ejercicios];
    next.splice(insertAfterIdx + 1, 0, nuevo);
    setDraft({ ...draft, ejercicios: next });
    setNombreEditandoId(nuevo.id);
  };

  const renameBloqueDraft = (idxs: number[], nuevoTitulo: string) => {
    if (!draft) return;
    const next = [...draft.ejercicios];
    idxs.forEach((i) => {
      next[i] = { ...next[i], bloqueTitle: nuevoTitulo };
    });
    setDraft({ ...draft, ejercicios: next });
  };

  const removeEjercicioDraft = (idx: number) => {
    if (!draft) return;
    setDraft({ ...draft, ejercicios: draft.ejercicios.filter((_, i) => i !== idx) });
  };

  // "Ejercicios planificados en esta sesión" — mismo CRUD que PlanView,
  // pero sobre un array plano local (bloquesExtra) en vez del árbol
  // dia.bloques: acá no hay "día" ni "semana", es solo lo que se está
  // armando para esta sesión puntual.
  const guardarEjercicioEnBiblioteca = async (ex: { nombre: string; link: string }) => {
    const creado = await guardarEnBiblioteca(ex.nombre, ex.link);
    setBiblioteca((prev) => [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)));
  };

  const addBloqueExtra = () => {
    setBloquesExtra((prev) => [...prev, { id: crypto.randomUUID(), title: "Nuevo bloque", exercises: [] }]);
  };

  // Arranca de lo que el cliente hizo de verdad en una sesión anterior, en
  // vez de empezar de cero — útil para repetir/adaptar algo que ya
  // funcionó. Suma los bloques al final de lo que ya había en vez de
  // reemplazar, por si se está combinando con otra sesión o con bloques
  // agregados a mano.
  const copiarDeSesionAnterior = () => {
    const fuente = sesiones.find((s) => s.id === sesionFuenteId);
    if (!fuente || fuente.ejercicios.length === 0) return;
    setBloquesExtra((prev) => [...prev, ...bloquesDesdeSesionPasada(fuente)]);
    setSesionFuenteId("");
  };

  const removeBloqueExtra = (bIdx: number) => {
    setBloquesExtra((prev) => prev.filter((_, i) => i !== bIdx));
  };

  const moverBloqueExtra = (bIdx: number, delta: -1 | 1) => {
    setBloquesExtra((prev) => {
      const destino = bIdx + delta;
      if (destino < 0 || destino >= prev.length) return prev;
      const next = [...prev];
      [next[bIdx], next[destino]] = [next[destino], next[bIdx]];
      return next;
    });
  };

  const renameBloqueExtra = (bIdx: number, title: string) => {
    setBloquesExtra((prev) => prev.map((b, i) => (i === bIdx ? { ...b, title } : b)));
  };

  const setBloqueExtraCualidad = (bIdx: number, cualidad: CualidadFuerza | "") => {
    setBloquesExtra((prev) => prev.map((b, i) => (i === bIdx ? { ...b, cualidad: cualidad || undefined } : b)));
  };

  const setBloqueExtraGrupoMuscular = (bIdx: number, grupoMuscular: GrupoMuscular | "") => {
    setBloquesExtra((prev) =>
      prev.map((b, i) => (i === bIdx ? { ...b, grupoMuscular: grupoMuscular || undefined } : b))
    );
  };

  const aplicarDescansoExtra = (bIdx: number) => {
    setBloquesExtra((prev) => prev.map((b, i) => (i === bIdx ? aplicarDescansoSugerido(b) : b)));
  };

  const addExerciseExtra = (bIdx: number) => {
    setBloquesExtra((prev) =>
      prev.map((b, i) => (i === bIdx ? { ...b, exercises: [...b.exercises, nuevoEjercicioExtra()] } : b))
    );
  };

  const changeExerciseExtra = (bIdx: number, eIdx: number, nextEx: EjercicioPlan) => {
    setBloquesExtra((prev) =>
      prev.map((b, i) => (i === bIdx ? { ...b, exercises: b.exercises.map((e, j) => (j === eIdx ? nextEx : e)) } : b))
    );
  };

  const removeExerciseExtra = (bIdx: number, eIdx: number) => {
    setBloquesExtra((prev) =>
      prev.map((b, i) => (i === bIdx ? { ...b, exercises: b.exercises.filter((_, j) => j !== eIdx) } : b))
    );
  };

  const hayEjerciciosExtra = bloquesExtra.some((b) => b.exercises.length > 0);

  const guardar = () => {
    if (!draft) return;
    const extrasComoSesion = bloquesExtra.flatMap((b) =>
      b.exercises.map((e) => ejercicioSesionDesdePlan(e, b.title))
    );
    // Si se agregó un ejercicio desde "+ Agregar ejercicio"/"+ Agregar
    // bloque" y quedó sin nombre, se descarta en vez de guardar una fila
    // vacía.
    const ejerciciosDraft = draft.ejercicios.filter((e) => e.nombre.trim());
    const input = { ...draft, ejercicios: [...ejerciciosDraft, ...extrasComoSesion] };
    startTransition(async () => {
      await crearSesion(clienteId, input);
      setDraft(null);
      setBloquesExtra([]);
      setModo("list");
    });
  };

  // Esta pantalla nunca se comparte con el cliente (es solo un registro
  // para el profesional) — si lo planificado acá (ver "Ejercicios
  // planificados en esta sesión") es en realidad una rutina para dejar
  // fija (kine o fuerza que gustó), hace falta este puente para que
  // termine en Tareas o Plan, que son los que sí se pueden compartir.
  const copiarA = (destino: "tareas" | "plan") => {
    if (!hayEjerciciosExtra) return;
    setMensajeCopia(null);
    setCopiandoA(destino);
    startCopia(async () => {
      const resultado =
        destino === "tareas"
          ? await copiarSesionATareas(clienteId, bloquesExtra)
          : await copiarSesionAPlanFuerza(clienteId, bloquesExtra);
      const destinoLabel = destino === "tareas" ? "Tareas" : "Plan";
      setMensajeCopia(
        resultado.error
          ? resultado.error
          : `Se agregó a ${destinoLabel} como "${resultado.label}" — entrá a ${destinoLabel} para revisarla y compartirla.`
      );
      setCopiandoA(null);
    });
  };

  const borrarSesion = (id: string) => {
    if (!confirm("¿Eliminar esta sesión? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    startTransition(async () => {
      await eliminarSesion(clienteId, id);
      setDeletingId(null);
    });
  };

  const revisarSesion = (id: string) => {
    startTransition(async () => {
      await marcarSesionRevisada(clienteId, id);
    });
  };

  const abrirEdicionMeta = (s: Sesion) => {
    setEditandoMetaId(s.id);
    setMetaTipo(s.tipo || TIPOS_SESION[0]);
    setMetaPorCliente(s.registrada_por_cliente);
  };

  const guardarMeta = (id: string) => {
    startTransition(async () => {
      await actualizarTipoYAutoriaSesion(clienteId, id, metaTipo, metaPorCliente);
      setEditandoMetaId(null);
    });
  };

  const abrirEdicionEjercicios = (s: Sesion) => {
    setEditandoEjerciciosId(s.id);
    setEjerciciosEdicion(s.ejercicios.map((e) => ({ ...e })));
  };

  const actualizarEjercicioEdicion = (idx: number, patch: Partial<EjercicioSesion>) => {
    setEjerciciosEdicion((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };

  const guardarEjerciciosEdicion = (sesionId: string) => {
    startGuardarEjerciciosEdicion(async () => {
      await actualizarEjerciciosSesion(clienteId, sesionId, ejerciciosEdicion);
      setEditandoEjerciciosId(null);
    });
  };

  const abrirFormularioPr = (ex: EjercicioSesion, fecha: string) => {
    setPrFormExId(ex.id);
    setPrMetric("");
    setPrValor(String(ex.kgReal || ""));
    setPrFecha(fecha);
  };

  const guardarComoPr = () => {
    if (!prMetric || !prValor) return;
    const exId = prFormExId;
    startGuardarPr(async () => {
      await crearPrHistorial(clienteId, {
        fecha: prFecha,
        mesociclo: "Registrado desde Sesiones",
        objetivo: "",
        sentadilla: 0,
        peso_muerto: 0,
        press_banca: 0,
        press_militar: 0,
        broad_jump: 0,
        abalakov_jump: 0,
        cmj: 0,
        squat_jump: 0,
        agarre_der: 0,
        agarre_izq: 0,
        dead_hang: 0,
        pull_ups: 0,
        push_up: 0,
        plancha_frontal: 0,
        plancha_lateral_der: 0,
        plancha_lateral_izq: 0,
        pararse_del_suelo: 0,
        [prMetric]: Number(prValor) || 0,
      });
      setPrFormExId(null);
      setPrGuardadoExId(exId);
    });
  };

  if (modo === "form" && draft) {
    const alerta = pilarBajo(draft.pilares, draft.es_primera_sesion);

    return (
      <div className="dp-surface flex flex-col gap-4 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="dp-text-heading font-medium">Nueva sesión</h3>
          <button type="button" onClick={cancelar} className="dp-muted text-sm hover:dp-text-brand">
            Cancelar
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Fecha</span>
            <input
              type="date"
              value={draft.fecha}
              onChange={(e) => setDraft({ ...draft, fecha: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Tipo de sesión</span>
            <select
              value={draft.tipo}
              onChange={(e) => setDraft({ ...draft, tipo: e.target.value })}
              className={inputClass}
            >
              {TIPOS_SESION.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Día del plan</span>
            <select
              value={draft.dia_plan_label}
              onChange={(e) => elegirDia(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecciona…</option>
              {diasPlan.map((d) => (
                <option key={d.id} value={d.label}>
                  {d.label}
                  {d.foco ? ` — ${d.foco}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="dp-body flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.es_primera_sesion}
            onChange={(e) => setDraft({ ...draft, es_primera_sesion: e.target.checked })}
          />
          Es la primera sesión con este cliente
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">Comentarios pre-sesión — cómo llega la persona</span>
          <textarea
            rows={2}
            value={draft.comentarios_pre}
            onChange={(e) => setDraft({ ...draft, comentarios_pre: e.target.value })}
            placeholder="Cómo se siente hoy, energía, dolores previos, ánimo…"
            className={inputClass}
          />
        </label>

        <div>
          <p className="dp-text-heading mb-2 text-xs font-semibold uppercase tracking-wide">
            Pilares del rendimiento — hoy
          </p>
          <div className="flex flex-wrap gap-4">
            {PILARES_KEYS.map((p) => (
              <div key={p.key} className="flex flex-col gap-1">
                <span className="dp-muted text-[10px] font-medium">{p.label}</span>
                <EscalaUnoADiez
                  value={draft.pilares[p.key]}
                  onChange={(v) => setDraft({ ...draft, pilares: { ...draft.pilares, [p.key]: v } })}
                  invertido={pilarInvertido(p)}
                />
              </div>
            ))}
          </div>
          {alerta && (
            <p className="dp-alert mt-2 text-xs">⚠ Hay al menos un pilar en rojo — revisar antes de cargar intensidad.</p>
          )}
        </div>

        {draft.dia_plan_label && (
          <div>
            <p className="dp-text-heading mb-2 text-xs font-semibold uppercase tracking-wide">
              Ejecución real vs. planificado
            </p>
            <div
              className="dp-muted grid gap-2 pb-1 text-[10px] font-medium uppercase tracking-wide"
              style={{ gridTemplateColumns: "1.3fr 0.9fr 0.5fr 0.5fr 0.9fr 0.4fr 0.2fr" }}
            >
              <span>Ejercicio</span>
              <span>Plan (S×R×Kg)</span>
              <span className="text-center">Ser.</span>
              <span className="text-center">Rep.</span>
              <span className="text-center">Kg real</span>
              <span className="text-center">RPE</span>
              <span />
            </div>
            <div className="flex flex-col gap-3">
              {agruparPorBloque(draft.ejercicios).map((grupo, gIdx) => {
                const idxsGrupo = grupo.items.map(({ idx }) => idx);
                const ultimoIdxGrupo = idxsGrupo[idxsGrupo.length - 1];
                return (
                <div key={gIdx}>
                  {grupo.bloqueTitle && (
                    <input
                      value={grupo.bloqueTitle}
                      onChange={(e) => renameBloqueDraft(idxsGrupo, e.target.value)}
                      className="dp-text-brand mb-1 w-full border-0 border-b border-transparent bg-transparent text-base font-semibold tracking-wide uppercase outline-none hover:border-black/10 focus:border-black/10"
                    />
                  )}
                  <div className="divide-y divide-black/5">
                    {grupo.items.map(({ ejercicio: ex, idx }) => {
                      const pesosPlan = (ex.pesosSeriesPlan ?? []).filter((p) => Number(p) > 0);
                      const kgPlanTexto =
                        pesosPlan.length > 0 ? pesosPlan.map((p) => Number(p) || 0).join("/") : String(ex.kgPlan);
                      const pesosRealActivo = (ex.pesosSeriesReal ?? []).some((p) => Number(p) > 0);
                      const cambiarPesoReal = (i: number, value: string) => {
                        const largo = Math.max(ex.seriesReal, pesosPlan.length, 1);
                        const current = Array.from(
                          { length: largo },
                          (_, idx2) => ex.pesosSeriesReal?.[idx2] ?? ex.kgReal ?? 0
                        );
                        current[i] = value === "" ? "" : Number(value);
                        updateEjercicio(idx, { pesosSeriesReal: current });
                      };
                      const cambiarRpeReal = (i: number, value: string) => {
                        const largo = Math.max(ex.seriesReal, 1);
                        const current = Array.from({ length: largo }, (_, idx2) => ex.rpeSeries?.[idx2] ?? "");
                        current[i] = value;
                        updateEjercicio(idx, { rpeSeries: current });
                      };
                      const cambiarRepsReal = (i: number, value: string) => {
                        const largo = Math.max(ex.seriesReal, 1);
                        const current = Array.from(
                          { length: largo },
                          (_, idx2) => ex.repsSeriesReal?.[idx2] ?? ex.repsReal
                        );
                        current[i] = value === "" ? "" : Number(value);
                        updateEjercicio(idx, { repsSeriesReal: current });
                      };
                      const embedUrl = youtubeEmbedUrl(ex.link ?? "");
                      const videoAbierto = videoAbiertoId === ex.id;
                      return (
                        <div key={ex.id} className="py-1.5">
                        <div
                          className="grid items-center gap-2"
                          style={{ gridTemplateColumns: "1.3fr 0.9fr 0.5fr 0.5fr 0.9fr 0.4fr 0.2fr" }}
                        >
                          <div className="min-w-0">
                            {nombreEditandoId === ex.id || !ex.nombre ? (
                              <input
                                value={ex.nombre}
                                onChange={(e) => updateEjercicio(idx, { nombre: e.target.value })}
                                onBlur={() => setNombreEditandoId((id) => (id === ex.id ? null : id))}
                                list="sesiones-biblioteca-datalist"
                                placeholder="Nombre del ejercicio…"
                                autoFocus
                                className="w-full rounded-md border border-black/10 px-1.5 py-0.5 text-sm outline-none focus:dp-border-brand"
                              />
                            ) : embedUrl ? (
                              <button
                                type="button"
                                onClick={() => setVideoAbiertoId(videoAbierto ? null : ex.id)}
                                className="dp-text-brand flex items-center gap-1 truncate text-left text-sm underline decoration-dotted"
                              >
                                <span aria-hidden>▶</span> {ex.nombre}
                              </button>
                            ) : ex.link ? (
                              <a
                                href={normalizeLink(ex.link)}
                                target="_blank"
                                rel="noreferrer"
                                className="dp-text-brand block truncate text-sm underline"
                              >
                                {ex.nombre}
                              </a>
                            ) : (
                              <span className="dp-text-heading block truncate text-sm">{ex.nombre}</span>
                            )}
                            {(ex.tipoCarga || ex.tiempoSerie) && (
                              <span className="dp-muted text-[10px]">
                                {[ex.tipoCarga, ex.tiempoSerie].filter(Boolean).join(" · ")}
                              </span>
                            )}
                            {ex.notaReps && (
                              <span className="dp-bg-amber-soft dp-text-amber block rounded-md px-1.5 py-0.5 text-[10px]">
                                {ex.notaReps}
                              </span>
                            )}
                          </div>
                          <span className="dp-muted font-mono text-xs">
                            {ex.seriesPlan}×{ex.repsPlan}
                            {ex.unilateral ? " c/u" : ""}×{kgPlanTexto}kg{ex.pesoCadaUno ? " c/u" : ""}
                          </span>
                          <input
                            type="number"
                            value={ex.seriesReal}
                            onChange={(e) => updateEjercicio(idx, { seriesReal: Number(e.target.value) })}
                            className="rounded-md border border-black/10 px-1 py-0.5 text-center font-mono text-sm outline-none focus:dp-border-brand"
                          />
                          <div className="flex flex-wrap items-center gap-1">
                            {Array.from({ length: Math.max(ex.seriesReal, 1) }).map((_, i) => (
                              <input
                                key={i}
                                type="number"
                                value={ex.repsSeriesReal?.[i] ?? ex.repsReal}
                                onChange={(e) => cambiarRepsReal(i, e.target.value)}
                                style={{ width: 36 }}
                                className="rounded-md border border-black/10 px-1 py-0.5 text-center font-mono text-xs outline-none focus:dp-border-brand"
                              />
                            ))}
                          </div>
                          {pesosRealActivo ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {Array.from({ length: Math.max(ex.seriesReal, pesosPlan.length, 1) }).map((_, i) => (
                                <input
                                  key={i}
                                  type="number"
                                  value={ex.pesosSeriesReal?.[i] ?? ex.kgReal ?? 0}
                                  onChange={(e) => cambiarPesoReal(i, e.target.value)}
                                  style={{ width: 36 }}
                                  className="rounded-md border border-black/10 px-1 py-0.5 text-center font-mono text-xs outline-none focus:dp-border-brand"
                                />
                              ))}
                            </div>
                          ) : (
                            <input
                              type="number"
                              value={ex.kgReal}
                              onChange={(e) => updateEjercicio(idx, { kgReal: Number(e.target.value) })}
                              className="rounded-md border border-black/10 px-1 py-0.5 text-center font-mono text-sm outline-none focus:dp-border-brand"
                            />
                          )}
                          <div className="flex flex-wrap items-center gap-1">
                            {Array.from({ length: Math.max(ex.seriesReal, 1) }).map((_, i) => (
                              <input
                                key={i}
                                type="number"
                                min={0}
                                max={10}
                                value={ex.rpeSeries?.[i] ?? ""}
                                onChange={(e) => cambiarRpeReal(i, e.target.value)}
                                placeholder="—"
                                style={{ width: 36 }}
                                className="rounded-md border border-black/10 px-1 py-0.5 text-center font-mono text-xs outline-none focus:dp-border-brand"
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEjercicioDraft(idx)}
                            className="dp-muted hover:dp-alert justify-self-end text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        {videoAbierto && embedUrl && (
                          <div
                            className={`mt-2 overflow-hidden rounded-lg ${
                              esYoutubeVertical(ex.link ?? "") ? "aspect-[9/16] w-full max-w-[280px]" : "aspect-video w-full"
                            }`}
                          >
                            <iframe
                              src={embedUrl}
                              title={`Video de ${ex.nombre}`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="h-full w-full border-0"
                            />
                          </div>
                        )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => addEjercicioEnDraft(grupo.bloqueTitle, ultimoIdxGrupo)}
                      className="dp-text-brand text-xs font-medium hover:underline"
                    >
                      + Agregar ejercicio
                    </button>
                    <button
                      type="button"
                      onClick={() => addBloqueEnDraft(ultimoIdxGrupo)}
                      className="dp-text-brand text-xs font-medium hover:underline"
                    >
                      + Agregar bloque acá
                    </button>
                  </div>
                </div>
                );
              })}
              {draft.ejercicios.length === 0 && (
                <p className="dp-muted py-2 text-xs">Este día no tiene ejercicios cargados en la planificación todavía.</p>
              )}
              <button
                type="button"
                onClick={() => addBloqueEnDraft(draft.ejercicios.length - 1)}
                className="dp-text-brand w-fit text-xs font-medium hover:underline"
              >
                + Agregar bloque
              </button>
            </div>
          </div>
        )}

        <datalist id="sesiones-biblioteca-datalist">
          {biblioteca.map((b) => (
            <option key={b.id} value={b.nombre} />
          ))}
        </datalist>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          {sesionesConEjercicios.length > 0 && (
            <div className="dp-surface rounded-2xl border border-black/5 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="dp-text-heading text-xs font-semibold uppercase tracking-wide">Sesión anterior</p>
                  <p className="dp-muted text-[11px]">Para tener a la vista mientras planificás — no se edita acá.</p>
                </div>
                <select
                  value={sesionFuenteId}
                  onChange={(e) => setSesionFuenteId(e.target.value)}
                  className="rounded-lg border border-black/10 px-2 py-1 text-xs outline-none focus:dp-border-brand"
                >
                  <option value="">Elegí una sesión…</option>
                  {sesionesConEjercicios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {fmtFechaCorta(s.fecha)} · {s.tipo || "Kinesiología"}
                      {s.dia_plan_label ? ` · ${s.dia_plan_label}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {sesionFuente ? (
                <>
                  <ListaEjerciciosSesion ejercicios={sesionFuente.ejercicios} />
                  <button
                    type="button"
                    onClick={copiarDeSesionAnterior}
                    className="dp-text-brand mt-2 text-xs font-medium hover:underline"
                  >
                    Copiar todo a la planificación de hoy →
                  </button>
                </>
              ) : (
                <p className="dp-muted text-xs">Elegí una sesión para ver su detalle acá.</p>
              )}
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="dp-text-heading text-xs font-semibold uppercase tracking-wide">
                  Ejercicios planificados en esta sesión
                </p>
                <p className="dp-muted text-[11px]">
                  Mismo formato que Plan/Tareas — para dejarlos acá ya armados y poder copiarlos después.
                </p>
              </div>
              <button
                type="button"
                onClick={addBloqueExtra}
                className="dp-text-brand shrink-0 text-xs font-medium hover:underline"
              >
                + Agregar bloque
              </button>
            </div>

            {bloquesExtra.length === 0 ? (
              <p className="dp-muted text-xs">Todavía no agregaste ningún bloque.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {bloquesExtra.map((b, bIdx) => (
                <div key={b.id} className="dp-bg-faint dp-border-brand rounded-xl border-l-4 p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <input
                      value={b.title}
                      onChange={(e) => renameBloqueExtra(bIdx, e.target.value)}
                      className="dp-ink border-none bg-transparent text-lg font-semibold tracking-wide uppercase outline-none focus:underline"
                      style={{ minWidth: 120 }}
                    />
                    <div className="flex items-center gap-2">
                      {bIdx > 0 && (
                        <button
                          type="button"
                          onClick={() => moverBloqueExtra(bIdx, -1)}
                          title="Mover bloque hacia arriba"
                          className="dp-muted hover:dp-text-brand text-sm"
                        >
                          ▲
                        </button>
                      )}
                      {bIdx < bloquesExtra.length - 1 && (
                        <button
                          type="button"
                          onClick={() => moverBloqueExtra(bIdx, 1)}
                          title="Mover bloque hacia abajo"
                          className="dp-muted hover:dp-text-brand text-sm"
                        >
                          ▼
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeBloqueExtra(bIdx)}
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
                      onChange={(e) => setBloqueExtraGrupoMuscular(bIdx, e.target.value as GrupoMuscular | "")}
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
                      onChange={(e) => setBloqueExtraCualidad(bIdx, e.target.value as CualidadFuerza | "")}
                      className="dp-body rounded-md border border-black/10 bg-white px-1.5 py-0.5 text-[11px] outline-none focus:dp-border-brand"
                    >
                      <option value="">Cualidad de fuerza…</option>
                      {CUALIDADES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {b.cualidad && TABLA_INTENSIDAD[b.cualidad] && (
                      <>
                        <span className="dp-muted font-mono text-[10px]">
                          reps {TABLA_INTENSIDAD[b.cualidad].reps} · {TABLA_INTENSIDAD[b.cualidad].porcentaje1RM} ·
                          series/ejerc. {TABLA_INTENSIDAD[b.cualidad].seriesPorEjercicio} · desc.{" "}
                          {TABLA_INTENSIDAD[b.cualidad].descanso}
                        </span>
                        {descansoDisponible(b) && (
                          <button
                            type="button"
                            onClick={() => aplicarDescansoExtra(bIdx)}
                            className="dp-text-amber text-[10px] font-medium hover:underline"
                          >
                            Aplicar descanso sugerido
                          </button>
                        )}
                      </>
                    )}
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
                        onChange={(next) => changeExerciseExtra(bIdx, eIdx, next)}
                        onRemove={() => removeExerciseExtra(bIdx, eIdx)}
                        biblioteca={biblioteca}
                        onSaveToBiblioteca={guardarEjercicioEnBiblioteca}
                        etiquetaBloque={{ grupoMuscular: b.grupoMuscular, cualidad: b.cualidad }}
                        datalistId="sesiones-biblioteca-datalist"
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addExerciseExtra(bIdx)}
                    className="dp-text-brand mt-2 flex items-center gap-1 text-xs font-medium hover:underline"
                  >
                    + Agregar ejercicio
                  </button>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">Comentarios post sesión — dolor · dificultad · ajuste de carga</span>
          <textarea
            rows={3}
            value={draft.comentarios}
            onChange={(e) => setDraft({ ...draft, comentarios: e.target.value })}
            className={inputClass}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={guardar}
            disabled={pending}
            className="dp-bg-brand w-fit rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar sesión"}
          </button>
          {hayEjerciciosExtra && (
            <>
              <button
                type="button"
                onClick={() => copiarA("tareas")}
                disabled={copiandoA !== null}
                className="dp-text-brand w-fit rounded-xl border border-dashed border-current px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {copiandoA === "tareas" ? "Copiando…" : "Copiar a Tareas"}
              </button>
              <button
                type="button"
                onClick={() => copiarA("plan")}
                disabled={copiandoA !== null}
                className="dp-text-brand w-fit rounded-xl border border-dashed border-current px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {copiandoA === "plan" ? "Copiando…" : "Copiar a Plan (fuerza)"}
              </button>
            </>
          )}
          {mensajeCopia && <span className="dp-muted text-xs">{mensajeCopia}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {diasConfirmados.length > 0 && (
        <div className="dp-bg-brand-soft rounded-xl px-3.5 py-2">
          <p className="dp-text-brand text-xs font-medium">
            Confirmó en su portal que entrena:{" "}
            {diasConfirmados.map((d) => fmtFechaDiaConfirmado(d.fecha)).join(" · ")}
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={iniciarNueva}
          className="dp-bg-brand rounded-xl px-3.5 py-2 text-sm font-medium text-white"
        >
          + Nueva sesión
        </button>
      </div>

      {sesiones.length === 0 ? (
        <p className="dp-muted dp-surface rounded-2xl p-8 text-center text-sm shadow-sm">
          Todavía no hay sesiones registradas para este cliente.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {sesiones.map((s) => {
            const expanded = expandedId === s.id;
            const alerta = tieneAlerta(s);
            return (
              <div key={s.id} className="dp-surface overflow-hidden rounded-2xl shadow-sm">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : s.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className="w-14 shrink-0 text-center">
                    <p className="dp-text-heading font-mono text-sm font-semibold">
                      {s.fecha.slice(8, 10)}/{s.fecha.slice(5, 7)}
                    </p>
                    <p className="dp-muted text-[10px]">{s.fecha.slice(0, 4)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="dp-text-heading text-sm font-medium">
                      {s.tipo || "Kinesiología"}
                      {s.dia_plan_label ? ` · ${s.dia_plan_label}` : ""}
                    </p>
                    <p className="dp-muted truncate text-xs">{s.comentarios || "Sin comentarios"}</p>
                    <p className="dp-muted text-[10px]">
                      {s.registrada_por_cliente ? "Registrada por el cliente (portal)" : "Registrada por vos"}
                    </p>
                  </div>
                  {s.registrada_por_cliente && !s.revisada && (
                    <span className="dp-alert shrink-0 text-xs font-medium">⚠ Sin revisar</span>
                  )}
                  {alerta && <span className="dp-alert shrink-0 text-xs font-medium">⚠ Pilar bajo</span>}
                  <span className={`dp-muted shrink-0 text-xs transition-transform ${expanded ? "rotate-90" : ""}`}>
                    ›
                  </span>
                </button>
                {expanded && (
                  <div className="flex flex-col gap-3 border-t border-black/5 px-4 pb-4 pt-3">
                    {editandoMetaId === s.id ? (
                      <div className="dp-bg-faint flex flex-wrap items-end gap-3 rounded-lg p-3">
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="dp-body font-medium">Tipo de sesión</span>
                          <select
                            value={metaTipo}
                            onChange={(e) => setMetaTipo(e.target.value)}
                            className={inputClass}
                          >
                            {TIPOS_SESION.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="dp-body flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={metaPorCliente}
                            onChange={(e) => setMetaPorCliente(e.target.checked)}
                          />
                          Registrada por el cliente (portal)
                        </label>
                        <button
                          type="button"
                          onClick={() => guardarMeta(s.id)}
                          disabled={pending}
                          className="dp-bg-brand rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                        >
                          {pending ? "Guardando…" : "Guardar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditandoMetaId(null)}
                          className="dp-muted text-xs hover:underline"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => abrirEdicionMeta(s)}
                          className="dp-text-brand w-fit text-xs hover:underline"
                        >
                          Editar tipo / autoría
                        </button>
                        {s.ejercicios.length > 0 && editandoEjerciciosId !== s.id && (
                          <button
                            type="button"
                            onClick={() => abrirEdicionEjercicios(s)}
                            className="dp-text-brand w-fit text-xs hover:underline"
                          >
                            Editar pesos/series
                          </button>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-5 gap-2">
                      {PILARES_KEYS.map((p) => {
                        const val = s.pilares[p.key];
                        const numerico = !s.es_primera_sesion && val !== "" && !isNaN(Number(val));
                        const tono = numerico ? tonoEscalaPilar(Number(val), pilarInvertido(p)) : "dp-bg-faint";
                        return (
                          <div key={p.key} className={`rounded-lg p-2 text-center ${tono}`}>
                            <p className={`text-[10px] font-medium ${numerico ? "text-white/80" : "dp-muted"}`}>
                              {p.label}
                            </p>
                            <p className={`font-mono text-sm font-semibold ${numerico ? "text-white" : "dp-text-heading"}`}>
                              {val || "—"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    {s.comentarios_pre && (
                      <div>
                        <p className="dp-muted mb-0.5 text-[10px] font-medium uppercase tracking-wide">Pre-sesión</p>
                        <p className="dp-text-heading text-sm">{s.comentarios_pre}</p>
                      </div>
                    )}
                    {s.ejercicios.length > 0 &&
                      (editandoEjerciciosId === s.id ? (
                        <div className="flex flex-col gap-3">
                          {agruparPorBloque(ejerciciosEdicion).map((grupo, gIdx) => (
                            <div key={gIdx}>
                              {grupo.bloqueTitle && (
                                <p className="dp-text-brand mb-1 text-sm font-semibold tracking-wide uppercase">
                                  {grupo.bloqueTitle}
                                </p>
                              )}
                              <div className="flex flex-col divide-y divide-black/5">
                                {grupo.items.map(({ ejercicio: ex, idx }) => (
                                  <div key={ex.id} className="flex flex-col gap-1.5 py-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="dp-text-heading min-w-0 flex-1 truncate text-sm">
                                        {ex.nombre}
                                      </span>
                                      <span className="dp-muted text-[10px]">Series</span>
                                      <input
                                        type="number"
                                        value={ex.seriesReal}
                                        onChange={(e) =>
                                          actualizarEjercicioEdicion(idx, { seriesReal: Number(e.target.value) })
                                        }
                                        style={{ width: 48 }}
                                        className="rounded-md border border-black/10 px-1 py-0.5 text-center font-mono text-xs outline-none focus:dp-border-brand"
                                      />
                                      <span className="dp-muted text-[10px]">Reps</span>
                                      <input
                                        type="number"
                                        value={ex.repsReal}
                                        onChange={(e) =>
                                          actualizarEjercicioEdicion(idx, {
                                            repsReal: Number(e.target.value),
                                            repsSeriesReal: undefined,
                                          })
                                        }
                                        style={{ width: 48 }}
                                        className="rounded-md border border-black/10 px-1 py-0.5 text-center font-mono text-xs outline-none focus:dp-border-brand"
                                      />
                                      <span className="dp-muted text-[10px]">Kg</span>
                                      <input
                                        type="number"
                                        value={ex.kgReal}
                                        onChange={(e) =>
                                          actualizarEjercicioEdicion(idx, {
                                            kgReal: Number(e.target.value),
                                            pesosSeriesReal: undefined,
                                          })
                                        }
                                        style={{ width: 56 }}
                                        className="rounded-md border border-black/10 px-1 py-0.5 text-center font-mono text-xs outline-none focus:dp-border-brand"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => abrirFormularioPr(ex, s.fecha)}
                                        className="dp-text-brand text-[11px] font-medium hover:underline"
                                      >
                                        + Guardar como PR
                                      </button>
                                      {prGuardadoExId === ex.id && prFormExId !== ex.id && (
                                        <span className="dp-text-brand text-[11px]">✓ Guardado en PR</span>
                                      )}
                                    </div>
                                    {prFormExId === ex.id && (
                                      <div className="dp-bg-faint flex flex-wrap items-center gap-2 rounded-lg p-2">
                                        <select
                                          value={prMetric}
                                          onChange={(e) => setPrMetric(e.target.value as MetricKey | "")}
                                          className="rounded-lg border border-black/10 px-2 py-1 text-xs outline-none focus:dp-border-brand"
                                        >
                                          <option value="">Elegí el PR…</option>
                                          {METRICS.map((m) => (
                                            <option key={m.key} value={m.key}>
                                              {m.label}
                                            </option>
                                          ))}
                                        </select>
                                        <input
                                          type="number"
                                          value={prValor}
                                          onChange={(e) => setPrValor(e.target.value)}
                                          placeholder="Valor"
                                          style={{ width: 70 }}
                                          className="rounded-lg border border-black/10 px-2 py-1 text-xs outline-none focus:dp-border-brand"
                                        />
                                        <input
                                          type="date"
                                          value={prFecha}
                                          onChange={(e) => setPrFecha(e.target.value)}
                                          className="rounded-lg border border-black/10 px-2 py-1 font-mono text-xs outline-none focus:dp-border-brand"
                                        />
                                        <button
                                          type="button"
                                          onClick={guardarComoPr}
                                          disabled={!prMetric || !prValor || guardandoPr}
                                          className="dp-bg-brand rounded-lg px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                                        >
                                          {guardandoPr ? "Guardando…" : "Guardar"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setPrFormExId(null)}
                                          className="dp-muted text-xs hover:underline"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => guardarEjerciciosEdicion(s.id)}
                              disabled={guardandoEjerciciosEdicion}
                              className="dp-bg-brand w-fit rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                            >
                              {guardandoEjerciciosEdicion ? "Guardando…" : "Guardar cambios"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditandoEjerciciosId(null)}
                              className="dp-muted text-xs hover:underline"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <ListaEjerciciosSesion ejercicios={s.ejercicios} />
                      ))}
                    {s.comentarios && (
                      <div>
                        <p className="dp-muted mb-0.5 text-[10px] font-medium uppercase tracking-wide">Post-sesión</p>
                        <p className="dp-text-heading text-sm">{s.comentarios}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      {s.registrada_por_cliente && !s.revisada && (
                        <button
                          type="button"
                          onClick={() => revisarSesion(s.id)}
                          disabled={pending}
                          className="dp-text-brand w-fit text-xs hover:underline disabled:opacity-50"
                        >
                          ✓ Marcar como revisada
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => borrarSesion(s.id)}
                        disabled={pending && deletingId === s.id}
                        className="dp-alert w-fit text-xs hover:underline disabled:opacity-50"
                      >
                        {pending && deletingId === s.id ? "Eliminando…" : "Eliminar sesión"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
