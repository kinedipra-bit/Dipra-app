import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar } from "@/components/Avatar";
import type { Cliente } from "@/lib/dipra/types";
import { PortalTabs } from "./PortalTabs";

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: cliente } = await admin
    .from("clients")
    .select("id, nombre, iniciales")
    .eq("portal_token", token)
    .single<Pick<Cliente, "id" | "nombre" | "iniciales">>();

  if (!cliente) notFound();

  return (
    <div className="dp-bg-app min-h-screen p-4 sm:p-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="dp-surface flex items-center gap-4 rounded-2xl p-5 shadow-sm">
          <Avatar iniciales={cliente.iniciales} size={48} />
          <div>
            <p className="dp-muted text-xs">Portal del atleta</p>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold dp-text-heading">
              {cliente.nombre}
            </h1>
          </div>
        </div>

        <PortalTabs token={token} />

        <div>{children}</div>
      </div>
    </div>
  );
}
