import type { DiaPlan, EjercicioSesion, Sesion } from "./types";

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
        planExercicioId: e.id,
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
        tut: e.tut,
        cargaTipo: e.cargaTipo,
        vueltas: e.vueltas,
        notaReps: e.notaReps,
        link: e.link,
        bloqueTitle: b.title,
        rpe: "",
      });
    })
  );
  return ejercicios;
}

type SesionParaCarryForward = Pick<Sesion, "fecha" | "dia_plan_label" | "ejercicios">;

// La sesión más reciente (cualquier semana, no solo la activa — un Día 1 de
// hace dos semanas sigue valiendo si todavía no se registró ninguna sesión
// de Día 1 en la semana nueva) para ese mismo día del plan — usado para
// arrancar una sesión nueva con lo realmente hecho, no con lo programado.
export function ultimaSesionConDia<T extends SesionParaCarryForward>(sesiones: T[], label: string): T | undefined {
  return [...sesiones].filter((s) => s.dia_plan_label === label).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
}

// Al elegir un día para una sesión nueva, arranca con lo que REALMENTE se
// hizo la última vez que se registró ese mismo día (no con lo planificado)
// — si programado dice 20kg pero la última sesión real fue a 25kg, tiene
// que seguir mostrando 25kg. Nombre/bloque/video/unilateral siguen viniendo
// del plan vigente (por si el ejercicio cambió desde la última vez); solo
// los números de desempeño (series/reps/kg/rpe) se traen de la sesión
// anterior. Si nunca se registró ese día antes, sigue mostrando lo
// planificado como punto de partida. Usado tanto desde Sesiones
// (profesional) como desde el portal (el cliente registra su propia
// sesión) — mismo criterio en los dos lados.
export function conValoresReales(
  ejercicios: EjercicioSesion[],
  sesiones: SesionParaCarryForward[],
  label: string
): EjercicioSesion[] {
  const anterior = ultimaSesionConDia(sesiones, label);
  if (!anterior) return ejercicios;
  const porNombre = new Map(anterior.ejercicios.map((e) => [e.nombre.trim().toLowerCase(), e]));
  return ejercicios.map((ex) => {
    const real = porNombre.get(ex.nombre.trim().toLowerCase());
    if (!real) return ex;
    return {
      ...ex,
      seriesReal: real.seriesReal,
      repsReal: real.repsReal,
      kgReal: real.kgReal,
      pesosSeriesReal: real.pesosSeriesReal,
      repsSeriesReal: real.repsSeriesReal,
      rpeSeries: real.rpeSeries,
    };
  });
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
