"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function invitarProfesional(email: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa");

  const correo = email.trim().toLowerCase();
  if (!correo) throw new Error("Ingresá un email");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(correo);
  if (error) throw new Error(error.message);
}

export async function updateLinkBoletasSii(link: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa");

  const { error } = await supabase
    .from("professionals")
    .update({ link_boletas_sii: link.trim() || null })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}
