"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function invitarProfesional(email: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa" };

  const correo = email.trim().toLowerCase();
  if (!correo) return { error: "Ingresá un email" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dipra-app.vercel.app";
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(correo, {
    redirectTo: `${siteUrl}/auth/set-password`,
  });
  if (error) return { error: error.message };
  return {};
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
