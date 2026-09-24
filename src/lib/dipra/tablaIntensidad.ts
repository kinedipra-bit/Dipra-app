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

export const GRUPOS_MUSCULARES: GrupoMuscular[] = ["Tren superior", "Tren inferior", "Full body", "Core"];

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
}

// Recordatorio (no un chequeo de calendario real: el plan no tiene fechas
// por día, solo etiquetas "Día 1".."Día 4") — si un mismo grupo muscular
// aparece en más de un día trabajando una cualidad de alta demanda de SNC,
// vale la pena recordar dejar 48-72h de por medio.
export function alertasDescanso(dias: DiaPlan[]): AlertaDescanso[] {
  const conteo = new Map<string, { grupoMuscular: GrupoMuscular; cualidad: CualidadFuerza; dias: Set<string> }>();
  dias.forEach((dia) => {
    dia.bloques.forEach((b) => {
      if (!b.grupoMuscular || !b.cualidad || !ALTA_DEMANDA_SNC.includes(b.cualidad)) return;
      const key = `${b.grupoMuscular}::${b.cualidad}`;
      const entry = conteo.get(key) ?? { grupoMuscular: b.grupoMuscular, cualidad: b.cualidad, dias: new Set() };
      entry.dias.add(dia.id);
      conteo.set(key, entry);
    });
  });

  return [...conteo.values()]
    .filter((e) => e.dias.size > 1)
    .map((e) => ({ grupoMuscular: e.grupoMuscular, cualidad: e.cualidad, diasCount: e.dias.size }));
}

// Al taggear un bloque con una cualidad, se puede aplicar el TUT sugerido
// de la tabla a todos sus ejercicios de un toque (el profesional lo puede
// editar después si su caso es distinto).
export function aplicarTutSugerido(bloque: BloquePlan): BloquePlan {
  if (!bloque.cualidad) return bloque;
  const tut = TABLA_INTENSIDAD[bloque.cualidad].tut;
  return { ...bloque, exercises: bloque.exercises.map((e) => ({ ...e, tiempoSerie: tut })) };
}
