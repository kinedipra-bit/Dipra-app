import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Cliente, PlanSemana, EjercicioBiblioteca } from "@/lib/dipra/types";
import { PlanView } from "./PlanView";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cliente }, { data: semanas }, { data: biblioteca }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single<Cliente>(),
    supabase.from("plan_semanas").select("*").eq("client_id", id).order("numero").returns<PlanSemana[]>(),
    supabase
      .from("biblioteca_ejercicios")
      .select("id, nombre, link")
      .order("nombre")
      .returns<EjercicioBiblioteca[]>(),
  ]);

  if (!cliente) notFound();

  return (
    <PlanView
      clienteId={cliente.id}
      fms={cliente.fms}
      semanaActivaId={cliente.semana_activa_id}
      semanasIniciales={semanas ?? []}
      bibliotecaInicial={biblioteca ?? []}
    />
  );
}
