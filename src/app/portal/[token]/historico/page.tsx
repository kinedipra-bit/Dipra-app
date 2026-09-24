import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { volumenEjercicioSesion } from "@/lib/dipra/calc";
import { enmascararCorreo } from "@/lib/dipra/portalPin";
import type { PlanSemana, Sesion } from "@/lib/dipra/types";
import { obtenerClientePortal, sesionValidaPara } from "../acceso";
import { PortalAcceso } from "../PortalAcceso";
import { EliminarSesionButton } from "../sesiones/EliminarSesionButton";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function fmtFecha(f: string) {
  const d = new Date(f + "T00:00:00");
  return isNaN(d.getTime()) ? f : d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

export default async function PortalHistoricoPage({ params }: { params: Promise<{ token: string }> }) {
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

  const [{ data: sesiones }, { data: semana }] = await Promise.all([
    admin
      .from("sesiones")
      .select("*")
      .eq("client_id", cliente.id)
      .order("fecha", { ascending: false })
      .returns<Sesion[]>(),
    cliente.semana_activa_id
      ? admin
          .from("plan_semanas")
          .select("mesociclo, objetivo")
          .eq("id", cliente.semana_activa_id)
          .single<Pick<PlanSemana, "mesociclo" | "objetivo">>()
      : Promise.resolve({ data: null }),
  ]);

  // Agrupa por mes calendario (YYYY-MM), más reciente primero.
  const porMes = new Map<string, Sesion[]>();
  (sesiones ?? []).forEach((s) => {
    const key = s.fecha.slice(0, 7);
    const lista = porMes.get(key) ?? [];
    lista.push(s);
    porMes.set(key, lista);
  });
  const meses = [...porMes.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="flex flex-col gap-5">
      {semana && (semana.mesociclo || semana.objetivo) && (
        <p className="dp-muted -mt-1 text-xs">
          Ahora: {semana.mesociclo || "sin mesociclo"} {semana.objetivo && `— ${semana.objetivo}`}
        </p>
      )}

      {meses.length === 0 ? (
        <p className="dp-muted dp-surface rounded-2xl p-8 text-center text-sm shadow-sm">
          Todavía no hay sesiones registradas.
        </p>
      ) : (
        meses.map(([key, lista]) => {
          const [anio, mes] = key.split("-").map(Number);
          const nombreMes = `${MESES[mes - 1]} ${anio}`;
          const volumenTotal = lista.reduce(
            (sum, s) => sum + s.ejercicios.reduce((sSum, ex) => sSum + volumenEjercicioSesion(ex), 0),
            0
          );
          const porDia = new Map<string, number>();
          lista.forEach((s) => {
            const label = s.dia_plan_label || "Sin día asignado";
            porDia.set(label, (porDia.get(label) ?? 0) + 1);
          });

          return (
            <section key={key} className="dp-scope-dark rounded-2xl p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="dp-text-brand font-[family-name:var(--font-display)] font-semibold">{nombreMes}</h2>
                <div className="flex items-center gap-3 text-xs">
                  <span className="dp-muted">{lista.length} sesiones</span>
                  {volumenTotal > 0 && (
                    <span className="dp-muted font-mono">{volumenTotal.toLocaleString("es-CL")} kg vol.</span>
                  )}
                </div>
              </div>

              <div className="mb-3 flex flex-wrap gap-1.5">
                {[...porDia.entries()].map(([label, n]) => (
                  <span key={label} className="dp-bg-faint dp-body rounded-full px-2 py-0.5 text-[11px] font-medium">
                    {label} ×{n}
                  </span>
                ))}
              </div>

              <div className="divide-y divide-white/10">
                {lista.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                    <span className="dp-body">
                      <span className="font-mono text-xs">{fmtFecha(s.fecha)}</span>
                      {s.dia_plan_label && ` · ${s.dia_plan_label}`}
                    </span>
                    <EliminarSesionButton token={token} sesionId={s.id} />
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
