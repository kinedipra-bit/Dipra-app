// Definición compartida de las métricas de rendimiento (fuerza/saltos/
// fuerza funcional), usada tanto por el formulario de carga (NuevaMedicionForm,
// reusado desde Evaluación) como por los gráficos de historial (EvolucionClient).

export type MetricKey =
  | "sentadilla"
  | "peso_muerto"
  | "press_banca"
  | "press_militar"
  | "broad_jump"
  | "abalakov_jump"
  | "cmj"
  | "squat_jump"
  | "agarre_der"
  | "agarre_izq"
  | "dead_hang"
  | "pull_ups"
  | "push_up"
  | "plancha_frontal"
  | "plancha_lateral_der"
  | "plancha_lateral_izq"
  | "pararse_del_suelo";

export interface MetricDef {
  key: MetricKey;
  label: string;
}

export interface GrupoDef {
  titulo: string;
  metrics: MetricDef[];
}

export const GRUPOS: GrupoDef[] = [
  {
    titulo: "Fuerza",
    metrics: [
      { key: "sentadilla", label: "Sentadilla" },
      { key: "peso_muerto", label: "Peso muerto" },
      { key: "press_banca", label: "Press banca" },
      { key: "press_militar", label: "Press militar" },
    ],
  },
  {
    titulo: "Saltos",
    metrics: [
      { key: "broad_jump", label: "Broad jump" },
      { key: "abalakov_jump", label: "Abalakov" },
      { key: "cmj", label: "CMJ" },
      { key: "squat_jump", label: "Squat jump (SJ)" },
    ],
  },
  {
    titulo: "Fuerza funcional",
    metrics: [
      { key: "agarre_der", label: "Fuerza de agarre der. (kg)" },
      { key: "agarre_izq", label: "Fuerza de agarre izq. (kg)" },
      { key: "dead_hang", label: "Dead hang (seg)" },
      { key: "pull_ups", label: "Pull ups (reps)" },
      { key: "push_up", label: "Push up (reps)" },
      { key: "plancha_frontal", label: "Plancha frontal (seg)" },
      { key: "plancha_lateral_der", label: "Plancha lateral der. (seg)" },
      { key: "plancha_lateral_izq", label: "Plancha lateral izq. (seg)" },
      { key: "pararse_del_suelo", label: "Pararse del suelo (puntaje, 10=sin apoyos)" },
    ],
  },
];

export const METRICS: MetricDef[] = GRUPOS.flatMap((g) => g.metrics);

export function camposVacios(): Record<MetricKey, string> {
  return Object.fromEntries(METRICS.map((m) => [m.key, ""])) as Record<MetricKey, string>;
}

export function nuevoDraft() {
  return {
    fecha: new Date().toISOString().slice(0, 10),
    mesociclo: "",
    objetivo: "",
    ...camposVacios(),
  };
}
