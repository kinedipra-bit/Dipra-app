"use client";

import { useState, useTransition } from "react";
import { tonoEscalaPilar } from "@/lib/dipra/calc";
import { agruparPorBloque, ejerciciosDesdeDia } from "@/lib/dipra/agruparEjercicios";
import { PILARES_KEYS, TIPOS_SESION, emptySesionPilares } from "@/lib/dipra/constants";
import { esYoutubeVertical, youtubeEmbedUrl } from "@/lib/youtube";
import type { DiaEntrenamiento, DiaPlan, EjercicioSesion, Sesion } from "@/lib/dipra/types";
import {
  actualizarTipoYAutoriaSesion,
  copiarSesionAPlanFuerza,
  copiarSesionATareas,
  crearSesion,
  eliminarSesion,
  marcarSesionRevisada,
  type NuevaSesionInput,
} from "./actions";
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
}: {
  clienteId: string;
  sesionesIniciales: Sesion[];
  diasPlan: DiaPlan[];
  diasConfirmados: DiaEntrenamiento[];
}) {
  const [modo, setModo] = useState<"list" | "form">("list");
  const [draft, setDraft] = useState<NuevaSesionInput | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [videoAbiertoId, setVideoAbiertoId] = useState<string | null>(null);
  const [editandoMetaId, setEditandoMetaId] = useState<string | null>(null);
  const [metaTipo, setMetaTipo] = useState("");
  const [metaPorCliente, setMetaPorCliente] = useState(false);
  const [copiandoA, setCopiandoA] = useState<"tareas" | "plan" | null>(null);
  const [, startCopia] = useTransition();
  const [mensajeCopia, setMensajeCopia] = useState<string | null>(null);

  const sesiones = [...sesionesIniciales].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const iniciarNueva = () => {
    setDraft(nuevoDraft(sesiones.length === 0));
    setModo("form");
  };

  const cancelar = () => {
    setDraft(null);
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

  // Ejercicio sumado durante la sesión, sin equivalente en el plan — ej. el
  // profesional decide exigir un poco más y agrega algo que no estaba
  // programado. `bloqueTitle` indica a qué bloque extra se suma — si no se
  // pasa, continúa el último bloque extra si el array ya termina en uno
  // (mismo criterio de agrupación que agruparPorBloque), o arranca uno
  // nuevo si no hay ninguno todavía.
  const agregarEjercicioExtra = (bloqueTitle?: string) => {
    if (!draft) return;
    const ultimo = draft.ejercicios[draft.ejercicios.length - 1];
    const titulo = bloqueTitle ?? (ultimo?.extra ? ultimo.bloqueTitle! : "Nuevo bloque");
    const nuevo: EjercicioSesion = {
      id: crypto.randomUUID(),
      nombre: "",
      seriesPlan: 0,
      repsPlan: 0,
      kgPlan: 0,
      seriesReal: 1,
      repsReal: 0,
      kgReal: 0,
      rpe: "",
      bloqueTitle: titulo,
      extra: true,
    };
    setDraft({ ...draft, ejercicios: [...draft.ejercicios, nuevo] });
  };

  // Siempre arranca un bloque nuevo (a diferencia de agregarEjercicioExtra
  // sin argumentos, que continúa el último si corresponde) — el título
  // tiene que ser distinto al de cualquier bloque extra ya creado, si no
  // dos clics seguidos en "+ Agregar bloque" quedan agrupados juntos (misma
  // etiqueta = mismo bloque, ver agruparPorBloque) y da la sensación de que
  // el botón no hizo nada / agregó un ejercicio suelto en vez de un bloque.
  const agregarBloqueExtra = () => {
    if (!draft) return;
    const usados = new Set(
      draft.ejercicios
        .map((e) => e.bloqueTitle?.match(/^Nuevo bloque(?: (\d+))?$/))
        .filter((m): m is RegExpMatchArray => !!m)
        .map((m) => (m[1] ? Number(m[1]) : 1))
    );
    let n = 1;
    while (usados.has(n)) n++;
    agregarEjercicioExtra(n === 1 ? "Nuevo bloque" : `Nuevo bloque ${n}`);
  };

  const quitarEjercicioExtra = (idx: number) => {
    if (!draft) return;
    setDraft({ ...draft, ejercicios: draft.ejercicios.filter((_, i) => i !== idx) });
  };

  // Renombra el bloque de TODOS los ejercicios extra que forman ese grupo
  // visual (ver agruparPorBloque) — cada EjercicioSesion guarda su propio
  // bloqueTitle, así que renombrar "el bloque" es actualizarlo en cada uno.
  const renombrarBloqueExtra = (idxs: number[], nuevoTitulo: string) => {
    if (!draft) return;
    const next = [...draft.ejercicios];
    idxs.forEach((i) => {
      next[i] = { ...next[i], bloqueTitle: nuevoTitulo };
    });
    setDraft({ ...draft, ejercicios: next });
  };

  const guardar = () => {
    if (!draft) return;
    startTransition(async () => {
      await crearSesion(clienteId, draft);
      setDraft(null);
      setModo("list");
    });
  };

  // Esta pantalla nunca se comparte con el cliente (es solo un registro
  // para el profesional) — si lo que se cargó acá es en realidad una
  // sesión planificada de antemano (ej. kine, o una rutina de fuerza que
  // gustó y se quiere dejar fija), hace falta este puente para que termine
  // en Tareas o Plan, que son los que sí se pueden compartir.
  const copiarA = (destino: "tareas" | "plan") => {
    if (!draft || draft.ejercicios.length === 0) return;
    setMensajeCopia(null);
    setCopiandoA(destino);
    startCopia(async () => {
      const resultado =
        destino === "tareas"
          ? await copiarSesionATareas(clienteId, draft.ejercicios)
          : await copiarSesionAPlanFuerza(clienteId, draft.ejercicios);
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

        {!draft.dia_plan_label && draft.ejercicios.length === 0 && (
          <button
            type="button"
            onClick={agregarBloqueExtra}
            className="dp-text-brand w-fit text-xs font-medium hover:underline"
          >
            + Agregar bloque (sin elegir un día del plan)
          </button>
        )}

        {(draft.dia_plan_label || draft.ejercicios.length > 0) && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="dp-text-heading text-xs font-semibold uppercase tracking-wide">
                Ejecución real vs. planificado
              </p>
              <button
                type="button"
                onClick={agregarBloqueExtra}
                className="dp-text-brand text-xs font-medium hover:underline"
              >
                + Agregar bloque
              </button>
            </div>
            <div
              className="dp-muted grid gap-2 pb-1 text-[10px] font-medium uppercase tracking-wide"
              style={{ gridTemplateColumns: "1.4fr 0.9fr 0.5fr 0.5fr 0.9fr 0.4fr" }}
            >
              <span>Ejercicio</span>
              <span>Plan (S×R×Kg)</span>
              <span className="text-center">Ser.</span>
              <span className="text-center">Rep.</span>
              <span className="text-center">Kg real</span>
              <span className="text-center">RPE</span>
            </div>
            <div className="flex flex-col gap-3">
              {agruparPorBloque(draft.ejercicios).map((grupo, gIdx) => (
                <div key={gIdx}>
                  {grupo.items.every(({ ejercicio }) => ejercicio.extra) ? (
                    <input
                      type="text"
                      value={grupo.bloqueTitle}
                      onChange={(e) =>
                        renombrarBloqueExtra(
                          grupo.items.map(({ idx }) => idx),
                          e.target.value
                        )
                      }
                      className="dp-text-brand mb-1 w-full border-0 border-b border-dashed border-current bg-transparent text-base font-semibold tracking-wide uppercase outline-none"
                    />
                  ) : (
                    grupo.bloqueTitle && (
                      <p className="dp-text-brand mb-1 text-base font-semibold tracking-wide uppercase">
                        {grupo.bloqueTitle}
                      </p>
                    )
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
                          style={{ gridTemplateColumns: "1.4fr 0.9fr 0.5fr 0.5fr 0.9fr 0.4fr" }}
                        >
                          <div className="min-w-0">
                            {ex.extra ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={ex.nombre}
                                    onChange={(e) => updateEjercicio(idx, { nombre: e.target.value })}
                                    placeholder="Nombre del ejercicio"
                                    className="w-full rounded-md border border-black/10 px-1.5 py-0.5 text-sm outline-none focus:dp-border-brand"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => quitarEjercicioExtra(idx)}
                                    title="Quitar ejercicio"
                                    className="dp-alert shrink-0 text-xs"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={ex.link ?? ""}
                                  onChange={(e) => updateEjercicio(idx, { link: e.target.value })}
                                  placeholder="Link del video (opcional)"
                                  className="dp-muted w-full rounded-md border border-black/10 px-1.5 py-0.5 text-xs outline-none focus:dp-border-brand"
                                />
                              </div>
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
                                href={ex.link}
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
                            {ex.extra
                              ? "—"
                              : `${ex.seriesPlan}×${ex.repsPlan}${ex.unilateral ? " c/u" : ""}×${kgPlanTexto}kg${ex.pesoCadaUno ? " c/u" : ""}`}
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
                  {grupo.items.every(({ ejercicio }) => ejercicio.extra) && (
                    <button
                      type="button"
                      onClick={() => agregarEjercicioExtra(grupo.bloqueTitle)}
                      className="dp-text-brand mt-1 text-xs hover:underline"
                    >
                      + ejercicio en este bloque
                    </button>
                  )}
                </div>
              ))}
              {draft.ejercicios.length === 0 && (
                <p className="dp-muted py-2 text-xs">Este día no tiene ejercicios cargados en la planificación todavía.</p>
              )}
            </div>
          </div>
        )}

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
          {draft.ejercicios.length > 0 && (
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
                      <button
                        type="button"
                        onClick={() => abrirEdicionMeta(s)}
                        className="dp-text-brand w-fit text-xs hover:underline"
                      >
                        Editar tipo / autoría
                      </button>
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
                    {s.ejercicios.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {agruparPorBloque(s.ejercicios).map((grupo, gIdx) => (
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
                                  <div key={ex.id} className="flex items-center justify-between py-1.5 text-sm">
                                    <span className="dp-text-heading">{ex.nombre}</span>
                                    <span className="dp-muted font-mono text-xs">
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
                    )}
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
