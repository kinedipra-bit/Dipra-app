import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AjustesForm } from "./AjustesForm";

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: professional } = await supabase
    .from("professionals")
    .select("link_boletas_sii")
    .eq("id", user.id)
    .single<{ link_boletas_sii: string | null }>();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold dp-text-heading">Ajustes</h1>
      <AjustesForm initialLinkBoletasSii={professional?.link_boletas_sii ?? null} />
    </div>
  );
}
