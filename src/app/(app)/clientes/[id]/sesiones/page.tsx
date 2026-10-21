import { createClient } from "@/lib/supabase/server";
import type { DiaEntrenamiento, DiaPlan, EjercicioBiblioteca, Sesion } from "@/lib/dipra/types";
import { SesionesClient } from "./SesionesClient";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function SesionesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: sesiones }, { data: cliente }, { data: semanas }, { data: diasConfirmados }, { data: biblioteca }] =
    await Promise.all([
      supabase
        .from("sesiones")
        .select("*")
        .eq("client_id", id)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false })
        .returns<Sesion[]>(),
      supabase.from("clients").select("semana_activa_id").eq("id", id).single<{ semana_activa_id: string | null }>(),
      supabase
        .from("plan_semanas")
        .select("id, numero, dias")
        .eq("client_id", id)
        .order("numero")
        .returns<{ id: string; numero: number; dias: DiaPlan[] }[]>(),
      // Días que el cliente confirmó desde su portal (ver mini calendario en
      // Sesiones del portal) — de hoy en adelante, para mostrar como aviso acá.
      supabase
        .from("client_dias_entrenamiento")
        .select("*")
        .eq("client_id", id)
        .gte("fecha", toISODate(new Date()))
        .order("fecha")
        .returns<DiaEntrenamiento[]>(),
      // Para "Ejercicios planificados en esta sesión" (mismo ExerciseRow que
      // Plan/Tareas, con autocompletado de nombre + link).
      supabase.from("biblioteca_ejercicios").select("id, nombre, link").order("nombre").returns<EjercicioBiblioteca[]>(),
    ]);

  const semanaActiva =
    semanas?.find((s) => s.id === cliente?.semana_activa_id) ?? semanas?.[0] ?? null;

  return (
    <SesionesClient
      clienteId={id}
      sesionesIniciales={sesiones ?? []}
      diasPlan={semanaActiva?.dias ?? []}
      diasConfirmados={diasConfirmados ?? []}
      bibliotecaInicial={biblioteca ?? []}
    />
  );
}
