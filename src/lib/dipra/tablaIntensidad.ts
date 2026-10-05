// Tabla de referencia de intensidad por cualidad de fuerza (NSCA +
// adaptación práctica, actualizada por Nicolás — reemplaza la tabla
// anterior de Movement Solutions). Son reglas generales, no prescripciones
// estrictas — cada atleta puede salirse del rango según su caso.
// `setsSemana` es SETS SEMANALES POR GRUPO MUSCULAR (sumando todos los días
// de la semana activa que trabajen esa cualidad para ese grupo) — queda
// `undefined` en las cualidades que la NSCA dice que se programan por
// calidad y no por volumen (potencia). Para contar series conviene usar
// conteo fraccional: un ejercicio que trabaja un músculo de forma indirecta
// cuenta como media serie para ese músculo (criterio manual del
// profesional, no automatizado acá).
import type { BloquePlan, CualidadFuerza, DiaPlan, EjercicioPlan, GrupoMuscular } from "./types";

export interface FilaIntensidad {
  reps: string;
  porcentaje1RM: string;
  // Series por ejercicio en una sesión (distinto de `setsSemana`, que es el
  // acumulado semanal por grupo muscular).
  seriesPorEjercicio: string;
  setsSemana?: [number, number];
  // Aclaración de la NSCA sobre `setsSemana` cuando el número solo no
  // alcanza (ej. "se programa por calidad, no por volumen").
  notaSetsSemana?: string;
  descanso: string;
}

export const TABLA_INTENSIDAD: Record<CualidadFuerza, FilaIntensidad> = {
  "Fuerza Máxima": {
    reps: "≤6",
    porcentaje1RM: "≥85%",
    seriesPorEjercicio: "2-6",
    setsSemana: [4, 10],
    notaSetsSemana: "directas, en 2 o más días",
    descanso: "2-5 min",
  },
  "Fuerza General / Base": {
    reps: "4-8",
    porcentaje1RM: "75-85%",
    seriesPorEjercicio: "3-5",
    setsSemana: [6, 12],
    descanso: "2-3 min",
  },
  "Hipertrofia Funcional": {
    reps: "6-12",
    porcentaje1RM: "67-85%",
    seriesPorEjercicio: "3-6",
    setsSemana: [10, 20],
    notaSetsSemana: "contando todos los ejercicios",
    descanso: "1-3 min",
  },
  "Hipertrofia No Funcional": {
    reps: "8-15",
    porcentaje1RM: "60-75%",
    seriesPorEjercicio: "2-4",
    setsSemana: [4, 8],
    notaSetsSemana: "directas por músculo — complementa el volumen de hipertrofia funcional",
    descanso: "1-2 min",
  },
  "Resistencia a la Fuerza": {
    reps: "≥12",
    porcentaje1RM: "≤67%",
    seriesPorEjercicio: "2-3",
    setsSemana: [6, 10],
    notaSetsSemana: "sin un estándar claro",
    descanso: "<30s",
  },
  "Potencia (Esfuerzo Único)": {
    reps: "1-2",
    porcentaje1RM: "80-90% en olímpicos",
    seriesPorEjercicio: "3-5",
    notaSetsSemana: "se programa por calidad, no por volumen",
    descanso: "2-5 min",
  },
  "Resistencia a la Potencia": {
    reps: "3-5",
    porcentaje1RM: "75-85% en olímpicos",
    seriesPorEjercicio: "3-5",
    notaSetsSemana: "ídem — por calidad, no por volumen",
    descanso: "2-5 min",
  },
  // No se mide en reps/%1RM como el resto — "contactos por sesión" ocupa
  // el campo reps, con el detalle por nivel en notaSetsSemana. Sin
  // setsSemana a propósito (misma lógica que potencia: se programa por
  // calidad, no por volumen semanal).
  Pliometría: {
    reps: "80-140 contactos/sesión según nivel",
    porcentaje1RM: "—",
    seriesPorEjercicio: "según plan",
    notaSetsSemana: "Principiante 80-100 · Intermedio 100-120 · Avanzado 120-140 contactos",
    descanso: "trabajo:pausa 1:5 a 1:10",
  },
};

export const CUALIDADES: CualidadFuerza[] = [
  "Fuerza Máxima",
  "Fuerza General / Base",
  "Hipertrofia Funcional",
  "Hipertrofia No Funcional",
  "Resistencia a la Fuerza",
  "Potencia (Esfuerzo Único)",
  "Resistencia a la Potencia",
  "Pliometría",
];

// Mismo detalle de PLIOMETRIA_NSCA/PLIOMETRIA_NOTAS, ahora también
// disponible como cualidad elegible en un bloque (con su propia línea de
// sugerencia, igual que el resto) — se deja esta tabla aparte además
// porque trae el desglose completo por nivel que no entra en una sola
// línea de sugerencia.
export const PLIOMETRIA_NSCA: { nivel: string; contactos: string }[] = [
  { nivel: "Principiante", contactos: "80-100" },
  { nivel: "Intermedio", contactos: "100-120" },
  { nivel: "Avanzado", contactos: "120-140" },
];

export const PLIOMETRIA_NOTAS: string[] = [
  "48 a 72h de recuperación entre sesiones del mismo segmento corporal — en la práctica, 1 a 3 sesiones por semana.",
  "Descanso entre series con relación trabajo:pausa de 1:5 a 1:10, priorizando la calidad de cada contacto.",
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
// hipertrofia sobre el mismo grupo muscular (24-48h o menos). Resistencia a
// la potencia entra acá también: a diferencia de potencia esfuerzo único
// (1-2 reps, sin caída de velocidad dentro de la serie), acá sí se
// acumula fatiga entre repetición y repetición (3-5 reps a intensidad
// olímpica) — esa fatiga repetida es la que pide el mismo resguardo de
// descanso. Pliometría también entra: la propia referencia NSCA pide
// 48-72h de recuperación entre sesiones del mismo segmento corporal.
const ALTA_DEMANDA_SNC: CualidadFuerza[] = [
  "Fuerza Máxima",
  "Potencia (Esfuerzo Único)",
  "Resistencia a la Potencia",
  "Pliometría",
];

// Grupo muscular/cualidad "efectivos" de un ejercicio: lo que el ejercicio
// trae puesto a mano tiene prioridad (bloques "recíprocos" que alternan
// ejercicios de distinto grupo, ej. goblet squat + pull over en el mismo
// bloque); si no, hereda lo del bloque.
export function etiquetaEfectiva(
  bloque: BloquePlan,
  ejercicio: EjercicioPlan
): { grupoMuscular?: GrupoMuscular; cualidad?: CualidadFuerza } {
  return {
    grupoMuscular: ejercicio.grupoMuscular ?? bloque.grupoMuscular,
    cualidad: ejercicio.cualidad ?? bloque.cualidad,
  };
}

export interface ResumenCualidad {
  grupoMuscular: GrupoMuscular;
  cualidad: CualidadFuerza;
  setsTotales: number;
  // Copiado de fila.setsSemana, ya narrowed a no-undefined (solo se arma
  // esta fila cuando la tabla trae un rango semanal) — evita que el que
  // consume esto tenga que volver a chequear el optional.
  setsSemanaSugerido: [number, number];
  fila: FilaIntensidad;
  estado: "bajo" | "dentro" | "sobre";
}

// Suma los sets (campo `series`) de cada ejercicio de la semana que tenga
// TANTO grupo muscular COMO cualidad efectivos (propios o heredados del
// bloque) — un ejercicio a medio describir no debe sumar a la sugerencia.
// El rango de la tabla (ej. 3-6 sets/semana de hipertrofia) es POR GRUPO
// MUSCULAR, así que se agrupa por grupo+cualidad, no solo por cualidad —
// 3 sets de tracción + 2 de empuje, ambos hipertrofia, son dos series
// separadas (3-6 y 3-6), no "5 de hipertrofia" sumados.
export function resumenSetsPorCualidad(dias: DiaPlan[]): ResumenCualidad[] {
  const totales = new Map<string, { grupoMuscular: GrupoMuscular; cualidad: CualidadFuerza; sets: number }>();
  dias.forEach((dia) => {
    dia.bloques.forEach((b) => {
      b.exercises.forEach((e) => {
        const { grupoMuscular, cualidad } = etiquetaEfectiva(b, e);
        if (!cualidad || !grupoMuscular) return;
        const key = `${grupoMuscular}::${cualidad}`;
        const entry = totales.get(key) ?? { grupoMuscular, cualidad, sets: 0 };
        entry.sets += Number(e.series) || 0;
        totales.set(key, entry);
      });
    });
  });

  const resultado: ResumenCualidad[] = [];
  totales.forEach(({ grupoMuscular, cualidad, sets }) => {
    const fila = TABLA_INTENSIDAD[cualidad];
    // Sin fila (cualidad vieja que ya no existe en la tabla) o sin rango
    // semanal (la NSCA dice que esa cualidad se programa por calidad, no
    // por volumen) — no hay con qué comparar, se omite de la sugerencia.
    if (!fila?.setsSemana) return;
    const [min, max] = fila.setsSemana;
    const estado: ResumenCualidad["estado"] = sets < min ? "bajo" : sets > max ? "sobre" : "dentro";
    resultado.push({ grupoMuscular, cualidad, setsTotales: sets, setsSemanaSugerido: fila.setsSemana, fila, estado });
  });

  return resultado.sort(
    (a, b) => a.grupoMuscular.localeCompare(b.grupoMuscular) || a.cualidad.localeCompare(b.cualidad)
  );
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
      b.exercises.forEach((e) => {
        const { grupoMuscular, cualidad } = etiquetaEfectiva(b, e);
        if (!grupoMuscular || !cualidad || !ALTA_DEMANDA_SNC.includes(cualidad)) return;
        const key = `${grupoMuscular}::${cualidad}`;
        const entry = conteo.get(key) ?? { grupoMuscular, cualidad, diasLabels: new Set<string>() };
        entry.diasLabels.add(dia.label);
        conteo.set(key, entry);
      });
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

// El campo "Tiempo" (tiempoSerie) es trabajo isométrico/por tiempo en vez
// de reps (ej. plancha 30 seg) — NO es una medida de intensidad ni de
// descanso, así que a propósito nunca se autocompleta con una sugerencia
// (confundía: 30'' de iso squat no es lo mismo que 10 sentadillas en 30'',
// la cantidad en el tiempo/velocidad de ejecución es lo que importa). El
// campo que sí tiene sugerencia de la tabla es el descanso entre series,
// que varía según la cualidad (ej. fuerza máxima 2-5min vs. resistencia a
// la fuerza <30s) — ver aplicarDescansoSugerido más abajo.

// Al taggear un bloque (o un ejercicio suelto, en un bloque recíproco) con
// una cualidad, se puede aplicar el descanso sugerido de la tabla de un
// toque — cada ejercicio usa su propia cualidad efectiva (la suya si la
// tiene, si no la del bloque), el profesional lo puede editar después si
// su caso es distinto.
export function aplicarDescansoSugerido(bloque: BloquePlan): BloquePlan {
  return {
    ...bloque,
    exercises: bloque.exercises.map((e) => {
      const { cualidad } = etiquetaEfectiva(bloque, e);
      const descanso = cualidad ? TABLA_INTENSIDAD[cualidad]?.descanso : undefined;
      return descanso ? { ...e, descanso } : e;
    }),
  };
}

// Si la cualidad efectiva de ALGÚN ejercicio del bloque tiene un descanso
// definido en la tabla, vale la pena mostrar el botón "Aplicar descanso
// sugerido".
export function descansoDisponible(bloque: BloquePlan): boolean {
  return bloque.exercises.some((e) => {
    const { cualidad } = etiquetaEfectiva(bloque, e);
    return !!(cualidad && TABLA_INTENSIDAD[cualidad]?.descanso);
  });
}

