"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface NuevaSesionPortalInput {
  fecha: string;
  dia_plan_label: string;
  pilares: { sueno: string; nutricion: string; hidratacion: string; movimiento: string; estres: string };
  comentarios: string;
}

// El atleta no tiene sesión de Supabase Auth — solo el link con su
// portal_token. Por eso se usa el cliente admin (service role, bypassa
// RLS) y se resuelve el client_id A PARTIR del token acá adentro, nunca
// confiando en un id que venga del cliente.
export async function crearSesionPortal(token: string, input: NuevaSesionPortalInput) {
  const admin = createAdminClient();

  const { data: cliente } = await admin.from("clients").select("id").eq("portal_token", token).single();
  if (!cliente) throw new Error("Link inválido");

  const { error } = await admin.from("sesiones").insert({
    client_id: cliente.id,
    fecha: input.fecha,
    tipo: "Entrenamiento personalizado",
    dia_plan_label: input.dia_plan_label,
    es_primera_sesion: false,
    comentarios_pre: "",
    pilares: input.pilares,
    comentarios: input.comentarios,
    ejercicios: [],
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/portal/${token}/sesiones`);
  revalidatePath(`/clientes/${cliente.id}/sesiones`);
}
