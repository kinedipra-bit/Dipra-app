// Tipos que reflejan el esquema de supabase/migrations/0001_init.sql.
// Mantener sincronizados si el esquema cambia.

export interface Cliente {
  id: string;
  nombre: string;
  iniciales: string;
  // Para emitir boletas — nullable, los clientes cargados antes de este
  // campo no lo tienen todavía.
  rut: string | null;
  telefono: string;
  correo: string;
  categoria: string;
  ocupacion: string;
  objetivo: string;
  // Objetivo/motivo de consulta/anamnesis — texto libre de Evaluación,
  // distinto de `objetivo` (más corto, orientado a la meta de entrenamiento).
  motivo_consulta: string;
  // Para calcular edad automática y avisar cumpleaños próximos — nullable
  // porque los clientes cargados antes de este campo no la tienen.
  fecha_nacimiento: string | null;
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
  // Reps por serie individual (ej. pirámide/ola 5-3-3-1). Igual que
  // pesosSeries: si tiene algún valor cargado, tiene prioridad sobre `reps`
  // para mostrar y calcular volumen; se puede combinar con pesosSeries
  // (cada índice es la misma serie) o usarse solo (kg uniforme).
  repsSeries?: (number | string)[];
  // Aclaración de las reps cuando el número solo no alcanza para explicar el
  // movimiento — ej. "5 a skip a la derecha y 5 a la izquierda". Se muestra
  // junto al número de reps, no lo reemplaza (el número sigue valiendo para
  // el volumen).
  notaReps?: string;
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
  // Override opcional del grupo muscular/cualidad del BLOQUE — para bloques
  // "recíprocos" que alternan ejercicios de distinto grupo (ej. goblet
  // squat de tren inferior + pull over de tracción superior en el mismo
  // bloque). Si no se setea, hereda el del bloque (ver tablaIntensidad.ts).
  grupoMuscular?: GrupoMuscular;
  cualidad?: CualidadFuerza;
  link: string;
  rpe: string;
  rir: string;
  tut: string;
  descanso: string;
  comentarioCliente: string;
}

// Por patrón de movimiento (empuje/tracción) en vez de solo tren superior/
// inferior — dos bloques de "tren inferior" pueden estresar grupos muy
// distintos (ej. búlgaras = dominante rodilla/empuje vs. peso muerto rumano
// = dominante cadera/tracción), así que agruparlos igual generaba avisos de
// descanso poco precisos.
export type GrupoMuscular =
  | "Empuje superior"
  | "Tracción superior"
  | "Empuje inferior"
  | "Tracción inferior"
  | "Full body"
  | "Core";

// Categorías NSCA + adaptación práctica (actualizado — reemplaza el set
// anterior de 6 cualidades, que mezclaba "fuerza general" con "hipertrofia
// funcional" en una sola categoría y no distinguía hipertrofia funcional
// (multiarticular) de no funcional (monoarticular)). Ver TABLA_INTENSIDAD
// en tablaIntensidad.ts para los números de cada una.
export type CualidadFuerza =
  | "Fuerza Máxima"
  | "Fuerza General / Base"
  | "Hipertrofia Funcional"
  | "Hipertrofia No Funcional"
  | "Resistencia a la Fuerza"
  | "Potencia (Esfuerzo Único)"
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
  // "Compartir rutina": `dias` es el borrador que edita el profesional;
  // `dias_publicado` es lo último que el profesional compartió, y es lo
  // que realmente ve el cliente en su portal (nunca `dias` directo).
  dias_publicado: DiaPlan[] | null;
  publicado_at: string | null;
  cambios_sin_compartir: boolean;
  created_at: string;
  updated_at: string;
}

// Plan de kinesiología/rehabilitación — independiente del de fuerza y sin
// el concepto de semanas (un solo set de días en curso por cliente). Mismo
// mecanismo de "compartir" que PlanSemana.
export interface PlanKine {
  id: string;
  client_id: string;
  dias: DiaPlan[];
  dias_publicado: DiaPlan[] | null;
  publicado_at: string | null;
  cambios_sin_compartir: boolean;
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
  // Link del video del ejercicio en el plan — copiado al armar la sesión
  // del día para poder previsualizarlo igual que en "Mi rutina" (antes no
  // se copiaba y la sesión de hoy nunca mostraba el video).
  link?: string;
  // Título del bloque de origen (ver BloquePlan.title) al momento de elegir
  // el día — permite mostrar la sesión agrupada por bloque igual que en la
  // rutina, en vez de una lista plana de ejercicios. Sesiones guardadas
  // antes de este campo simplemente no lo traen.
  bloqueTitle?: string;
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
  // La registró el cliente desde su portal (vs. el profesional en una
  // atención presencial) — determina si el profesional "todavía no la vio".
  registrada_por_cliente: boolean;
  // Solo relevante cuando registrada_por_cliente=true: el profesional ya la
  // revisó. Las que carga el profesional mismo arrancan revisadas.
  revisada: boolean;
  created_at: string;
}

export interface Cita {
  id: string;
  client_id: string | null;
  cliente_nombre: string;
  fecha: string;
  hora: string;
  tipo: string;
  estado: "pendiente" | "confirmada" | "alerta" | "cancelada" | "no_asistio";
  // A qué día del plan corresponde esta cita (ej. "Día 2"), si se asignó —
  // permite calcular descansos reales entre sesiones (ver tablaIntensidad.ts).
  dia_plan_label?: string | null;
}

export interface EjercicioBiblioteca {
  id: string;
  nombre: string;
  link: string;
}
