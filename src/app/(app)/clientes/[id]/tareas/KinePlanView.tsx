"use client";

import { useEffect, useState, useTransition } from "react";
import { blockTemplate } from "@/lib/dipra/constants";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import type { BloquePlan, DiaPlan, EjercicioBiblioteca, EjercicioPlan, PlanKine } from "@/lib/dipra/types";
import {
  actualizarIndicacionesTexto,
  compartirPlanKine,
  eliminarIndicacionesPdf,
  guardarPlanKine,
  obtenerDiasFuerza,
  subirIndicacionesPdf,
} from "./actions";
import { ExerciseRow, EXERCISE_ROW_GRID_EDITABLE } from "../plan/ExerciseRow";
import { ResumenDia } from "../plan/ResumenDia";
import { guardarEnBiblioteca } from "../plan/actions";

// Nuevos ids en todo el árbol — evita que copiar el mismo día dos veces (o
// tenerlo abierto en dos pestañas) choque por id repetido.
function clonarDia(dia: DiaPlan): DiaPlan {
  return {
    ...dia,
    id: crypto.randomUUID(),
    bloques: clonarBloques(dia.bloques),
  };
}

// Igual que clonarDia pero solo los bloques — para "Copiar día" DENTRO del
// mismo plan (reemplaza los bloques del día actual por los de otro, sin
// tocar su propio id/nombre/foco).
function clonarBloques(bloques: BloquePlan[]): BloquePlan[] {
  return bloques.map((b) => ({
    ...b,
    id: crypto.randomUUID(),
    exercises: b.exercises.map((e) => ({ ...e, id: crypto.randomUUID() })),
  }));
}

type Vista = "editar" | "resumen";

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

function nuevoDia(numero: number): DiaPlan {
  return { id: crypto.randomUUID(), label: `Sesión ${numero}`, foco: "", bloques: blockTemplate() };
}

// Notas del profesional para el cliente (ej. "si te duele al saltar,
// suspendé esa actividad por ahora") + un PDF opcional — independiente del
// borrador/compartir de los días, se guarda y se ve de inmediato en el
// portal. Aparte del componente principal para no duplicar el bloque en
// las dos ramas de render (sin días todavía / con días).
function IndicacionesSection({
  texto,
  onTextoChange,
  onGuardar,
  guardando,
  savedAt,
  pdfNombre,
  pdfUrl,
  subiendoPdf,
  onSubirPdf,
  onQuitarPdf,
}: {
  texto: string;
  onTextoChange: (v: string) => void;
  onGuardar: () => void;
  guardando: boolean;
  savedAt: number | null;
  pdfNombre: string | null;
  pdfUrl: string | null;
  subiendoPdf: boolean;
  onSubirPdf: (file: File) => void;
  onQuitarPdf: () => void;
}) {
  return (
    <div className="dp-surface flex flex-col gap-3 rounded-2xl p-4 shadow-sm">
      <h3 className="dp-text-heading text-sm font-medium">Indicaciones para el cliente</h3>
      <p className="dp-muted text-xs">
        Ej: &quot;si te duele al saltar, suspendé esa actividad por ahora y priorizá las de bajo impacto&quot;. Se
        ve de inmediato en su portal — no hace falta &quot;Compartir&quot;.
      </p>
      <textarea
        value={texto}
        onChange={(e) => onTextoChange(e.target.value)}
        rows={3}
        placeholder="Escribí acá las indicaciones generales para este cliente…"
        className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onGuardar}
          disabled={guardando}
          className="dp-bg-brand rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar indicaciones"}
        </button>
        {savedAt && !guardando && <span className="dp-muted text-xs">Guardado.</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-black/5 pt-3">
        {pdfNombre ? (
          <>
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="dp-text-brand text-sm font-medium hover:underline"
              >
                📄 {pdfNombre}
              </a>
            )}
            <button
              type="button"
              onClick={onQuitarPdf}
              disabled={subiendoPdf}
              className="dp-alert text-xs hover:underline disabled:opacity-50"
            >
              Quitar PDF
            </button>
          </>
        ) : (
          <label className="dp-text-brand cursor-pointer text-xs font-medium hover:underline">
            {subiendoPdf ? "Subiendo…" : "+ Subir PDF (máx. 4 MB)"}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={subiendoPdf}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onSubirPdf(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

/**
 * Plan de kinesiología/rehabilitación — pestaña "Tareas". Independiente del
 * plan de fuerza y sin el concepto de semanas: un solo set de días en curso
 * que se va editando directo (a diferencia del plan de fuerza, acá no hay
 * "Semana 2", "Semana 3"...). Mismo mecanismo de "Compartir" que el plan de
 * fuerza: el cliente solo ve `dias_publicado`, nunca el borrador en vivo.
 */
export function KinePlanView({
  clienteId,
  planInicial,
  bibliotecaInicial,
  indicacionesPdfUrl,
}: {
  clienteId: string;
  planInicial: PlanKine;
  bibliotecaInicial: EjercicioBiblioteca[];
  indicacionesPdfUrl: string | null;
}) {
  const [plan, setPlan] = useState(planInicial);
  const [dias, setDias] = useState<DiaPlan[]>(planInicial.dias);
  const [diaIdx, setDiaIdx] = useState(0);
  const [vista, setVista] = useState<Vista>("editar");
  const [biblioteca, setBiblioteca] = useState<EjercicioBiblioteca[]>(bibliotecaInicial);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [sharedAt, setSharedAt] = useState<number | null>(null);
  const [diasFuerza, setDiasFuerza] = useState<DiaPlan[]>([]);
  const [diaFuerzaElegido, setDiaFuerzaElegido] = useState("");
  const [diaFuenteCopiaId, setDiaFuenteCopiaId] = useState("");
  const [indicacionesTexto, setIndicacionesTexto] = useState(planInicial.indicaciones_texto);
  const [pdfUrl, setPdfUrl] = useState(indicacionesPdfUrl);
  const [indicacionesSavedAt, setIndicacionesSavedAt] = useState<number | null>(null);

  const [guardando, startGuardar] = useTransition();
  const [compartiendo, startCompartir] = useTransition();
  const [guardandoIndicaciones, startGuardarIndicaciones] = useTransition();
  const [subiendoPdf, startSubirPdf] = useTransition();

  const dia = dias[diaIdx];

  // Para "Copiar desde el plan de fuerza" — trae los días de la semana de
  // fuerza activa, si tiene una.
  useEffect(() => {
    obtenerDiasFuerza(clienteId).then(setDiasFuerza);
  }, [clienteId]);

  const copiarDesdeFuerza = () => {
    const origen = diasFuerza.find((d) => d.id === diaFuerzaElegido);
    if (!origen) return;
    const nextDias = [...dias, clonarDia(origen)];
    setDias(nextDias);
    setDiaIdx(nextDias.length - 1);
  };

  const updateDia = (nextDia: DiaPlan) => {
    setDias((prev) => prev.map((d, i) => (i === diaIdx ? nextDia : d)));
  };

  const addDia = () => {
    // Igual criterio que Plan (fuerza): el número sugerido es el primer
    // "Sesión N" libre, no dias.length+1 — si se borró "Sesión 1" no
    // ofrece "Sesión 4" (ya usado) en vez de reaparecer "Sesión 1".
    const usados = new Set(
      dias.map((d) => Number(d.label.match(/^Sesión (\d+)$/)?.[1])).filter((n) => !Number.isNaN(n))
    );
    let numero = 1;
    while (usados.has(numero)) numero++;
    const nextDias = [...dias, nuevoDia(numero)];
    setDias(nextDias);
    setDiaIdx(nextDias.length - 1);
  };
  const removeDia = (idx: number) => {
    if (dias.length <= 1) return;
    if (!window.confirm(`¿Eliminar "${dias[idx].label}"? Se van a perder todos sus bloques y ejercicios.`)) return;
    const nextDias = dias.filter((_, i) => i !== idx);
    setDias(nextDias);
    setDiaIdx((prev) => Math.min(prev, nextDias.length - 1));
  };
  const renameDia = (idx: number, label: string) => {
    setDias((prev) => prev.map((d, i) => (i === idx ? { ...d, label } : d)));
  };

  // Mismo criterio que Plan (fuerza): reordena dos días adyacentes sin
  // pisar contenido — "Copiar día" no sirve para esto porque solo copia
  // hacia el día actual, no intercambia.
  const moverDia = (idx: number, delta: -1 | 1) => {
    const destino = idx + delta;
    if (destino < 0 || destino >= dias.length) return;
    const nextDias = [...dias];
    [nextDias[idx], nextDias[destino]] = [nextDias[destino], nextDias[idx]];
    setDias(nextDias);
    setDiaIdx(destino);
  };

  // Copia los bloques de otro día de Tareas sobre el día actual — ej.
  // armaste el día 1 y te equivocaste en el día 2, sin volver a empezar de
  // cero. Pisa los bloques del día actual (con confirm si ya tenía algo).
  const copiarDiaDentroDelPlan = () => {
    if (!dia) return;
    const fuente = dias.find((d) => d.id === diaFuenteCopiaId);
    if (!fuente) return;
    const teniaContenido = dia.bloques.some((b) => b.exercises.length > 0);
    if (teniaContenido && !window.confirm(`¿Reemplazar los bloques de "${dia.label}" por los de "${fuente.label}"?`)) {
      return;
    }
    updateDia({ ...dia, bloques: clonarBloques(fuente.bloques) });
    setDiaFuenteCopiaId("");
  };

  const addBloque = () => {
    if (!dia) return;
    updateDia({ ...dia, bloques: [...dia.bloques, { id: crypto.randomUUID(), title: "Nuevo bloque", exercises: [] }] });
  };
  const insertBloqueAfter = (bIdx: number) => {
    if (!dia) return;
    const nextBloques = [...dia.bloques];
    nextBloques.splice(bIdx + 1, 0, { id: crypto.randomUUID(), title: "Nuevo bloque", exercises: [] });
    updateDia({ ...dia, bloques: nextBloques });
  };
  const renameBloque = (bIdx: number, title: string) => {
    if (!dia) return;
    updateDia({ ...dia, bloques: dia.bloques.map((b, i) => (i === bIdx ? { ...b, title } : b)) });
  };
  const removeBloque = (bIdx: number) => {
    if (!dia) return;
    updateDia({ ...dia, bloques: dia.bloques.filter((_, i) => i !== bIdx) });
  };
  // Mismo criterio que Plan (fuerza): reordena dos bloques adyacentes.
  const moverBloque = (bIdx: number, delta: -1 | 1) => {
    if (!dia) return;
    const destino = bIdx + delta;
    if (destino < 0 || destino >= dia.bloques.length) return;
    const nextBloques = [...dia.bloques];
    [nextBloques[bIdx], nextBloques[destino]] = [nextBloques[destino], nextBloques[bIdx]];
    updateDia({ ...dia, bloques: nextBloques });
  };

  const addExercise = (bIdx: number) => {
    if (!dia) return;
    const nextBloques = dia.bloques.map((b, i) => (i === bIdx ? { ...b, exercises: [...b.exercises, nuevoEjercicio()] } : b));
    updateDia({ ...dia, bloques: nextBloques });
  };
  const changeExercise = (bIdx: number, eIdx: number, nextEx: EjercicioPlan) => {
    if (!dia) return;
    const nextBloques = dia.bloques.map((b: BloquePlan, i) =>
      i === bIdx ? { ...b, exercises: b.exercises.map((e, j) => (j === eIdx ? nextEx : e)) } : b
    );
    updateDia({ ...dia, bloques: nextBloques });
  };
  const removeExercise = (bIdx: number, eIdx: number) => {
    if (!dia) return;
    const nextBloques = dia.bloques.map((b, i) => (i === bIdx ? { ...b, exercises: b.exercises.filter((_, j) => j !== eIdx) } : b));
    updateDia({ ...dia, bloques: nextBloques });
  };

  const guardarEjercicioEnBiblioteca = async (ex: { nombre: string; link: string }) => {
    const creado = await guardarEnBiblioteca(ex.nombre, ex.link);
    setBiblioteca((prev) => [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)));
  };

  const guardarCambios = () => {
    startGuardar(async () => {
      await guardarPlanKine(clienteId, dias);
      setPlan((prev) => ({ ...prev, dias, cambios_sin_compartir: true }));
      setSavedAt(Date.now());
    });
  };

  // Igual que en PlanView.compartirRutina: guarda lo que está EN PANTALLA
  // antes de compartir — compartirPlanKine lee `dias` directo de la base,
  // así que sin este guardado previo una edición sin "Guardar cambios"
  // quedaba afuera al compartir, sin avisar.
  const compartir = () => {
    startCompartir(async () => {
      await guardarPlanKine(clienteId, dias);
      await compartirPlanKine(clienteId);
      setPlan((prev) => ({ ...prev, dias, dias_publicado: dias, cambios_sin_compartir: false }));
      setSharedAt(Date.now());
    });
  };

  const guardarIndicaciones = () => {
    startGuardarIndicaciones(async () => {
      await actualizarIndicacionesTexto(clienteId, indicacionesTexto);
      setPlan((prev) => ({ ...prev, indicaciones_texto: indicacionesTexto }));
      setIndicacionesSavedAt(Date.now());
    });
  };

  const subirPdf = (file: File) => {
    if (file.type !== "application/pdf") {
      window.alert("Solo se puede subir un PDF.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      window.alert("El PDF no puede pesar más de 4 MB.");
      return;
    }
    const formData = new FormData();
    formData.append("pdf", file);
    startSubirPdf(async () => {
      await subirIndicacionesPdf(clienteId, formData);
      const path = `${clienteId}/indicaciones.pdf`;
      const url = createBrowserClient().storage.from("indicaciones").getPublicUrl(path).data.publicUrl;
      setPlan((prev) => ({ ...prev, indicaciones_pdf_path: path, indicaciones_pdf_nombre: file.name }));
      setPdfUrl(url);
    });
  };

  const quitarPdf = () => {
    if (!plan.indicaciones_pdf_path) return;
    if (!window.confirm("¿Eliminar el PDF de indicaciones?")) return;
    startSubirPdf(async () => {
      await eliminarIndicacionesPdf(clienteId, plan.indicaciones_pdf_path!);
      setPlan((prev) => ({ ...prev, indicaciones_pdf_path: null, indicaciones_pdf_nombre: null }));
      setPdfUrl(null);
    });
  };

  if (dias.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <IndicacionesSection
          texto={indicacionesTexto}
          onTextoChange={setIndicacionesTexto}
          onGuardar={guardarIndicaciones}
          guardando={guardandoIndicaciones}
          savedAt={indicacionesSavedAt}
          pdfNombre={plan.indicaciones_pdf_nombre}
          pdfUrl={pdfUrl}
          subiendoPdf={subiendoPdf}
          onSubirPdf={subirPdf}
          onQuitarPdf={quitarPdf}
        />

        <div className="dp-surface flex flex-col items-center gap-3 rounded-2xl p-8 text-center shadow-sm">
          <p className="dp-muted text-sm">
            Todavía no hay tareas/ejercicios de kine cargados para este cliente.
          </p>
          <button
            type="button"
            onClick={addDia}
            className="dp-bg-brand rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            + Agregar primera sesión
          </button>
          {diasFuerza.length > 0 && (
            <>
              <p className="dp-muted text-xs">o empezá de un día de su plan de fuerza</p>
              <div className="flex items-center gap-2">
                <select
                  value={diaFuerzaElegido}
                  onChange={(e) => setDiaFuerzaElegido(e.target.value)}
                  className="rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none focus:dp-border-brand"
                >
                  <option value="">Elegí un día…</option>
                  {diasFuerza.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={copiarDesdeFuerza}
                  disabled={!diaFuerzaElegido}
                  className="dp-text-brand rounded-lg border border-dashed border-black/15 px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
                >
                  Copiar
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
      <p className="dp-muted -mt-1 text-xs">
        Plan de kinesiología/rehabilitación — independiente de la rutina de fuerza. El cliente lo ve en la pestaña
        &quot;Tareas&quot; de su portal, recién cuando lo compartís.
      </p>

      <IndicacionesSection
        texto={indicacionesTexto}
        onTextoChange={setIndicacionesTexto}
        onGuardar={guardarIndicaciones}
        guardando={guardandoIndicaciones}
        savedAt={indicacionesSavedAt}
        pdfNombre={plan.indicaciones_pdf_nombre}
        pdfUrl={pdfUrl}
        subiendoPdf={subiendoPdf}
        onSubirPdf={subirPdf}
        onQuitarPdf={quitarPdf}
      />

      {plan.cambios_sin_compartir && (
        <div className="dp-bg-amber-soft flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3">
          <p className="dp-text-amber text-sm font-medium">⚠ El cliente todavía NO ve esta versión de Tareas.</p>
          <button
            type="button"
            onClick={compartir}
            disabled={compartiendo}
            className="dp-bg-ink shrink-0 rounded-lg px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {compartiendo ? "Compartiendo…" : "Compartir ahora"}
          </button>
        </div>
      )}

      <datalist id="biblioteca-datalist-kine">
        {biblioteca.map((b) => (
          <option key={b.id} value={b.nombre} />
        ))}
      </datalist>

      <div className="flex items-center gap-1.5">
        {(
          [
            { id: "editar", label: "Editar" },
            { id: "resumen", label: "Resumen" },
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

      {vista === "resumen" ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {dias.map((d) => (
            <div key={d.id} className="w-72 shrink-0">
              <ResumenDia dia={d} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {dias.map((d, i) => (
              <div key={d.id} className={`flex items-center gap-0.5 rounded-lg ${i === diaIdx ? "dp-bg-ink" : "dp-bg-faint"}`}>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => moverDia(i, -1)}
                    title={`Mover "${d.label}" antes de "${dias[i - 1].label}"`}
                    className={`pl-1.5 text-xs ${i === diaIdx ? "text-white/70 hover:text-white" : "dp-muted hover:dp-text-brand"}`}
                  >
                    ◀
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDiaIdx(i)}
                  className={`rounded-lg py-1.5 text-sm font-medium transition-colors ${
                    i === diaIdx ? "text-white" : "dp-body"
                  } ${i === 0 ? "pl-3" : "pl-1.5"} ${dias.length > 1 ? "pr-1" : "pr-3"}`}
                >
                  {d.label}
                </button>
                {i < dias.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moverDia(i, 1)}
                    title={`Mover "${d.label}" después de "${dias[i + 1].label}"`}
                    className={`text-xs ${i === diaIdx ? "text-white/70 hover:text-white" : "dp-muted hover:dp-text-brand"}`}
                  >
                    ▶
                  </button>
                )}
                {dias.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDia(i)}
                    title="Eliminar sesión"
                    className={`pr-2 pl-1 text-xs ${i === diaIdx ? "text-white/70 hover:text-white" : "dp-muted hover:dp-alert"}`}
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
              + Agregar sesión
            </button>

            {diasFuerza.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={diaFuerzaElegido}
                  onChange={(e) => setDiaFuerzaElegido(e.target.value)}
                  className="rounded-lg border border-black/10 px-1.5 py-1 text-xs outline-none focus:dp-border-brand"
                >
                  <option value="">Copiar día de fuerza…</option>
                  {diasFuerza.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={copiarDesdeFuerza}
                  disabled={!diaFuerzaElegido}
                  className="dp-text-brand rounded-lg border border-dashed border-black/15 px-2.5 py-1 text-xs font-medium disabled:opacity-40"
                >
                  Copiar
                </button>
              </div>
            )}

            {dias.length > 1 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={diaFuenteCopiaId}
                  onChange={(e) => setDiaFuenteCopiaId(e.target.value)}
                  className="rounded-lg border border-black/10 px-1.5 py-1 text-xs outline-none focus:dp-border-brand"
                >
                  <option value="">Copiar otra sesión…</option>
                  {dias
                    .filter((d) => d.id !== dia?.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={copiarDiaDentroDelPlan}
                  disabled={!diaFuenteCopiaId}
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
                placeholder="Nombre (ej. Sesión 2, Rodilla fase 1)"
                className="dp-ink mb-2 w-full rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold outline-none focus:dp-border-brand"
              />
              <input
                value={dia.foco}
                onChange={(e) => updateDia({ ...dia, foco: e.target.value })}
                placeholder="Foco (ej. Movilidad de tobillo / Control motor rodilla)"
                className="mb-4 w-full rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
              />

              <div className="flex flex-col gap-3">
                {dia.bloques.map((b, bIdx) => (
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
                          {bIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => moverBloque(bIdx, -1)}
                              title="Mover bloque hacia arriba"
                              className="dp-muted hover:dp-text-brand text-sm"
                            >
                              ▲
                            </button>
                          )}
                          {bIdx < dia.bloques.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moverBloque(bIdx, 1)}
                              title="Mover bloque hacia abajo"
                              className="dp-muted hover:dp-text-brand text-sm"
                            >
                              ▼
                            </button>
                          )}
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
                            datalistId="biblioteca-datalist-kine"
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
                ))}
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
              onClick={compartir}
              disabled={compartiendo || !plan.cambios_sin_compartir}
              className="dp-bg-ink rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
              title="El cliente solo ve cambios cuando compartís"
            >
              {compartiendo ? "Compartiendo…" : "Compartir"}
            </button>
            {sharedAt && !compartiendo ? (
              <span className="dp-text-brand text-xs">✓ Compartido — el cliente ya lo ve.</span>
            ) : plan.cambios_sin_compartir ? (
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
