import type { DiaPlan, EjercicioSesion } from "./types";

// Arma los EjercicioSesion de un día del plan tal como se ven recién
// elegidos (real = plan todavía sin ejecutar) — usado al iniciar una sesión
// nueva desde Sesiones y, con el mismo criterio, al registrar una sesión
// grupal (ver grupos/actions.ts).
export function ejerciciosDesdeDia(dia: DiaPlan): EjercicioSesion[] {
  const ejercicios: EjercicioSesion[] = [];
  dia.bloques.forEach((b) =>
    b.exercises.forEach((e) => {
      ejercicios.push({
        id: crypto.randomUUID(),
        nombre: e.nombre,
        seriesPlan: e.series,
        repsPlan: e.reps,
        kgPlan: e.kg,
        pesosSeriesPlan: e.pesosSeries,
        seriesReal: e.series,
        repsReal: e.reps,
        kgReal: e.kg,
        pesosSeriesReal: e.pesosSeries,
        unilateral: e.unilateral,
        pesoCadaUno: e.pesoCadaUno,
        tipoCarga: e.tipoCarga,
        tiempoSerie: e.tiempoSerie,
        link: e.link,
        bloqueTitle: b.title,
        rpe: "",
      });
    })
  );
  return ejercicios;
}

export interface GrupoEjerciciosSesion {
  bloqueTitle: string;
  items: { ejercicio: EjercicioSesion; idx: number }[];
}

// Agrupa los ejercicios de una sesión por el bloque de origen (ver
// EjercicioSesion.bloqueTitle), preservando el orden en que se agregaron —
// así la sesión se ve separada por bloque igual que la rutina, en vez de
// una lista plana. `idx` es la posición en el array ORIGINAL (no en el
// grupo), para poder seguir llamando a updateEjercicio(idx, ...) sobre el
// estado plano real. Sesiones sin bloqueTitle (guardadas antes de este
// campo) caen todas en un único grupo sin título.
export function agruparPorBloque(ejercicios: EjercicioSesion[]): GrupoEjerciciosSesion[] {
  const grupos: GrupoEjerciciosSesion[] = [];
  ejercicios.forEach((ejercicio, idx) => {
    const bloqueTitle = ejercicio.bloqueTitle ?? "";
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.bloqueTitle === bloqueTitle) {
      ultimo.items.push({ ejercicio, idx });
    } else {
      grupos.push({ bloqueTitle, items: [{ ejercicio, idx }] });
    }
  });
  return grupos;
}
