"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { DiaPlan, PlanSemana } from "@/lib/dipra/types";

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
    .select("id, client_id, dias, dias_publicado")
    .eq("id", semanaId)
    .eq("client_id", cliente.id)
    .single<Pick<PlanSemana, "id" | "client_id" | "dias" | "dias_publicado">>();
  if (!semana) throw new Error("No autorizado");

  // Se aplica en las dos copias: en `dias` (el borrador, para que el
  // profesional lo vea la próxima vez que edite) y en `dias_publicado` (lo
  // que el propio atleta está viendo ahora mismo) — es su propio comentario,
  // no tiene sentido que quede escondido detrás de un "compartir" del
  // profesional.
  const nextDias = aplicarComentario(semana.dias, diaId, bloqueId, ejercicioId, comentario);
  const nextDiasPublicado = semana.dias_publicado
    ? aplicarComentario(semana.dias_publicado, diaId, bloqueId, ejercicioId, comentario)
    : null;

  const { error } = await admin
    .from("plan_semanas")
    .update({ dias: nextDias, ...(nextDiasPublicado ? { dias_publicado: nextDiasPublicado } : {}) })
    .eq("id", semanaId);
  if (error) throw new Error(error.message);
}
