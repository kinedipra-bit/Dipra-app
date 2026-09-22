import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con la service role key: bypassa RLS. SOLO se importa desde
// código de servidor (route handlers / server actions), nunca desde un
// componente cliente. Se usa para el portal del atleta (que no tiene un
// usuario real de Supabase Auth, solo un portal_token por cliente) y para
// scripts de migración.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
