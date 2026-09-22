// Funciones de cálculo migradas 1:1 desde dipra-app.jsx. No reinterpretar
// las fórmulas — ver informe de migración para el detalle de cada una.

export function tonoEscala(n: number): "dp-bg-alert" | "dp-bg-amber" | "dp-bg-brand" {
  if (n <= 3) return "dp-bg-alert";
  if (n <= 5) return "dp-bg-amber";
  return "dp-bg-brand";
}

// Para pilares donde un valor alto es negativo (ej. estrés), se invierte
// la escala antes de asignar el color: 10 se lee como "malo" (rojo).
export function tonoEscalaPilar(valor: number, invertido?: boolean) {
  const efectivo = invertido ? 11 - valor : valor;
  return tonoEscala(efectivo);
}

type Bloque = { exercises: { series?: number | string; reps?: number | string; kg?: number | string }[] };
type Dia = { bloques: Bloque[] };

export function calcVolumenBloque(bloque: Bloque) {
  return bloque.exercises.reduce(
    (sum, e) => sum + (Number(e.series) || 0) * (Number(e.reps) || 0) * (Number(e.kg) || 0),
    0
  );
}

export function calcVolumenDia(dia: Dia) {
  return dia.bloques.reduce((sum, b) => sum + calcVolumenBloque(b), 0);
}

// FMS ---------------------------------------------------------------------

export function sideVal(raw: string | number | null | undefined, cleared?: boolean): number | null {
  if (cleared) return 0;
  if (raw === "" || raw === undefined || raw === null) return null;
  return Number(raw);
}

export function finalScore(
  dRaw: string | number | null | undefined,
  iRaw: string | number | null | undefined,
  dCleared?: boolean,
  iCleared?: boolean
): number | null {
  const d = sideVal(dRaw, dCleared);
  const i = sideVal(iRaw, iCleared);
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

export function calcularFinalesFms(fms: FmsData) {
  return {
    sentadilla: sideVal(fms.sentadilla),
    pasoValla: finalScore(fms.pasoValla.d, fms.pasoValla.i),
    estocada: finalScore(fms.estocada.d, fms.estocada.i),
    hombro: finalScore(fms.hombro.d, fms.hombro.i, fms.clearingHombro?.d, fms.clearingHombro?.i),
    aslr: finalScore(fms.aslr.d, fms.aslr.i),
    pushUp: sideVal(fms.pushUp, fms.clearingExtension),
    // mismo flag de clearing aplicado a ambos lados a propósito (asimetría
    // intencional respecto de hombro, que sí es por lado)
    rotacion: finalScore(fms.rotacion.d, fms.rotacion.i, fms.clearingFlexion, fms.clearingFlexion),
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
