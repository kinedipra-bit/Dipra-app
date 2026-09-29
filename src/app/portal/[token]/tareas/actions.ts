"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { DiaPlan, PlanKine } from "@/lib/dipra/types";

function aplicarComentario(
  dias: DiaPlan[],
  diaId: string,
  bloqueId: string,
  ejercicioId: string,
  comentario: string
): DiaPlan[] {
  return dias.map((dia) =>
    dia.id !== diaId
      ? dia
      : {
          ...dia,
          bloques: dia.bloques.map((b) =>
            b.id !== bloqueId
              ? b
              : {
                  ...b,
                  exercises: b.exercises.map((e) =>
                    e.id !== ejercicioId ? e : { ...e, comentarioCliente: comentario }
                  ),
                }
          ),
        }
  );
}

// El atleta no tiene sesión de Supabase Auth — solo el link con su
// portal_token. Se resuelve el client_id a partir del token acá adentro,
// nunca confiando en uno que venga del cliente.
export async function updateComentarioClienteKine(
  token: string,
  diaId: string,
  bloqueId: string,
  ejercicioId: string,
  comentario: string
) {
  const admin = createAdminClient();

  const { data: cliente } = await admin.from("clients").select("id").eq("portal_token", token).single();
  if (!cliente) throw new Error("Link inválido");

  const { data: plan } = await admin
    .from("plan_kine")
    .select("dias, dias_publicado")
    .eq("client_id", cliente.id)
    .single<Pick<PlanKine, "dias" | "dias_publicado">>();
  if (!plan) throw new Error("No autorizado");

  const nextDias = aplicarComentario(plan.dias, diaId, bloqueId, ejercicioId, comentario);
  const nextDiasPublicado = plan.dias_publicado
    ? aplicarComentario(plan.dias_publicado, diaId, bloqueId, ejercicioId, comentario)
    : null;

  const { error } = await admin
    .from("plan_kine")
    .update({ dias: nextDias, ...(nextDiasPublicado ? { dias_publicado: nextDiasPublicado } : {}) })
    .eq("client_id", cliente.id);
  if (error) throw new Error(error.message);
}
