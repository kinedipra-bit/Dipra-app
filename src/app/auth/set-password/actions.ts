"use server";

import { createClient } from "@/lib/supabase/server";

export async function definirContrasena(password: string) {
  if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("El link venció. Pedí que te inviten de nuevo.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
