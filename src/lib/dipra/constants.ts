// Constantes de negocio migradas 1:1 desde dipra-app.jsx (líneas ~107-232).
// No reinterpretar los valores/textos — son parte de la lógica clínica
// validada del prototipo.

export const PILARES_KEYS = [
  { key: "sueno", label: "Sueño" },
  { key: "nutricion", label: "Nutrición" },
  { key: "hidratacion", label: "Hidratación" },
  { key: "movimiento", label: "Movimiento" },
  { key: "estres", label: "Estrés", invertido: true },
] as const;

export const TIPOS_SESION = [
  "Kinesiología",
  "Entrenamiento personalizado",
  "Rendimiento",
  "Evaluación",
] as const;

// Set de tipos usado históricamente por la agenda (NewApptModal en el
// prototipo) — distinto de TIPOS_SESION ("Entrenamiento grupal" en vez de
// "Entrenamiento personalizado"). Se mantienen separados a propósito, ver
// nota en el informe de migración.
export const TIPOS_CITA = ["Kinesiología", "Rendimiento", "Evaluación", "Entrenamiento grupal"] as const;

export const ESTADOS_CITA = ["pendiente", "confirmada", "alerta", "cancelada"] as const;

export const DAY_LABELS = ["Día 1", "Día 2", "Día 3", "Día 4"] as const;

export const ANTECEDENTES_CAMPOS = [
  { key: "morbidos", label: "Antecedentes mórbidos" },
  { key: "qx", label: "Antecedentes quirúrgicos" },
  { key: "partos", label: "Partos" },
  { key: "hormonal", label: "Antecedentes hormonales" },
  { key: "cronicas", label: "Enfermedades crónicas" },
  { key: "respiratorios", label: "Antecedentes respiratorios" },
  { key: "sistemicos", label: "Antecedentes sistémicos" },
  { key: "neurologicos", label: "Antecedentes neurológicos" },
  { key: "cardiacos", label: "Antecedentes cardíacos" },
  { key: "cancer", label: "Cáncer" },
  { key: "deporte", label: "Deporte practicado" },
  { key: "lesiones", label: "Lesiones previas" },
] as const;

export const PILARES_DESCRIPTIVOS_CAMPOS = [
  { key: "movimiento", label: "Movimiento" },
  { key: "sueno", label: "Sueño" },
  { key: "nutricion", label: "Nutrición" },
  { key: "mindset", label: "Mindset" },
  { key: "regeneracion", label: "Regeneración" },
] as const;

export const ALICIA_CAMPOS = [
  { key: "antiguedad", label: "Antigüedad" },
  { key: "localizacion", label: "Localización" },
  { key: "irradiacion", label: "Irradiación" },
  { key: "caracter", label: "Carácter" },
  { key: "intensidad", label: "Intensidad" },
  { key: "atenuacionAgravacion", label: "Atenuación / agravación" },
] as const;

export const ESFERAS = ["Cráneo", "Tórax", "Pelvis", "Tobillo"] as const;

/* Base de sugerencias FMS — qué evaluar a continuación cuando un movimiento
   puntúa 1 o 2, para distinguir si la limitación es de rango/movilidad real
   o de control motor/estabilidad. Texto clínico validado, copiar tal cual. */
export const FMS_SUGERENCIAS: Record<
  string,
  { label: string; 0: string; 1: string; 2: string }
> = {
  sentadilla: {
    label: "Sentadilla",
    0: "Puntaje 0 = dolor presente. No sigas cargando el patrón — localiza el dolor (¿lumbar, rodilla, cadera?) con palpación y movimientos activos aislados antes de decidir si sigues con el screening.",
    1: "Reevaluar con talones elevados (heel-lift) y comparar con brazos cruzados al pecho vs. overhead — para diferenciar restricción de tobillo/cadera de un déficit de control de tronco.",
    2: "Comparar con knee-to-wall test de tobillo y una sentadilla asistida (sosteniéndose) para confirmar si la limitación es de rango de tobillo o de estabilidad.",
  },
  pasoValla: {
    label: "Paso valla",
    0: "Puntaje 0 = dolor presente durante el paso. Aísla si el dolor es de cadera de apoyo o de la pierna que se eleva con pruebas activas simples antes de continuar.",
    1: "Evaluar control de cadera en apoyo unipodal de la pierna de apoyo, y rango de flexión de cadera en decúbito de la pierna que se eleva — para diferenciar estabilidad de la pierna portante de movilidad de la pierna móvil.",
    2: "Revisar rotación de tronco y equilibrio dinámico durante el paso, comparando con el mismo movimiento de forma más lenta y controlada.",
  },
  estocada: {
    label: "Estocada",
    0: "Puntaje 0 = dolor presente. Revisa rodilla delantera y cadera trasera por separado (carga vs. rango) antes de seguir con el screening.",
    1: "Evaluar dorsiflexión de tobillo (knee-to-wall) y rotación de tronco en half-kneeling — para diferenciar restricción de tobillo de un déficit de control de tronco/cadera.",
    2: "Comparar la estocada estática vs. en movimiento, y revisar movilidad de flexores de cadera (Thomas test) del lado trasero.",
  },
  hombro: {
    label: "Movilidad de hombro",
    0: "Puntaje 0 = dolor presente (o clearing positivo). No sigas testeando rango activo de ese hombro — evalúa arco doloroso y rotadores antes de continuar.",
    1: "Comparar rango pasivo vs. activo de rotación de hombro, y evaluar movilidad torácica en sedente — para diferenciar restricción gleno-humeral real de una compensación torácica.",
    2: "Revisar movilidad escapular (scapular wall slides) y cápsula posterior de hombro.",
  },
  aslr: {
    label: "ASLR",
    0: "Puntaje 0 = dolor presente. Diferencia si el dolor aparece en la pierna que se eleva o en la de apoyo antes de decidir seguimiento.",
    1: "Evaluar control de flexión de cadera de pie (marcha con rodilla alta / standing active hip flexion) y comparar con un hip hinge a una pierna — para saber si es un problema real de rango (isquiotibial) o de control motor/estabilidad de pelvis.",
    2: "Comparar ASLR activo vs. pasivo (asistido) para descartar un componente de control más que de rango puro.",
  },
  pushUp: {
    label: "Push up",
    0: "Puntaje 0 = dolor presente (o clearing de extensión positivo). Evalúa lumbar en extensión antes de seguir cargando el patrón.",
    1: "Evaluar plancha frontal (tiempo de sostén) y repetir el push-up desde rodillas — para diferenciar déficit de fuerza de tronco de un patrón de reclutamiento ineficiente.",
    2: "Revisar activación de core en cuadrupedia (bird-dog) antes de re-testear.",
  },
  rotacion: {
    label: "Estabilidad rotacional",
    0: "Puntaje 0 = dolor presente (o clearing de flexión positivo). Evalúa lumbar en flexión y cuadrante afectado antes de continuar.",
    1: "Evaluar bird-dog unilateral y plancha lateral — para diferenciar control rotacional del core de una falta de estabilidad en cadera/hombro portante.",
    2: "Repetir con apoyo en rodillas para aislar si el déficit es de fuerza o de coordinación.",
  },
};

export function emptyFms() {
  return {
    sentadilla: "",
    pasoValla: { d: "", i: "" },
    estocada: { d: "", i: "" },
    clearingTobDolor: { d: false, i: false },
    clearingTobMob: { d: false, i: false },
    hombro: { d: "", i: "" },
    clearingHombro: { d: false, i: false },
    aslr: { d: "", i: "" },
    pushUp: "",
    clearingExtension: false,
    rotacion: { d: "", i: "" },
    clearingFlexion: false,
    toeTouch: "",
    clearingMuneca: { der: false, izq: false },
    seguimientoPropio: {} as Record<string, string>,
  };
}

export function emptySesionPilares() {
  return { sueno: "", nutricion: "", hidratacion: "", movimiento: "", estres: "" };
}

export function blockTemplate() {
  return [
    { id: crypto.randomUUID(), title: "Calentamiento", exercises: [] },
    { id: crypto.randomUUID(), title: "Bloque principal", exercises: [] },
    { id: crypto.randomUUID(), title: "Accesorios", exercises: [] },
  ];
}

export function nuevosDias() {
  return DAY_LABELS.map((label) => ({
    id: crypto.randomUUID(),
    label,
    foco: "",
    bloques: blockTemplate(),
  }));
}
