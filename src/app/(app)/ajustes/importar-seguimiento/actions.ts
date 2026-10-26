"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dipra/auth";
import { ANTECEDENTES_CAMPOS } from "@/lib/dipra/constants";
import type { Cliente } from "@/lib/dipra/types";
import { crearPrHistorial } from "../../clientes/[id]/evolucion/actions";
import { crearFmsHistorial, crearEpisodio, agregarComposicion } from "../../clientes/[id]/evaluacion/actions";
import { PERSONAS_EXCEL_SEGUIMIENTO, type PersonaExcelSeguimiento } from "./datosExcel";

function defaultAntecedentes(): Record<string, string> {
  return Object.fromEntries(ANTECEDENTES_CAMPOS.map((c) => [c.key, ""]));
}

// Solo junta lo que el Excel trae como flags S/N — no pisa texto que ya
// exista a mano en la ficha (ver mergeAntecedentes).
function computeAntecedentesExcel(p: PersonaExcelSeguimiento): Partial<Record<string, string>> {
  const out: Partial<Record<string, string>> = {};
  const cronicas = [p.diabetes ? "Diabetes" : null, p.artrosis ? "Artrosis" : null].filter(Boolean);
  if (cronicas.length) out.cronicas = cronicas.join(", ");
  const cardiacos = [p.hta ? "HTA" : null, p.cardiopatia ? "Cardiopatía" : null].filter(Boolean);
  if (cardiacos.length) out.cardiacos = cardiacos.join(", ");
  if (p.cancer) out.cancer = "Historia de cáncer";
  return out;
}

function mergeAntecedentes(existentes: Record<string, string>, excel: Partial<Record<string, string>>) {
  const out = { ...defaultAntecedentes(), ...existentes };
  for (const [key, val] of Object.entries(excel)) {
    if (!out[key]?.trim() && val) out[key] = val;
  }
  return out;
}

function computeCamposExtra(p: PersonaExcelSeguimiento): { id: string; etiqueta: string; valor: string }[] {
  const pares: [string, string | null | undefined][] = [
    ["Sexo", p.sexo],
    ["Riesgo de salud", p.riesgoSalud],
    ["Medicación relevante", p.medicaciones],
    ["Observaciones de salud", p.observacionesSalud],
    ["Estado (Excel)", p.estado],
    ["Notas (Excel)", p.notasBase],
  ];
  return pares
    .filter(([, v]) => v && v.trim())
    .map(([etiqueta, valor]) => ({ id: crypto.randomUUID(), etiqueta, valor: valor as string }));
}

function computeMotivoConsulta(p: PersonaExcelSeguimiento): string | null {
  const partes = [
    p.dolorLocalizacion ? `Dolor en ${p.dolorLocalizacion}.` : null,
    p.dolorTipo ? `Tipo: ${p.dolorTipo}.` : null,
    p.dolorIrritabilidad ? `Irritabilidad: ${p.dolorIrritabilidad}.` : null,
    p.dolorReproducibleConCarga !== null ? `Reproducible con carga: ${p.dolorReproducibleConCarga ? "sí" : "no"}.` : null,
    p.dolorDeficitNeurologico !== null ? `Déficit neurológico: ${p.dolorDeficitNeurologico ? "sí" : "no"}.` : null,
    p.dolorNotas,
  ].filter(Boolean);
  return partes.length ? partes.join(" ") : null;
}

const METRICAS_EXTRA_LABELS = ["RDL (kg)", "TUG (seg)", "Unipodal der (seg)", "Unipodal izq (seg)", "NCMJ (cm)"] as const;

async function obtenerOcrearMetricasExtra(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<Record<string, string>> {
  const { data: existentes } = await supabase
    .from("metricas_rendimiento_extra")
    .select("id, label")
    .is("cliente_id", null)
    .returns<{ id: string; label: string }[]>();
  const porLabel = new Map((existentes ?? []).map((m) => [m.label, m.id]));
  const ids: Record<string, string> = {};
  for (const label of METRICAS_EXTRA_LABELS) {
    let id = porLabel.get(label);
    if (!id) {
      const { data, error } = await supabase
        .from("metricas_rendimiento_extra")
        .insert({ cliente_id: null, label })
        .select("id")
        .single<{ id: string }>();
      if (error) throw new Error(error.message);
      id = data.id;
    }
    ids[label] = id;
  }
  return ids;
}

function hayDatoFuncional(p: PersonaExcelSeguimiento) {
  return [
    p.deadHang, p.agarreDer, p.agarreIzq, p.pushUps, p.planchaFrontal, p.planchaLateralDer, p.planchaLateralIzq,
    p.prDeadlift, p.prSquat, p.prPress, p.pullUps, p.squatJump, p.cmjFuerza, p.cmjPotencia,
    p.rdl, p.tug, p.unipodalDer, p.unipodalIzq, p.ncmj,
  ].some((v) => v !== null);
}

function hayDatoFms(p: PersonaExcelSeguimiento) {
  return [
    p.fmsDeepSquat, p.fmsHurdleStep, p.fmsInlineLunge, p.fmsShoulderMobility, p.fmsAslr,
    p.fmsTrunkStabilityPushUp, p.fmsRotaryStability, p.fmsToeTouch,
  ].some((v) => v !== null);
}

async function importarPersona(
  supabase: Awaited<ReturnType<typeof createClient>>,
  persona: PersonaExcelSeguimiento,
  clienteIdExistente: string | null,
  metricaIds: Record<string, string>
): Promise<string> {
  let clienteId = clienteIdExistente;
  let existente: Cliente | null = null;

  if (clienteId) {
    const { data } = await supabase.from("clients").select("*").eq("id", clienteId).single<Cliente>();
    existente = data;
  }

  const antecedentesExcel = computeAntecedentesExcel(persona);
  const camposExtraExcel = computeCamposExtra(persona);
  const motivoConsulta = computeMotivoConsulta(persona);

  if (!clienteId || !existente) {
    const iniciales = persona.nombre
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");
    const insert: Record<string, unknown> = {
      nombre: persona.nombre,
      iniciales,
      rut: persona.rut,
      correo: persona.correo ?? "",
      categoria: persona.categoria ?? "",
      fecha_nacimiento: persona.fechaNacimiento,
      antecedentes: { ...defaultAntecedentes(), ...antecedentesExcel },
      campos_extra: camposExtraExcel,
    };
    if (persona.fechaInicio) insert.inicio = persona.fechaInicio;
    if (motivoConsulta) insert.motivo_consulta = motivoConsulta;
    if (persona.diagnosticoFuncional) insert.diagnostico_kinesico = persona.diagnosticoFuncional;
    const { data, error } = await supabase.from("clients").insert(insert).select("id").single<{ id: string }>();
    if (error) throw new Error(error.message);
    clienteId = data.id;
  } else {
    const patch: Record<string, unknown> = {};
    if (!existente.rut && persona.rut) patch.rut = persona.rut;
    if (!existente.correo?.trim() && persona.correo) patch.correo = persona.correo;
    if (!existente.fecha_nacimiento && persona.fechaNacimiento) patch.fecha_nacimiento = persona.fechaNacimiento;
    if (!existente.categoria?.trim() && persona.categoria) patch.categoria = persona.categoria;
    if (!existente.diagnostico_kinesico?.trim() && persona.diagnosticoFuncional) {
      patch.diagnostico_kinesico = persona.diagnosticoFuncional;
    }
    if (!existente.motivo_consulta?.trim() && motivoConsulta) patch.motivo_consulta = motivoConsulta;

    const antecedentesMerged = mergeAntecedentes(existente.antecedentes, antecedentesExcel);
    if (JSON.stringify(antecedentesMerged) !== JSON.stringify(existente.antecedentes)) {
      patch.antecedentes = antecedentesMerged;
    }
    if (camposExtraExcel.length > 0) {
      patch.campos_extra = [...(existente.campos_extra ?? []), ...camposExtraExcel];
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from("clients").update(patch).eq("id", clienteId);
      if (error) throw new Error(error.message);
    }
  }

  if (persona.peso || persona.estatura) {
    await agregarComposicion(clienteId, {
      fecha: persona.fechaInicio ?? new Date().toISOString().slice(0, 10),
      talla: persona.estatura,
      peso: persona.peso,
      grasa_pct: null,
      masa_muscular: null,
      agua_pct: null,
      masa_osea: null,
    });
  }

  if (hayDatoFms(persona)) {
    const fecha = persona.fechaTestFuncional ?? new Date().toISOString().slice(0, 10);
    await crearFmsHistorial(clienteId, fecha, {
      sentadilla: persona.fmsDeepSquat ?? "",
      pasoValla: { d: persona.fmsHurdleStep ?? "", i: persona.fmsHurdleStep ?? "" },
      estocada: { d: persona.fmsInlineLunge ?? "", i: persona.fmsInlineLunge ?? "" },
      hombro: { d: persona.fmsShoulderMobility ?? "", i: persona.fmsShoulderMobility ?? "" },
      clearingHombro: { d: false, i: false },
      aslr: { d: persona.fmsAslr ?? "", i: persona.fmsAslr ?? "" },
      pushUp: persona.fmsTrunkStabilityPushUp ?? "",
      clearingExtension: false,
      rotacion: { d: persona.fmsRotaryStability ?? "", i: persona.fmsRotaryStability ?? "" },
      clearingFlexion: false,
      toeTouch: persona.fmsToeTouch ?? "",
    });
  }

  if (hayDatoFuncional(persona)) {
    const fecha = persona.fechaTestFuncional ?? persona.fechaTestFuerza ?? persona.fechaTestPotencia ?? new Date().toISOString().slice(0, 10);
    const esPushUpDesdePress = persona.prPressNota === "__PUSHUP_REPS__";
    const notasObjetivo = [
      persona.pararseDelSuelo ? `Pararse del suelo sin manos: ${persona.pararseDelSuelo}.` : null,
      persona.funcionalNotas,
      persona.potenciaNotas,
      ...persona.notas_import,
      persona.deadHangNota ? `Dead hang: ${persona.deadHangNota}.` : null,
      persona.prDeadliftNota ? `PR Deadlift: ${persona.prDeadliftNota}.` : null,
    ].filter(Boolean);
    await crearPrHistorial(clienteId, {
      fecha,
      mesociclo: "Carga inicial (import Excel)",
      objetivo: notasObjetivo.join(" "),
      sentadilla: persona.prSquat ?? 0,
      peso_muerto: persona.prDeadlift ?? 0,
      press_banca: esPushUpDesdePress ? 0 : persona.prPress ?? 0,
      press_militar: 0,
      broad_jump: 0,
      abalakov_jump: 0,
      cmj: persona.cmjPotencia ?? persona.cmjFuerza ?? 0,
      squat_jump: persona.squatJump ?? 0,
      agarre_der: persona.agarreDer ?? 0,
      agarre_izq: persona.agarreIzq ?? 0,
      dead_hang: persona.deadHang ?? 0,
      pull_ups: persona.pullUps ?? 0,
      push_up: persona.pushUps ?? (esPushUpDesdePress ? persona.prPress ?? 0 : 0),
      plancha_frontal: persona.planchaFrontal ?? 0,
      plancha_lateral_der: persona.planchaLateralDer ?? 0,
      plancha_lateral_izq: persona.planchaLateralIzq ?? 0,
      pararse_del_suelo: 0,
      extra: {
        [metricaIds["RDL (kg)"]]: persona.rdl ?? 0,
        [metricaIds["TUG (seg)"]]: persona.tug ?? 0,
        [metricaIds["Unipodal der (seg)"]]: persona.unipodalDer ?? 0,
        [metricaIds["Unipodal izq (seg)"]]: persona.unipodalIzq ?? 0,
        [metricaIds["NCMJ (cm)"]]: persona.ncmj ?? 0,
      },
    });
  }

  // El motivo_consulta ya se guardó arriba en el patch/insert de clients;
  // acá además queda su propio episodio con fecha, igual que el resto de la
  // app guarda reevaluaciones de dolor en el tiempo.
  if (motivoConsulta) {
    await crearEpisodio(clienteId, persona.dolorFechaReevaluacion ?? new Date().toISOString().slice(0, 10), motivoConsulta, {
      localizacion: persona.dolorLocalizacion ?? "",
      caracter: persona.dolorTipo ?? "",
    });
  }

  return clienteId;
}

export interface DecisionImportacion {
  nombreExcel: string;
  clienteId: string | null;
}

export interface ResultadoImportacion {
  nombre: string;
  ok: boolean;
  error?: string;
}

export async function ejecutarImportacion(decisiones: DecisionImportacion[]): Promise<ResultadoImportacion[]> {
  await requireAdmin();
  const supabase = await createClient();
  const metricaIds = await obtenerOcrearMetricasExtra(supabase);

  const resultados = await Promise.all(
    decisiones.map(async (d) => {
      const persona = PERSONAS_EXCEL_SEGUIMIENTO.find((p) => p.nombre === d.nombreExcel);
      if (!persona) return { nombre: d.nombreExcel, ok: false, error: "No encontrado en los datos del Excel." };
      try {
        await importarPersona(supabase, persona, d.clienteId, metricaIds);
        return { nombre: persona.nombre, ok: true };
      } catch (e) {
        return { nombre: persona.nombre, ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    })
  );

  revalidatePath("/clientes");
  return resultados;
}
