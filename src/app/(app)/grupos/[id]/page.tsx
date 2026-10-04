import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Grupo, GrupoPlanSemana, EjercicioBiblioteca } from "@/lib/dipra/types";
import { GrupoView } from "./GrupoView";

export default async function GrupoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: grupo },
    { data: miembrosRows },
    { data: semanas },
    { data: clientes },
    { data: biblioteca },
  ] = await Promise.all([
    supabase.from("grupos").select("*").eq("id", id).single<Grupo>(),
    supabase.from("grupo_miembros").select("client_id").eq("grupo_id", id),
    supabase.from("grupo_plan_semanas").select("*").eq("grupo_id", id).order("numero").returns<GrupoPlanSemana[]>(),
    supabase.from("clients").select("id, nombre").order("nombre").returns<{ id: string; nombre: string }[]>(),
    supabase
      .from("biblioteca_ejercicios")
      .select("id, nombre, link")
      .order("nombre")
      .returns<EjercicioBiblioteca[]>(),
  ]);

  if (!grupo) notFound();

  const miembroIds = (miembrosRows ?? []).map((m) => m.client_id);
  const miembros = (clientes ?? []).filter((c) => miembroIds.includes(c.id));

  return (
    <GrupoView
      grupo={grupo}
      miembrosIniciales={miembros}
      todosLosClientes={clientes ?? []}
      semanasIniciales={semanas ?? []}
      bibliotecaInicial={biblioteca ?? []}
    />
  );
}
