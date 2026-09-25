import type { DiaPlan, Sesion } from "./types";

export interface AlertaProgramacion {
  tipo: "semana-completa" | "sin-revisar";
  detalle: string;
}

type SesionParaAlerta = Pick<Sesion, "fecha" | "dia_plan_label" | "registrada_por_cliente" | "revisada">;

/**
 * Alertas de programación para UN cliente — pensadas solo para clientes que
 * efectivamente usan el portal remoto (ver `esClienteRemoto`), no para
 * atención presencial: ahí el profesional ya está con la persona y no
 * necesita que la app se lo recuerde.
 *
 *  - "sin-revisar": el cliente registró una sesión desde su portal que el
 *    profesional todavía no marcó como revisada.
 *  - "semana-completa": ya hay una sesión registrada para CADA día de la
 *    semana activa (contando solo sesiones desde que esa semana se creó,
 *    para no confundir con sesiones de una semana anterior que reutilizó
 *    las mismas etiquetas "Día 1"/"Día 2") y todavía es la semana activa —
 *    momento de armar la siguiente.
 */
export function alertasCliente({
  dias,
  semanaCreatedAt,
  sesiones,
}: {
  dias: DiaPlan[];
  semanaCreatedAt: string | null | undefined;
  sesiones: SesionParaAlerta[];
}): AlertaProgramacion[] {
  const alertas: AlertaProgramacion[] = [];

  const sinRevisar = sesiones.filter((s) => s.registrada_por_cliente && !s.revisada).length;
  if (sinRevisar > 0) {
    alertas.push({
      tipo: "sin-revisar",
      detalle: `${sinRevisar} sesión${sinRevisar > 1 ? "es" : ""} sin revisar`,
    });
  }

  if (dias.length > 0 && semanaCreatedAt) {
    const desde = semanaCreatedAt.slice(0, 10);
    const diasCompletados = new Set(
      sesiones.filter((s) => s.fecha >= desde && s.dia_plan_label).map((s) => s.dia_plan_label)
    );
    if (dias.every((d) => diasCompletados.has(d.label))) {
      alertas.push({ tipo: "semana-completa", detalle: "Semana completa — falta programar la siguiente" });
    }
  }

  return alertas;
}

// Un cliente cuenta como "remoto" si alguna vez registró al menos una
// sesión desde su portal — es la evidencia real de que usa el servicio,
// a diferencia de solo tener un portal_token (todos los clientes lo
// tienen, lo usen o no).
export function esClienteRemoto(sesiones: Pick<Sesion, "registrada_por_cliente">[]): boolean {
  return sesiones.some((s) => s.registrada_por_cliente);
}
