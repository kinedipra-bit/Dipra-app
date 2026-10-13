import { createClient } from "@/lib/supabase/server";
import type { EjercicioBiblioteca } from "@/lib/dipra/types";
import { obtenerOCrearPlanKine } from "./actions";
import { KinePlanView } from "./KinePlanView";

export default async function TareasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [plan, { data: biblioteca }] = await Promise.all([
    obtenerOCrearPlanKine(id),
    supabase.from("biblioteca_ejercicios").select("id, nombre, link").order("nombre").returns<EjercicioBiblioteca[]>(),
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
    />
  );
}
