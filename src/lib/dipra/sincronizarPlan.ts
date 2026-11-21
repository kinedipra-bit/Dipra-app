import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiaPlan, EjercicioSesion } from "./types";

// Nicolás no siempre "programa": para varios clientes (y también cuando el
// cliente registra su propia sesión desde el portal), el plan se va
// ajustando directo en la sesión (sube un peso, cambia un ejercicio) sin
// pasar antes por Plan — en vivo, corrigiendo una sesión ya guardada, o
// desde el portal del cliente. Sin esto, el Plan quedaba pegado en lo que
// decía la última vez que SÍ se editó ahí, aunque hiciera rato que la
// sesión real fuera otra. Así que al guardar/corregir una sesión de un día
// del plan, lo realmente hecho (nombre/series/reps/kg/unilateral/peso c/u)
// se vuelca de vuelta al ejercicio correspondiente de la semana ACTIVA —
// matcheando por planExercicioId (ver EjercicioSesion), no por nombre,
// porque el nombre es justo uno de los campos que puede haber cambiado.
// Ejercicios extra agregados en la sesión (sin planExercicioId), sesiones
// sin día de plan elegido, y sesiones de ANTES de que la semana activa se
// creara (ver el chequeo de `fecha` más abajo) quedan afuera: no tienen un
// lugar claro en el plan al que volcarse. Queda como borrador
// (cambios_sin_compartir) igual que cualquier otro cambio en Plan — si el
// cliente SÍ usa el portal, no ve el cambio hasta que Nicolás comparta.
//
// Usado tanto desde clientes/[id]/sesiones/actions.ts (profesional) como
// desde portal/[token]/sesiones/actions.ts (cliente) — de ahí que tome un
// SupabaseClient genérico en vez del tipo puntual de un solo factory
// (createClient/createAdminClient devuelven el mismo tipo de todos modos).
export async function sincronizarPlanConSesion(
  supabase: SupabaseClient,
  clienteId: string,
  diaPlanLabel: string,
  fecha: string,
  ejercicios: EjercicioSesion[]
) {
  if (!diaPlanLabel) return;
  const reales = ejercicios.filter((e) => !e.extra && e.planExercicioId);
  if (reales.length === 0) return;

  const { data: cliente } = await supabase
    .from("clients")
    .select("semana_activa_id")
    .eq("id", clienteId)
    .single<{ semana_activa_id: string | null }>();
  if (!cliente?.semana_activa_id) return;

  const { data: semana } = await supabase
    .from("plan_semanas")
    .select("dias, created_at")
    .eq("id", cliente.semana_activa_id)
    .single<{ dias: DiaPlan[]; created_at: string }>();
  if (!semana) return;
  // Si la sesión que se está guardando/corrigiendo es de ANTES de que esta
  // semana se creara (ej. una sesión vieja de una semana anterior que
  // reutilizó la misma etiqueta "Día 1"), no debe pisar el ejercicio de la
  // semana ACTUAL con un dato de otra época — mismo criterio que
  // SesionesPorDia/alertasProgramacion para acotar sesiones a la semana
  // vigente.
  if (fecha < semana.created_at.slice(0, 10)) return;

  const porId = new Map(reales.map((e) => [e.planExercicioId, e]));
  let cambio = false;
  const dias = semana.dias.map((d) => {
    if (d.label !== diaPlanLabel) return d;
    return {
      ...d,
      bloques: d.bloques.map((b) => ({
        ...b,
        exercises: b.exercises.map((ex) => {
          const real = porId.get(ex.id);
          if (!real) return ex;
          cambio = true;
          return {
            ...ex,
            nombre: real.nombre,
            series: real.seriesReal,
            reps: real.repsReal,
            kg: real.kgReal,
            pesosSeries: real.pesosSeriesReal,
            repsSeries: real.repsSeriesReal,
            unilateral: real.unilateral,
            pesoCadaUno: real.pesoCadaUno,
          };
        }),
      })),
    };
  });
  if (!cambio) return;

  const { error } = await supabase
    .from("plan_semanas")
    .update({ dias, cambios_sin_compartir: true })
    .eq("id", cliente.semana_activa_id);
  if (error) return;

  revalidatePath(`/clientes/${clienteId}/plan`);
}
