// Tipos que reflejan el esquema de supabase/migrations/0001_init.sql.
// Mantener sincronizados si el esquema cambia.

export interface Cliente {
  id: string;
  nombre: string;
  iniciales: string;
  telefono: string;
  correo: string;
  categoria: string;
  ocupacion: string;
  objetivo: string;
  inicio: string; // date
  pilares: {
    movimiento: string;
    sueno: string;
    nutricion: string;
    mindset: string;
    regeneracion: string;
  };
  antecedentes: Record<string, string>;
  campos_extra: { id: string; etiqueta: string; valor: string }[];
  dolor_alicia: Record<string, string>;
  fms: import("./calc").FmsData;
  portal_token: string;
  semana_activa_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComposicionCorporalEntry {
  id: string;
  client_id: string;
  fecha: string;
  talla: number | null;
  peso: number | null;
  grasa_pct: number | null;
  masa_muscular: number | null;
  agua_pct: number | null;
  masa_osea: number | null;
}

export interface PrHistorialEntry {
  id: string;
  client_id: string;
  fecha: string;
  mesociclo: string;
  objetivo: string;
  sentadilla: number;
  peso_muerto: number;
  press_banca: number;
  press_militar: number;
  broad_jump: number;
  abalakov_jump: number;
  cmj: number;
  squat_jump: number;
  agarre_der: number;
  agarre_izq: number;
  dead_hang: number;
  pull_ups: number;
  push_up: number;
  plancha_frontal: number;
  plancha_lateral_der: number;
  plancha_lateral_izq: number;
  pararse_del_suelo: number;
}

export interface MovilidadEsferaEntry {
  id: string;
  client_id: string;
  patron: string;
  craneo: string;
  torax: string;
  pelvis: string;
  tobillo: string;
}

export interface EvaluacionCustomEntry {
  id: string;
  client_id: string;
  nombre: string;
  resultado: string;
}

export interface EjercicioPlan {
  id: string;
  nombre: string;
  series: number;
  reps: number;
  kg: number;
  // Peso por serie individual (ej. 4 series con pesos distintos). Si tiene
  // al menos un valor cargado, tiene prioridad sobre `kg` para mostrar y
  // calcular volumen; `kg` queda como valor uniforme de respaldo/legacy.
  pesosSeries?: (number | string)[];
  // Trabajo por tiempo en vez de (o además de) reps — ej. "30 seg" para un
  // isométrico. Texto libre.
  tiempoSerie?: string;
  // Anotación de carga no numérica — ej. "Banda", "Peso corporal", "Lastre 5kg".
  tipoCarga?: string;
  // Marca reps/series "por lado" (ej. "5 reps por brazo") en vez de bilateral.
  unilateral?: boolean;
  // Distinto de `unilateral`: acá el peso cargado (kg o cada pesosSeries) es
  // el de CADA implemento (ej. dos mancuernas de 7,5 kg cada una), así que
  // el volumen real por repetición es el doble del número cargado.
  pesoCadaUno?: boolean;
  link: string;
  rpe: string;
  rir: string;
  tut: string;
  descanso: string;
  comentarioCliente: string;
}

export type GrupoMuscular = "Tren superior" | "Tren inferior" | "Full body" | "Core";

export type CualidadFuerza =
  | "Fuerza Máxima Relativa"
  | "Potencia Máxima Relativa"
  | "Fuerza General (Hipertrofia Funcional)"
  | "Hipertrofia"
  | "Resistencia a la Fuerza"
  | "Resistencia a la Potencia";

export interface BloquePlan {
  id: string;
  title: string;
  // Etiquetas opcionales para la sugerencia de programación semanal (sets
  // por cualidad vs. tabla de intensidad, y recordatorio de descanso por
  // grupo muscular) — ver src/lib/dipra/tablaIntensidad.ts.
  grupoMuscular?: GrupoMuscular;
  cualidad?: CualidadFuerza;
  exercises: EjercicioPlan[];
}

export interface DiaPlan {
  id: string;
  label: string;
  foco: string;
  bloques: BloquePlan[];
}

export interface PlanSemana {
  id: string;
  client_id: string;
  numero: number;
  mesociclo: string;
  objetivo: string;
  dias: DiaPlan[];
  created_at: string;
  updated_at: string;
}

export interface EjercicioSesion {
  id: string;
  nombre: string;
  seriesPlan: number;
  repsPlan: number;
  kgPlan: number;
  // Snapshot del peso por serie planificado (ver EjercicioPlan.pesosSeries).
  // Si el ejercicio del plan tenía carga distinta por serie, esto lleva esos
  // valores tal cual estaban al momento de elegir el día — es de referencia,
  // no se edita.
  pesosSeriesPlan?: (number | string)[];
  seriesReal: number;
  repsReal: number;
  kgReal: number;
  // Peso real por serie, editable — arranca con los mismos valores que
  // pesosSeriesPlan y el atleta/profesional ajusta según lo que hizo.
  pesosSeriesReal?: (number | string)[];
  // Copiados del ejercicio del plan para que la sesión muestre exactamente
  // lo mismo que ve el profesional/atleta en la rutina (unilateral, peso
  // c/u, tipo de carga, tiempo bajo tensión).
  unilateral?: boolean;
  pesoCadaUno?: boolean;
  tipoCarga?: string;
  tiempoSerie?: string;
  rpe: string;
  // Comentario del atleta sobre ESTE ejercicio en ESTA sesión puntual —
  // distinto de EjercicioPlan.comentarioCliente, que es un único campo
  // persistente en la rutina (no queda registro de en qué sesión se
  // escribió). Opcional porque las sesiones cargadas por el profesional no
  // lo usan.
  comentario?: string;
}

export interface Sesion {
  id: string;
  client_id: string;
  fecha: string;
  tipo: string;
  dia_plan_label: string;
  es_primera_sesion: boolean;
  comentarios_pre: string;
  pilares: { sueno: string; nutricion: string; hidratacion: string; movimiento: string; estres: string };
  comentarios: string;
  ejercicios: EjercicioSesion[];
  created_at: string;
}

export interface Cita {
  id: string;
  client_id: string | null;
  cliente_nombre: string;
  fecha: string;
  hora: string;
  tipo: string;
  estado: "pendiente" | "confirmada" | "alerta" | "cancelada";
  // A qué día del plan corresponde esta cita (ej. "Día 2"), si se asignó —
  // permite calcular descansos reales entre sesiones (ver tablaIntensidad.ts).
  dia_plan_label?: string | null;
}

export interface EjercicioBiblioteca {
  id: string;
  nombre: string;
  link: string;
}
