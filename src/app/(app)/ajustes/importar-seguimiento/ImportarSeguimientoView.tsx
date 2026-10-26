"use client";

import { useMemo, useState, useTransition } from "react";
import { ejecutarImportacion, type ResultadoImportacion } from "./actions";
import { PERSONAS_EXCEL_SEGUIMIENTO, type PersonaExcelSeguimiento } from "./datosExcel";
import type { ClienteExistente } from "./page";

function normalizar(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

function normalizarRut(s: string) {
  return s.toLowerCase().replace(/[.\-\s]/g, "");
}

function mejorCandidato(persona: PersonaExcelSeguimiento, clientes: ClienteExistente[]): string {
  const nn = normalizar(persona.nombre);
  const exacto = clientes.find((c) => normalizar(c.nombre) === nn);
  if (exacto) return exacto.id;
  if (persona.rut) {
    const rutNorm = normalizarRut(persona.rut);
    const porRut = clientes.find((c) => c.rut && normalizarRut(c.rut) === rutNorm);
    if (porRut) return porRut.id;
  }
  return "";
}

// Campos que se completarían en un cliente YA existente — null si el
// cliente ya tiene ese dato (no se pisa, ver actions.ts).
function camposAFaltar(persona: PersonaExcelSeguimiento, existente: ClienteExistente | undefined) {
  if (!existente) return null;
  const faltantes: string[] = [];
  if (!existente.rut && persona.rut) faltantes.push(`RUT: ${persona.rut}`);
  if (!existente.correo?.trim() && persona.correo) faltantes.push(`Correo: ${persona.correo}`);
  if (!existente.fecha_nacimiento && persona.fechaNacimiento) faltantes.push(`Fecha nacimiento: ${persona.fechaNacimiento}`);
  if (!existente.categoria?.trim() && persona.categoria) faltantes.push(`Categoría: ${persona.categoria}`);
  if (!existente.diagnostico_kinesico?.trim() && persona.diagnosticoFuncional) {
    faltantes.push(`Diagnóstico funcional: ${persona.diagnosticoFuncional}`);
  }
  return faltantes;
}

function resumenCategorias(p: PersonaExcelSeguimiento) {
  const tags: string[] = [];
  if (p.diabetes || p.hta || p.cardiopatia || p.cancer || p.artrosis || p.medicaciones || p.riesgoSalud) tags.push("Salud");
  if (p.dolorLocalizacion || p.diagnosticoFuncional) tags.push("Dolor");
  if ([p.fmsDeepSquat, p.fmsHurdleStep, p.fmsInlineLunge, p.fmsShoulderMobility, p.fmsAslr].some((v) => v !== null)) tags.push("FMS");
  if ([p.deadHang, p.agarreDer, p.pushUps, p.planchaFrontal].some((v) => v !== null)) tags.push("Funcional");
  if ([p.prDeadlift, p.prSquat, p.prPress, p.pullUps].some((v) => v !== null)) tags.push("Fuerza");
  if ([p.ncmj, p.cmjPotencia, p.tug, p.unipodalDer].some((v) => v !== null)) tags.push("Potencia");
  return tags;
}

export function ImportarSeguimientoView({ clientesExistentes }: { clientesExistentes: ClienteExistente[] }) {
  const [matches, setMatches] = useState<Record<string, string>>(() =>
    Object.fromEntries(PERSONAS_EXCEL_SEGUIMIENTO.map((p) => [p.nombre, mejorCandidato(p, clientesExistentes)]))
  );
  const [expandido, setExpandido] = useState<string | null>(null);
  const [importando, startImportar] = useTransition();
  const [resultados, setResultados] = useState<ResultadoImportacion[] | null>(null);

  const clientesPorId = useMemo(() => new Map(clientesExistentes.map((c) => [c.id, c])), [clientesExistentes]);

  const nuevos = PERSONAS_EXCEL_SEGUIMIENTO.filter((p) => !matches[p.nombre]).length;
  const matcheados = PERSONAS_EXCEL_SEGUIMIENTO.length - nuevos;

  const importar = () => {
    if (!confirm(`¿Importar ${PERSONAS_EXCEL_SEGUIMIENTO.length} personas (${nuevos} nuevas, ${matcheados} existentes)? Esto escribe en la base real.`)) {
      return;
    }
    startImportar(async () => {
      const decisiones = PERSONAS_EXCEL_SEGUIMIENTO.map((p) => ({
        nombreExcel: p.nombre,
        clienteId: matches[p.nombre] || null,
      }));
      const r = await ejecutarImportacion(decisiones);
      setResultados(r);
    });
  };

  if (resultados) {
    const ok = resultados.filter((r) => r.ok);
    const errores = resultados.filter((r) => !r.ok);
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold dp-text-heading">
          Importación terminada
        </h1>
        <p className="dp-text-brand text-sm font-medium">✓ {ok.length} personas importadas correctamente.</p>
        {errores.length > 0 && (
          <div className="dp-surface rounded-2xl p-4 shadow-sm">
            <p className="dp-alert mb-2 text-sm font-medium">{errores.length} con error:</p>
            <ul className="flex flex-col gap-1 text-sm">
              {errores.map((e) => (
                <li key={e.nombre} className="dp-alert">
                  {e.nombre}: {e.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold dp-text-heading">
          Importar seguimiento desde Excel
        </h1>
        <p className="dp-muted text-xs">
          {PERSONAS_EXCEL_SEGUIMIENTO.length} personas encontradas en el Excel — confirmá a qué cliente de la base
          corresponde cada una (o dejá &quot;Crear cliente nuevo&quot;) antes de importar. No se escribe nada en la
          base hasta que tocás &quot;Importar&quot;. Si un cliente ya existe, solo se completan los campos que
          todavía tenga vacíos — nunca se pisa algo que ya cargaste a mano.
        </p>
      </div>

      <div className="dp-surface flex items-center justify-between rounded-2xl p-4 shadow-sm">
        <span className="dp-body text-sm">
          {matcheados} coinciden con un cliente existente, {nuevos} se crean como nuevos
        </span>
        <button
          type="button"
          onClick={importar}
          disabled={importando}
          className="dp-bg-brand rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {importando ? "Importando…" : "Importar"}
        </button>
      </div>

      <div className="dp-surface divide-y divide-black/5 rounded-2xl shadow-sm">
        {PERSONAS_EXCEL_SEGUIMIENTO.map((p) => {
          const clienteId = matches[p.nombre];
          const existente = clienteId ? clientesPorId.get(clienteId) : undefined;
          const faltantes = camposAFaltar(p, existente);
          const abierto = expandido === p.nombre;
          return (
            <div key={p.nombre} className="flex flex-col gap-2 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-56 shrink-0">
                  <p className="dp-text-heading text-sm font-medium">{p.nombre}</p>
                  {p.variantes.length > 0 && (
                    <p className="dp-muted text-[10px]">también: {p.variantes.join(", ")}</p>
                  )}
                </div>
                <select
                  value={clienteId}
                  onChange={(e) => setMatches((prev) => ({ ...prev, [p.nombre]: e.target.value }))}
                  className="w-64 shrink-0 rounded-lg border border-black/10 px-2 py-1 text-sm outline-none focus:dp-border-brand"
                >
                  <option value="">+ Crear cliente nuevo</option>
                  {clientesExistentes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                      {c.rut ? ` (${c.rut})` : ""}
                    </option>
                  ))}
                </select>
                <div className="flex flex-1 flex-wrap gap-1">
                  {resumenCategorias(p).map((t) => (
                    <span key={t} className="dp-bg-faint dp-muted rounded px-1.5 py-0.5 text-[10px] font-medium">
                      {t}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setExpandido(abierto ? null : p.nombre)}
                  className="dp-text-brand shrink-0 text-xs font-medium hover:underline"
                >
                  {abierto ? "Ocultar detalle" : "Ver detalle"}
                </button>
              </div>

              {!clienteId && (
                <p className="dp-muted text-[11px]">Se crea como cliente nuevo, solo con el nombre y los datos del Excel.</p>
              )}
              {clienteId && faltantes && faltantes.length > 0 && (
                <p className="dp-muted text-[11px]">Se completan campos vacíos: {faltantes.join(" · ")}</p>
              )}
              {clienteId && faltantes && faltantes.length === 0 && (
                <p className="dp-muted text-[11px]">Este cliente ya tiene cargados los datos básicos — solo se agrega historial.</p>
              )}

              {abierto && <DetallePersona persona={p} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function par(label: string, v: unknown): [string, unknown] {
  return [label, v];
}

function DetallePersona({ persona: p }: { persona: PersonaExcelSeguimiento }) {
  const campos: [string, unknown][] = [
    par("RUT", p.rut), par("Correo", p.correo), par("Fecha nacimiento", p.fechaNacimiento), par("Categoría", p.categoria),
    par("Diabetes", p.diabetes), par("HTA", p.hta), par("Cardiopatía", p.cardiopatia), par("Cáncer", p.cancer), par("Artrosis", p.artrosis),
    par("Medicaciones", p.medicaciones), par("Riesgo salud", p.riesgoSalud), par("Observaciones salud", p.observacionesSalud),
    par("Dolor — localización", p.dolorLocalizacion), par("Dolor — tipo", p.dolorTipo), par("Dolor — irritabilidad", p.dolorIrritabilidad),
    par("Diagnóstico funcional", p.diagnosticoFuncional),
    par("FMS Deep Squat", p.fmsDeepSquat), par("FMS Hurdle Step", p.fmsHurdleStep), par("FMS Inline Lunge", p.fmsInlineLunge),
    par("FMS Shoulder Mobility", p.fmsShoulderMobility), par("FMS ASLR", p.fmsAslr), par("FMS Trunk Stability Push-Up", p.fmsTrunkStabilityPushUp),
    par("FMS Rotary Stability", p.fmsRotaryStability), par("FMS toe touch", p.fmsToeTouch),
    par("Dead hang (seg)", p.deadHang), par("Agarre der (kg)", p.agarreDer), par("Agarre izq (kg)", p.agarreIzq),
    par("Push-ups (reps)", p.pushUps), par("Plancha frontal (seg)", p.planchaFrontal),
    par("PR Deadlift (kg)", p.prDeadlift), par("RDL (kg)", p.rdl), par("PR Squat (kg)", p.prSquat), par("PR Press/Push-up", p.prPress),
    par("Pull-ups (reps)", p.pullUps), par("Squat jump", p.squatJump), par("CMJ (fuerza)", p.cmjFuerza),
    par("NCMJ", p.ncmj), par("CMJ (potencia)", p.cmjPotencia), par("TUG (seg)", p.tug),
    par("Unipodal der (seg)", p.unipodalDer), par("Unipodal izq (seg)", p.unipodalIzq),
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  if (campos.length === 0) {
    return <p className="dp-muted text-xs">Sin más datos además del nombre.</p>;
  }

  return (
    <div className="dp-bg-faint grid grid-cols-2 gap-x-4 gap-y-0.5 rounded-xl p-3 sm:grid-cols-3">
      {campos.map(([label, v]) => (
        <p key={label} className="truncate text-[11px]">
          <span className="dp-muted">{label}:</span>{" "}
          <span className="dp-body font-medium">{typeof v === "boolean" ? (v ? "sí" : "no") : String(v)}</span>
        </p>
      ))}
    </div>
  );
}
