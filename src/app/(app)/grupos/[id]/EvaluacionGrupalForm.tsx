"use client";

import { useState, useTransition } from "react";
import { crearPrHistorial, type NuevaMedicionInput } from "@/app/(app)/clientes/[id]/evolucion/actions";
import { agregarComposicion, crearFmsHistorial } from "@/app/(app)/clientes/[id]/evaluacion/actions";
import { METRICS, camposVacios, type MetricKey } from "@/app/(app)/clientes/[id]/evolucion/metricas";
import { obtenerFmsDeMiembros } from "../actions";
import type { FmsData } from "@/lib/dipra/calc";

// Métricas que Nicolás pidió ver primero en la grilla grupal (CMJ, SJ,
// Sentadilla, Press banca, Peso muerto, Pull-ups/Dead hang) — el resto de
// METRICS queda detrás de "+ más métricas" para no abrumar la grilla.
const METRICAS_DESTACADAS: MetricKey[] = [
  "cmj",
  "squat_jump",
  "sentadilla",
  "press_banca",
  "peso_muerto",
  "pull_ups",
  "dead_hang",
];

type ComposicionDraft = {
  talla: string;
  peso: string;
  grasa_pct: string;
  masa_muscular: string;
  agua_pct: string;
  masa_osea: string;
};

function composicionVacia(): ComposicionDraft {
  return { talla: "", peso: "", grasa_pct: "", masa_muscular: "", agua_pct: "", masa_osea: "" };
}

// Del FMS completo, solo estos 3 son puntajes/medidas sueltas (número),
// a diferencia de pasoValla/estocada/hombro/aslr/rotación (par derecha-
// izquierda) o los clearings (positivo/negativo) — esos no entran bien en
// una grilla y siguen cargándose desde la ficha individual de cada persona.
type FmsDraft = { sentadilla: string; pushUp: string; toeTouch: string };

function fmsVacio(): FmsDraft {
  return { sentadilla: "", pushUp: "", toeTouch: "" };
}

function medicionVacia(fecha: string, mesociclo: string, objetivo: string): NuevaMedicionInput {
  return {
    fecha,
    mesociclo,
    objetivo,
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
  };
}

const inputClass = "w-full rounded-md border border-black/10 px-1.5 py-1 text-center font-mono text-xs outline-none focus:dp-border-brand";

// Evaluación grupal: se carga de una vez para todo el roster (misma fecha/
// mesociclo/objetivo), pero cada valor se guarda en la ficha individual de
// esa persona — mismas tablas que usa Evaluación/Evolución de cada
// cliente — así el progreso de cada uno sigue viéndose en su propia
// Evolución, sin una estructura de datos grupal paralela.
export function EvaluacionGrupalForm({ miembros }: { miembros: { id: string; nombre: string }[] }) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [mesociclo, setMesociclo] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [verTodasLasMetricas, setVerTodasLasMetricas] = useState(false);
  const [verComposicion, setVerComposicion] = useState(false);
  const [verFms, setVerFms] = useState(false);
  const [cargandoFms, setCargandoFms] = useState(false);
  const [fmsActual, setFmsActual] = useState<Record<string, FmsData> | null>(null);
  const [rendimiento, setRendimiento] = useState<Record<string, Record<MetricKey, string>>>(() =>
    Object.fromEntries(miembros.map((m) => [m.id, camposVacios()]))
  );
  const [composicion, setComposicion] = useState<Record<string, ComposicionDraft>>(() =>
    Object.fromEntries(miembros.map((m) => [m.id, composicionVacia()]))
  );
  const [fms, setFms] = useState<Record<string, FmsDraft>>(() =>
    Object.fromEntries(miembros.map((m) => [m.id, fmsVacio()]))
  );
  const [pending, startTransition] = useTransition();
  const [guardadoAt, setGuardadoAt] = useState<number | null>(null);

  // El FMS actual de cada miembro se trae recién al abrir esa sección (no
  // de entrada) — solo hace falta para mergear al guardar, sin pisar el
  // resto del FMS de cada persona (pasoValla/estocada/clearings, etc.).
  const toggleFms = () => {
    setVerFms((v) => !v);
    if (!fmsActual && !cargandoFms) {
      setCargandoFms(true);
      obtenerFmsDeMiembros(miembros.map((m) => m.id))
        .then(setFmsActual)
        .finally(() => setCargandoFms(false));
    }
  };

  const metricasVisibles = verTodasLasMetricas ? METRICS : METRICS.filter((m) => METRICAS_DESTACADAS.includes(m.key));

  const setValor = (clienteId: string, key: MetricKey, value: string) => {
    setRendimiento((prev) => ({ ...prev, [clienteId]: { ...prev[clienteId], [key]: value } }));
  };
  const setComposicionValor = (clienteId: string, key: keyof ComposicionDraft, value: string) => {
    setComposicion((prev) => ({ ...prev, [clienteId]: { ...prev[clienteId], [key]: value } }));
  };
  const setFmsValor = (clienteId: string, key: keyof FmsDraft, value: string) => {
    setFms((prev) => ({ ...prev, [clienteId]: { ...prev[clienteId], [key]: value } }));
  };

  const guardar = () => {
    if (!mesociclo.trim()) return;
    startTransition(async () => {
      await Promise.all(
        miembros.map(async (m) => {
          const valores = rendimiento[m.id];
          const tieneRendimiento = METRICS.some((metric) => Number(valores[metric.key]) > 0);
          if (tieneRendimiento) {
            const entrada = medicionVacia(fecha, mesociclo.trim(), objetivo.trim());
            METRICS.forEach((metric) => {
              entrada[metric.key] = Number(valores[metric.key]) || 0;
            });
            await crearPrHistorial(m.id, entrada);
          }

          const comp = composicion[m.id];
          const tieneComposicion = Object.values(comp).some((v) => v.trim() !== "");
          if (tieneComposicion) {
            await agregarComposicion(m.id, {
              fecha,
              talla: comp.talla ? Number(comp.talla) : null,
              peso: comp.peso ? Number(comp.peso) : null,
              grasa_pct: comp.grasa_pct ? Number(comp.grasa_pct) : null,
              masa_muscular: comp.masa_muscular ? Number(comp.masa_muscular) : null,
              agua_pct: comp.agua_pct ? Number(comp.agua_pct) : null,
              masa_osea: comp.masa_osea ? Number(comp.masa_osea) : null,
            });
          }

          const fmsDraft = fms[m.id];
          const tieneFms = fmsDraft && Object.values(fmsDraft).some((v) => v.trim() !== "");
          if (tieneFms && fmsActual?.[m.id]) {
            await crearFmsHistorial(m.id, fecha, {
              ...fmsActual[m.id],
              sentadilla: fmsDraft.sentadilla.trim() || fmsActual[m.id].sentadilla,
              pushUp: fmsDraft.pushUp.trim() || fmsActual[m.id].pushUp,
              toeTouch: fmsDraft.toeTouch.trim() || fmsActual[m.id].toeTouch,
            });
          }
        })
      );
      setRendimiento(Object.fromEntries(miembros.map((m) => [m.id, camposVacios()])));
      setComposicion(Object.fromEntries(miembros.map((m) => [m.id, composicionVacia()])));
      setFms(Object.fromEntries(miembros.map((m) => [m.id, fmsVacio()])));
      setFmsActual(null);
      setGuardadoAt(Date.now());
    });
  };

  if (miembros.length === 0) {
    return (
      <p className="dp-muted dp-surface rounded-2xl p-8 text-center text-sm shadow-sm">
        Este grupo todavía no tiene miembros — agregalos en la pestaña &quot;Miembros&quot;.
      </p>
    );
  }

  return (
    <div className="dp-surface flex flex-col gap-4 rounded-2xl p-5 shadow-sm">
      <p className="dp-muted text-xs">
        Cada valor que cargues acá queda guardado en la ficha individual de esa persona (historial de marcas /
        composición corporal) — así el progreso de cada uno sigue viéndose en su propia Evolución.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">Fecha</span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-mono outline-none focus:dp-border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">Mesociclo</span>
          <input
            value={mesociclo}
            onChange={(e) => setMesociclo(e.target.value)}
            placeholder="Ej. Mesociclo 5"
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">Objetivo de la fase</span>
          <input
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            placeholder="Ej. Hipertrofia / Adaptación"
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="dp-muted sticky left-0 bg-inherit px-2 py-1 text-left text-[10px] font-medium uppercase">
                Persona
              </th>
              {metricasVisibles.map((m) => (
                <th key={m.key} className="dp-muted min-w-20 px-1 py-1 text-[10px] font-medium">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {miembros.map((m) => (
              <tr key={m.id} className="border-t border-black/5">
                <td className="dp-text-heading sticky left-0 bg-inherit px-2 py-1 text-sm font-medium whitespace-nowrap">
                  {m.nombre}
                </td>
                {metricasVisibles.map((metric) => (
                  <td key={metric.key} className="px-1 py-1">
                    <input
                      type="number"
                      value={rendimiento[m.id]?.[metric.key] ?? ""}
                      onChange={(e) => setValor(m.id, metric.key, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className={inputClass}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => setVerTodasLasMetricas((v) => !v)}
        className="dp-text-brand w-fit text-xs hover:underline"
      >
        {verTodasLasMetricas ? "← Ver solo las métricas destacadas" : "+ Más métricas (saltos, agarre, planchas…)"}
      </button>

      <button
        type="button"
        onClick={() => setVerComposicion((v) => !v)}
        className="dp-text-brand w-fit text-xs hover:underline"
      >
        {verComposicion ? "← Ocultar composición corporal" : "+ Composición corporal (para quienes corresponda)"}
      </button>

      <button type="button" onClick={toggleFms} className="dp-text-brand w-fit text-xs hover:underline">
        {verFms ? "← Ocultar FMS" : "+ FMS (sentadilla, push up, toe touch)"}
      </button>

      {verComposicion && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="dp-muted sticky left-0 bg-inherit px-2 py-1 text-left text-[10px] font-medium uppercase">
                  Persona
                </th>
                {(["peso", "talla", "grasa_pct", "masa_muscular", "agua_pct", "masa_osea"] as const).map((k) => (
                  <th key={k} className="dp-muted min-w-20 px-1 py-1 text-[10px] font-medium">
                    {{
                      peso: "Peso (kg)",
                      talla: "Talla (cm)",
                      grasa_pct: "% Grasa",
                      masa_muscular: "M. muscular",
                      agua_pct: "% Agua",
                      masa_osea: "M. ósea",
                    }[k]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {miembros.map((m) => (
                <tr key={m.id} className="border-t border-black/5">
                  <td className="dp-text-heading sticky left-0 bg-inherit px-2 py-1 text-sm font-medium whitespace-nowrap">
                    {m.nombre}
                  </td>
                  {(["peso", "talla", "grasa_pct", "masa_muscular", "agua_pct", "masa_osea"] as const).map((k) => (
                    <td key={k} className="px-1 py-1">
                      <input
                        type="number"
                        value={composicion[m.id]?.[k] ?? ""}
                        onChange={(e) => setComposicionValor(m.id, k, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className={inputClass}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {verFms && (
        <div className="overflow-x-auto">
          {cargandoFms ? (
            <p className="dp-muted text-xs">Cargando FMS actual de cada persona…</p>
          ) : (
            <>
              <p className="dp-muted mb-1 text-[11px]">
                El resto del FMS (pasoValla, estocada, hombro, aslr, rotación, clearings) sigue cargándose desde la
                ficha individual de cada persona — acá solo van los 3 puntajes sueltos.
              </p>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="dp-muted sticky left-0 bg-inherit px-2 py-1 text-left text-[10px] font-medium uppercase">
                      Persona
                    </th>
                    {(["sentadilla", "pushUp", "toeTouch"] as const).map((k) => (
                      <th key={k} className="dp-muted min-w-20 px-1 py-1 text-[10px] font-medium">
                        {{ sentadilla: "Sentadilla (0-3)", pushUp: "Push up (0-3)", toeTouch: "Toe touch" }[k]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {miembros.map((m) => (
                    <tr key={m.id} className="border-t border-black/5">
                      <td className="dp-text-heading sticky left-0 bg-inherit px-2 py-1 text-sm font-medium whitespace-nowrap">
                        {m.nombre}
                      </td>
                      {(["sentadilla", "pushUp", "toeTouch"] as const).map((k) => (
                        <td key={k} className="px-1 py-1">
                          <input
                            value={fms[m.id]?.[k] ?? ""}
                            onChange={(e) => setFmsValor(m.id, k, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder={String(fmsActual?.[m.id]?.[k] ?? "")}
                            className={inputClass}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={guardar}
          disabled={!mesociclo.trim() || pending}
          className="dp-bg-brand w-fit rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {pending ? "Guardando…" : "Guardar evaluación grupal"}
        </button>
        {guardadoAt && !pending && (
          <span className="dp-muted text-xs">Guardado en la ficha de cada persona.</span>
        )}
      </div>
    </div>
  );
}
