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

  return <KinePlanView clienteId={id} planInicial={plan} bibliotecaInicial={biblioteca ?? []} />;
}
