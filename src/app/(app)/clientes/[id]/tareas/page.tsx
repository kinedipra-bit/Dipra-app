import { createClient } from "@/lib/supabase/server";
import type { EjercicioBiblioteca, TareaCheckin } from "@/lib/dipra/types";
import { obtenerOCrearPlanKine } from "./actions";
import { KinePlanView } from "./KinePlanView";

function hace30Dias() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export default async function TareasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [plan, { data: biblioteca }, { data: checkins }] = await Promise.all([
    obtenerOCrearPlanKine(id),
    supabase.from("biblioteca_ejercicios").select("id, nombre, link").order("nombre").returns<EjercicioBiblioteca[]>(),
    supabase
      .from("client_tareas_checkins")
      .select("*")
      .eq("client_id", id)
      .gte("fecha", hace30Dias())
      .order("fecha", { ascending: false })
      .returns<TareaCheckin[]>(),
  ]);

  const indicacionesPdfUrl = plan.indicaciones_pdf_path
    ? supabase.storage.from("indicaciones").getPublicUrl(plan.indicaciones_pdf_path).data.publicUrl
    : null;

  return (
    <KinePlanView
      clienteId={id}
      planInicial={plan}
      bibliotecaInicial={biblioteca ?? []}
      indicacionesPdfUrl={indicacionesPdfUrl}
      checkins={checkins ?? []}
    />
  );
}
