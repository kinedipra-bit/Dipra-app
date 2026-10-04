import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Cita, Cliente, PlanSemana, EjercicioBiblioteca, Sesion, PlantillaRutina } from "@/lib/dipra/types";
import { PlanView } from "./PlanView";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cliente }, { data: semanas }, { data: biblioteca }, { data: sesiones }, { data: citas }, { data: plantillas }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single<Cliente>(),
      supabase.from("plan_semanas").select("*").eq("client_id", id).order("numero").returns<PlanSemana[]>(),
      supabase
        .from("biblioteca_ejercicios")
        .select("id, nombre, link")
        .order("nombre")
        .returns<EjercicioBiblioteca[]>(),
      supabase.from("sesiones").select("*").eq("client_id", id).returns<Sesion[]>(),
      supabase
        .from("citas")
        .select("fecha, hora, dia_plan_label")
        .eq("client_id", id)
        .returns<Pick<Cita, "fecha" | "hora" | "dia_plan_label">[]>(),
      // Plantillas disponibles para este cliente: las generales (cliente_id
      // null) más las guardadas específicamente para él.
      supabase
        .from("plantillas_rutina")
        .select("*")
        .or(`cliente_id.is.null,cliente_id.eq.${id}`)
        .order("created_at", { ascending: false })
        .returns<PlantillaRutina[]>(),
    ]);

  if (!cliente) notFound();

  return (
    <PlanView
      clienteId={cliente.id}
      fms={cliente.fms}
      semanaActivaId={cliente.semana_activa_id}
      semanasIniciales={semanas ?? []}
      bibliotecaInicial={biblioteca ?? []}
      sesiones={sesiones ?? []}
      citas={citas ?? []}
      plantillasIniciales={plantillas ?? []}
    />
  );
}
