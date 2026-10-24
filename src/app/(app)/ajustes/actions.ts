"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, type RolProfesional } from "@/lib/dipra/auth";

export async function invitarProfesional(email: string, role: RolProfesional): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa" };

  const correo = email.trim().toLowerCase();
  if (!correo) return { error: "Ingresá un email" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dipra-app.vercel.app";
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(correo, {
    redirectTo: `${siteUrl}/auth/set-password`,
  });
  if (error) return { error: error.message };

  // El trigger handle_new_professional ya insertó la fila en professionals
  // (con role='admin' por default de la columna) justo antes de que esto
  // corra — acá se ajusta al rol elegido en el formulario de invitación.
  if (role !== "admin" && data.user) {
    await admin.from("professionals").update({ role }).eq("id", data.user.id);
  }
  return {};
}

export async function listarColaboradores() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("professionals")
    .select("id, full_name, email, role")
    .order("email")
    .returns<{ id: string; full_name: string; email: string; role: RolProfesional }[]>();
  return data ?? [];
}

export async function cambiarContrasenaColaborador(
  colaboradorId: string,
  nuevaContrasena: string
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa" };

  if (nuevaContrasena.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(colaboradorId, {
    password: nuevaContrasena,
  });
  if (error) return { error: error.message };
  return {};
}

export async function cambiarRolColaborador(
  colaboradorId: string,
  role: RolProfesional
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === colaboradorId) {
    return { error: "No te podés sacar el rol de administrador a vos mismo." };
  }

  const { error } = await supabase.from("professionals").update({ role }).eq("id", colaboradorId);
  if (error) return { error: error.message };
  revalidatePath("/ajustes");
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
