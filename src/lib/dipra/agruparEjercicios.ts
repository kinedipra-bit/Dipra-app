import type { EjercicioSesion } from "./types";

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
