"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanSemana } from "@/lib/dipra/types";

// El atleta accede sin login, autenticado únicamente por poseer el link con
// su portal_token. Por eso esta acción SIEMPRE revalida que la semana que
// se está editando pertenezca al cliente dueño de ese token antes de
// escribir nada — así un token no puede usarse para editar el plan de otro
// cliente aunque alguien adivinara/forzara un semanaId ajeno.
export async function updateComentarioCliente(
  token: string,
  semanaId: string,
  diaId: string,
  bloqueId: string,
  ejercicioId: string,
  comentario: string
) {
  const admin = createAdminClient();

  const { data: cliente } = await admin.from("clients").select("id").eq("portal_token", token).single();
  if (!cliente) throw new Error("Link inválido");

  const { data: semana } = await admin
    .from("plan_semanas")
    .select("id, client_id, dias")
    .eq("id", semanaId)
    .eq("client_id", cliente.id)
    .single<Pick<PlanSemana, "id" | "client_id" | "dias">>();
  if (!semana) throw new Error("No autorizado");

  const nextDias = semana.dias.map((dia) =>
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

  const { error } = await admin.from("plan_semanas").update({ dias: nextDias }).eq("id", semanaId);
  if (error) throw new Error(error.message);
}
