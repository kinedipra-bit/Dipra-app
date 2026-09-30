"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
