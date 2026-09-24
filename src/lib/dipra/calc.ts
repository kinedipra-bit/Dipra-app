// Funciones de cálculo migradas 1:1 desde dipra-app.jsx. No reinterpretar
// las fórmulas — ver informe de migración para el detalle de cada una.

export function tonoEscala(n: number): "dp-bg-alert" | "dp-bg-amber" | "dp-bg-brand" {
  if (n < 4) return "dp-bg-alert";
  if (n <= 6) return "dp-bg-amber";
  return "dp-bg-brand";
}

// Para pilares donde un valor alto es negativo (ej. estrés), se invierte
// la escala antes de asignar el color: 10 se lee como "malo" (rojo).
export function tonoEscalaPilar(valor: number, invertido?: boolean) {
  const efectivo = invertido ? 11 - valor : valor;
  return tonoEscala(efectivo);
}

type Ejercicio = {
  series?: number | string;
  reps?: number | string;
  kg?: number | string;
  pesosSeries?: (number | string)[];
  unilateral?: boolean;
  pesoCadaUno?: boolean;
};
type Bloque = { exercises: Ejercicio[] };
type Dia = { bloques: Bloque[] };

// Si `pesosSeries` tiene valores cargados, el volumen se calcula sumando
// reps × cada peso de serie individual (una serie por entrada del array).
// Si no, se usa la fórmula uniforme series × reps × kg.
//
// Dos formas distintas de "duplicar" que no son lo mismo:
// - `unilateral` ("10 reps por lado"): se hacen el doble de repeticiones
//   reales (una tanda por lado) → se duplican las reps.
// - `pesoCadaUno` (ej. dos mancuernas de 7,5 kg cada una): el número
//   cargado es el peso de CADA implemento, no el total → se duplica el kg.
export function volumenEjercicio(e: Ejercicio): number {
  const repsBase = Number(e.reps) || 0;
  const reps = e.unilateral ? repsBase * 2 : repsBase;
  const factorPeso = e.pesoCadaUno ? 2 : 1;
  const pesos = (e.pesosSeries ?? []).map((p) => Number(p) || 0).filter((p) => p > 0);
  if (pesos.length > 0) {
    return pesos.reduce((sum, p) => sum + reps * p * factorPeso, 0);
  }
  return (Number(e.series) || 0) * reps * (Number(e.kg) || 0) * factorPeso;
}

export function calcVolumenBloque(bloque: Bloque) {
  return bloque.exercises.reduce((sum, e) => sum + volumenEjercicio(e), 0);
}

export function calcVolumenDia(dia: Dia) {
  return dia.bloques.reduce((sum, b) => sum + calcVolumenBloque(b), 0);
}

// FMS ---------------------------------------------------------------------

export function sideVal(raw: string | number | null | undefined): number | null {
  if (raw === "" || raw === undefined || raw === null) return null;
  return Number(raw);
}

export function finalScore(
  dRaw: string | number | null | undefined,
  iRaw: string | number | null | undefined
): number | null {
  const d = sideVal(dRaw);
  const i = sideVal(iRaw);
  if (d === null && i === null) return null;
  if (d === null) return i;
  if (i === null) return d;
  return Math.min(d, i);
}

export interface FmsData {
  sentadilla: string | number;
  pasoValla: { d: string | number; i: string | number };
  estocada: { d: string | number; i: string | number };
  clearingTobDolor?: { d: boolean; i: boolean };
  clearingTobMob?: { d: boolean; i: boolean };
  hombro: { d: string | number; i: string | number };
  clearingHombro: { d: boolean; i: boolean };
  aslr: { d: string | number; i: string | number };
  pushUp: string | number;
  clearingExtension: boolean;
  rotacion: { d: string | number; i: string | number };
  clearingFlexion: boolean;
  toeTouch?: string | number;
  clearingMuneca?: { der: boolean; izq: boolean };
  seguimientoPropio?: Record<string, string>;
}

// Los clearing tests (tobillo, hombro, extensión, flexión, muñeca) se
// registran como dato clínico propio, pero NO fuerzan el puntaje a 0: un
// clearing positivo no implica necesariamente que el movimiento evaluado
// (push up, estabilidad rotacional, etc.) haya dolido — el profesional
// carga el puntaje real que corresponda.
export function calcularFinalesFms(fms: FmsData) {
  return {
    sentadilla: sideVal(fms.sentadilla),
    pasoValla: finalScore(fms.pasoValla.d, fms.pasoValla.i),
    estocada: finalScore(fms.estocada.d, fms.estocada.i),
    hombro: finalScore(fms.hombro.d, fms.hombro.i),
    aslr: finalScore(fms.aslr.d, fms.aslr.i),
    pushUp: sideVal(fms.pushUp),
    rotacion: finalScore(fms.rotacion.d, fms.rotacion.i),
  };
}

export function totalFms(finales: Record<string, number | null>) {
  return Object.values(finales).reduce((sum: number, v) => sum + (typeof v === "number" ? v : 0), 0);
}

// Composición corporal ------------------------------------------------------

export function imc(tallaCm: number | string, pesoKg: number | string): string {
  const t = Number(tallaCm);
  const p = Number(pesoKg);
  if (!t || !p) return "—";
  return (p / (t / 100) ** 2).toFixed(1);
}

// Evolución / rendimiento ----------------------------------------------------

export function deficitExplosivo(cmj: number, squatJump: number): number | null {
  if (!squatJump) return null;
  return ((cmj - squatJump) / squatJump) * 100;
}

export function maxDe<T extends Record<string, number>>(hist: T[], key: keyof T): number {
  return Math.max(...hist.map((h) => Number(h[key]) || 0), 1);
}

export function isPR<T extends Record<string, number>>(hist: T[], key: keyof T, value: number): boolean {
  const max = Math.max(...hist.map((h) => Number(h[key]) || 0));
  return value === max && value > 0;
}
