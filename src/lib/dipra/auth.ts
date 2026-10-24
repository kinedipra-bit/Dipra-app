import { createClient } from "@/lib/supabase/server";

export type RolProfesional = "admin" | "colaboradora";

// Todas las cuentas creadas antes de que existiera este campo quedan
// 'admin' por default en la columna — nadie pierde acceso al agregar
// roles. null = no hay sesión.
export async function obtenerRolActual(): Promise<RolProfesional | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("professionals")
    .select("role")
    .eq("id", user.id)
    .single<{ role: RolProfesional }>();
  return data?.role ?? "admin";
}

// Para acciones de servidor que solo puede hacer un admin (Ficha clínica,
// Finanzas, invitar/gestionar colaboradores) — nunca confiar en que la UI
// ya lo ocultó, la acción se puede llamar directo.
export async function requireAdmin() {
  const rol = await obtenerRolActual();
  if (rol !== "admin") {
    throw new Error("No tenés permiso para hacer esto — hablalo con quien administra la cuenta.");
  }
}
