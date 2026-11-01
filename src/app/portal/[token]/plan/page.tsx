import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { enmascararCorreo } from "@/lib/dipra/portalPin";
import type { PlanSemana, Sesion } from "@/lib/dipra/types";
import { obtenerClientePortal, sesionValidaPara } from "../acceso";
import { PortalAcceso } from "../PortalAcceso";
import { AyudaSeccion } from "../AyudaSeccion";
import { PortalPlanView } from "./PortalPlanView";
import { StatsMotivacionales } from "./StatsMotivacionales";

function semanaISO(fecha: string): string {
  const d = new Date(fecha + "T00:00:00");
  const diaDesdeLunes = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diaDesdeLunes);
  return d.toISOString().slice(0, 10);
}

function addDias(fecha: string, n: number): string {
  const d = new Date(fecha + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function hoyISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
}

// Semanas calendario consecutivas (lunes a lunes) con al menos una sesión,
// contando hacia atrás — si la semana actual todavía no tiene sesión (puede
// entrenar más tarde) no corta la racha, arranca desde la semana anterior.
function calcularRachaSemanas(sesiones: Sesion[]): number {
  const semanasConSesion = new Set(sesiones.map((s) => semanaISO(s.fecha)));
  let cursor = semanaISO(hoyISO());
  if (!semanasConSesion.has(cursor)) cursor = addDias(cursor, -7);
  let racha = 0;
  while (semanasConSesion.has(cursor)) {
    racha++;
    cursor = addDias(cursor, -7);
  }
  return racha;
}

export default async function PortalPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cliente = await obtenerClientePortal(token);
  if (!cliente) notFound();

  if (!(await sesionValidaPara(cliente.id))) {
    return (
      <PortalAcceso
        token={token}
        nombre={cliente.nombre}
        correoEnmascarado={cliente.correo ? enmascararCorreo(cliente.correo) : ""}
        pinConfigurado={!!cliente.pinHash}
      />
    );
  }

  const admin = createAdminClient();

  if (!cliente.semana_activa_id) {
    return <p className="dp-muted text-sm">Todavía no tenés una rutina asignada.</p>;
  }

  const [{ data: semana }, { data: sesiones }] = await Promise.all([
    admin.from("plan_semanas").select("*").eq("id", cliente.semana_activa_id).single<PlanSemana>(),
    admin.from("sesiones").select("*").eq("client_id", cliente.id).returns<Sesion[]>(),
  ]);

  // El atleta ve `dias_publicado` (lo último que el profesional compartió),
  // nunca `dias` directo (que puede tener cambios a medio hacer).
  if (!semana || !semana.dias_publicado || semana.dias_publicado.length === 0) {
    return <p className="dp-muted text-sm">Todavía no tenés una rutina asignada.</p>;
  }

  const todasLasSesiones = sesiones ?? [];
  const diasEntrenados = new Set(
    todasLasSesiones.filter((s) => s.fecha >= semana.created_at.slice(0, 10)).map((s) => s.dia_plan_label)
  ).size;

  return (
    <div className="flex flex-col gap-4">
      <AyudaSeccion>
        Acá ves los ejercicios de tu rutina activa — es una vista previa de lo que te toca entrenar esta
        semana (series, repeticiones y peso sugerido). La arma tu profesional, no se edita desde acá.
      </AyudaSeccion>
      <StatsMotivacionales
        diasEntrenados={Math.min(diasEntrenados, semana.dias_publicado.length)}
        diasTotales={semana.dias_publicado.length}
        rachaSemanas={calcularRachaSemanas(todasLasSesiones)}
        sesionesTotales={todasLasSesiones.length}
      />
      <PortalPlanView token={token} semana={{ ...semana, dias: semana.dias_publicado }} sesiones={todasLasSesiones} />
    </div>
  );
}
