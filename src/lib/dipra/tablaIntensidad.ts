// Tabla de referencia de intensidad por cualidad de fuerza (provista por
// Nicolás, fuente: movementsolutions.cl). Son reglas generales, no
// prescripciones estrictas — cada atleta puede salirse del rango según su
// caso. `setsSemana` es SETS POR SEMANA (sumando todos los días de la
// semana activa que trabajen esa cualidad), no por sesión ni por ejercicio.
import type { BloquePlan, CualidadFuerza, DiaPlan, GrupoMuscular } from "./types";

export interface FilaIntensidad {
  reps: string;
  porcentaje1RM: string;
  setsSemana: [number, number];
  tut: string;
  descanso: string;
}

export const TABLA_INTENSIDAD: Record<CualidadFuerza, FilaIntensidad> = {
  "Fuerza Máxima Relativa": { reps: "≤5", porcentaje1RM: "85-100%", setsSemana: [6, 12], tut: "<20s", descanso: "3-5min" },
  "Potencia Máxima Relativa": { reps: "≤5", porcentaje1RM: "45-65%", setsSemana: [5, 10], tut: "Explosiva", descanso: "3-5min" },
  "Fuerza General (Hipertrofia Funcional)": { reps: "6-8", porcentaje1RM: "79-85%", setsSemana: [4, 8], tut: "20-40s", descanso: "1-2min" },
  Hipertrofia: { reps: "9-12", porcentaje1RM: "≤70-80%", setsSemana: [3, 6], tut: "40-70s", descanso: "<1 min" },
  "Resistencia a la Fuerza": { reps: "12+", porcentaje1RM: "≤70%", setsSemana: [2, 4], tut: "70s+", descanso: "<30-45s" },
  "Resistencia a la Potencia": { reps: "10-20+", porcentaje1RM: "30-45%", setsSemana: [2, 4], tut: "Explosivo", descanso: "<60-90s" },
};

export const CUALIDADES: CualidadFuerza[] = [
  "Fuerza Máxima Relativa",
  "Potencia Máxima Relativa",
  "Fuerza General (Hipertrofia Funcional)",
  "Hipertrofia",
  "Resistencia a la Fuerza",
  "Resistencia a la Potencia",
];

export const GRUPOS_MUSCULARES: GrupoMuscular[] = [
  "Empuje superior",
  "Tracción superior",
  "Empuje inferior",
  "Tracción inferior",
  "Full body",
  "Core",
];

// Cualidades de alta demanda de SNC (trabajo cerca del máximo o explosivo) —
// necesitan más descanso (48-72h) que una sesión de fuerza general/
// hipertrofia sobre el mismo grupo muscular (24-48h o menos).
const ALTA_DEMANDA_SNC: CualidadFuerza[] = ["Fuerza Máxima Relativa", "Potencia Máxima Relativa"];

export interface ResumenCualidad {
  cualidad: CualidadFuerza;
  setsTotales: number;
  fila: FilaIntensidad;
  estado: "bajo" | "dentro" | "sobre";
}

// Suma los sets (campo `series` de cada ejercicio) de todos los bloques de
// la semana que tengan una `cualidad` asignada, agrupados por cualidad —
// esto es lo que se compara contra el rango semanal de la tabla.
export function resumenSetsPorCualidad(dias: DiaPlan[]): ResumenCualidad[] {
  const totales = new Map<CualidadFuerza, number>();
  dias.forEach((dia) => {
    dia.bloques.forEach((b) => {
      if (!b.cualidad) return;
      const sets = b.exercises.reduce((sum, e) => sum + (Number(e.series) || 0), 0);
      totales.set(b.cualidad, (totales.get(b.cualidad) ?? 0) + sets);
    });
  });

  return [...totales.entries()].map(([cualidad, setsTotales]) => {
    const fila = TABLA_INTENSIDAD[cualidad];
    const [min, max] = fila.setsSemana;
    const estado: ResumenCualidad["estado"] = setsTotales < min ? "bajo" : setsTotales > max ? "sobre" : "dentro";
    return { cualidad, setsTotales, fila, estado };
  });
}

export interface AlertaDescanso {
  grupoMuscular: GrupoMuscular;
  cualidad: CualidadFuerza;
  diasCount: number;
  // Si la agenda tiene al menos dos citas reales agendadas para los días
  // involucrados, el gap real (en horas) entre el par más cercano, y sus
  // fechas — reemplaza el aviso genérico por uno con el calendario real.
  horasReales?: number;
  fechaDesde?: string; // ISO datetime
  fechaHasta?: string; // ISO datetime
}

// Cita mínima que necesita este cálculo (evita acoplar tablaIntensidad.ts
// al tipo completo Cita de la agenda).
export interface CitaParaDescanso {
  fecha: string; // date
  hora: string; // time
  dia_plan_label?: string | null;
}

// Si un mismo grupo muscular aparece en más de un día trabajando una
// cualidad de alta demanda de SNC, cruza los días con la agenda real
// (`citas`, vía `dia_plan_label`) para calcular el gap real entre las dos
// sesiones agendadas más cercanas. Con calendario real:
//  - gap < 72h: alerta con las horas reales.
//  - gap >= 72h: sin alerta (el calendario ya muestra que está bien).
// Sin al menos dos citas agendadas para esos días todavía, se mantiene el
// aviso genérico basado solo en la estructura del plan.
export function alertasDescanso(dias: DiaPlan[], citas: CitaParaDescanso[] = []): AlertaDescanso[] {
  const conteo = new Map<string, { grupoMuscular: GrupoMuscular; cualidad: CualidadFuerza; diasLabels: Set<string> }>();
  dias.forEach((dia) => {
    dia.bloques.forEach((b) => {
      if (!b.grupoMuscular || !b.cualidad || !ALTA_DEMANDA_SNC.includes(b.cualidad)) return;
      const key = `${b.grupoMuscular}::${b.cualidad}`;
      const entry =
        conteo.get(key) ?? { grupoMuscular: b.grupoMuscular, cualidad: b.cualidad, diasLabels: new Set<string>() };
      entry.diasLabels.add(dia.label);
      conteo.set(key, entry);
    });
  });

  const resultado: AlertaDescanso[] = [];

  conteo.forEach((e) => {
    if (e.diasLabels.size <= 1) return;

    const fechas = citas
      .filter((c) => c.dia_plan_label && e.diasLabels.has(c.dia_plan_label))
      .map((c) => new Date(`${c.fecha}T${c.hora}`))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (fechas.length >= 2) {
      let minGapMs = Infinity;
      let par: [Date, Date] = [fechas[0], fechas[1]];
      for (let i = 1; i < fechas.length; i++) {
        const gap = fechas[i].getTime() - fechas[i - 1].getTime();
        if (gap < minGapMs) {
          minGapMs = gap;
          par = [fechas[i - 1], fechas[i]];
        }
      }
      const horas = Math.round(minGapMs / 3_600_000);
      if (horas < 72) {
        resultado.push({
          grupoMuscular: e.grupoMuscular,
          cualidad: e.cualidad,
          diasCount: e.diasLabels.size,
          horasReales: horas,
          fechaDesde: par[0].toISOString(),
          fechaHasta: par[1].toISOString(),
        });
      }
      return;
    }

    resultado.push({ grupoMuscular: e.grupoMuscular, cualidad: e.cualidad, diasCount: e.diasLabels.size });
  });

  return resultado;
}

// Al taggear un bloque con una cualidad, se puede aplicar el TUT sugerido
// de la tabla a todos sus ejercicios de un toque (el profesional lo puede
// editar después si su caso es distinto).
export function aplicarTutSugerido(bloque: BloquePlan): BloquePlan {
  if (!bloque.cualidad) return bloque;
  const tut = TABLA_INTENSIDAD[bloque.cualidad].tut;
  return { ...bloque, exercises: bloque.exercises.map((e) => ({ ...e, tiempoSerie: tut })) };
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Reconoce la cualidad de fuerza a partir del título que escribe el
// profesional (ej. "Potencia tren inferior") — así no hace falta acordarse
// de tocar además el selector de "Cualidad de fuerza…" para que la tabla de
// intensidad quede aplicada. En orden de prioridad: las frases compuestas
// van primero para que "resistencia a la potencia" no caiga en la regla
// genérica de "potencia".
const REGLAS_CUALIDAD: { cualidad: CualidadFuerza; test: (t: string) => boolean }[] = [
  { cualidad: "Resistencia a la Potencia", test: (t) => t.includes("resistencia") && t.includes("potencia") },
  { cualidad: "Resistencia a la Fuerza", test: (t) => t.includes("resistencia") && t.includes("fuerza") },
  {
    cualidad: "Fuerza General (Hipertrofia Funcional)",
    test: (t) => t.includes("fuerza general") || t.includes("hipertrofia funcional"),
  },
  { cualidad: "Hipertrofia", test: (t) => t.includes("hipertrofia") },
  { cualidad: "Potencia Máxima Relativa", test: (t) => t.includes("potencia") },
  { cualidad: "Fuerza Máxima Relativa", test: (t) => t.includes("fuerza") },
  { cualidad: "Resistencia a la Fuerza", test: (t) => t.includes("resistencia") },
];

export function detectarCualidadDesdeTexto(texto: string): CualidadFuerza | undefined {
  const t = normalizar(texto);
  return REGLAS_CUALIDAD.find((r) => r.test(t))?.cualidad;
}

// Primero las combinaciones explícitas (empuje/tracción + superior/
// inferior); después, nombres de ejercicio típicos que ya implican el
// patrón aunque el título no diga "empuje" o "tracción" (ej. un bloque
// titulado "Búlgaras" es empuje inferior/dominante rodilla sin que haga
// falta escribirlo).
const REGLAS_GRUPO: { grupo: GrupoMuscular; test: (t: string) => boolean }[] = [
  { grupo: "Empuje superior", test: (t) => t.includes("empuje") && t.includes("superior") },
  { grupo: "Tracción superior", test: (t) => t.includes("traccion") && t.includes("superior") },
  { grupo: "Empuje inferior", test: (t) => t.includes("empuje") && t.includes("inferior") },
  { grupo: "Tracción inferior", test: (t) => t.includes("traccion") && t.includes("inferior") },
  { grupo: "Full body", test: (t) => t.includes("full body") || t.includes("fullbody") || t.includes("full-body") },
  { grupo: "Core", test: (t) => t.includes("core") },
  // Dominante rodilla / empuje (tren inferior)
  {
    grupo: "Empuje inferior",
    test: (t) => /\b(bulgara|sentadilla|squat|zancada|lunge|prensa|cuadricep)\b/.test(t),
  },
  // Dominante cadera / tracción (tren inferior)
  {
    grupo: "Tracción inferior",
    test: (t) => /\b(peso muerto|rdl|hip thrust|femoral|puente|isquio)\b/.test(t),
  },
  // Empuje superior (pecho/hombro/tríceps)
  {
    grupo: "Empuje superior",
    test: (t) => /\b(press|fondos|flexion|pecho|hombro|triceps)\b/.test(t),
  },
  // Tracción superior (espalda/bíceps)
  {
    grupo: "Tracción superior",
    test: (t) => /\b(remo|dominada|jalon|biceps|espalda|pull)\b/.test(t),
  },
];

export function detectarGrupoMuscularDesdeTexto(texto: string): GrupoMuscular | undefined {
  const t = normalizar(texto);
  return REGLAS_GRUPO.find((r) => r.test(t))?.grupo;
}
