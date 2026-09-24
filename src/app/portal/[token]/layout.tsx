import Image from "next/image";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
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
    .select("nombre")
    .eq("portal_token", token)
    .single<Pick<Cliente, "nombre">>();

  if (!cliente) notFound();

  return (
    <div className="dp-bg-app min-h-screen p-4 sm:p-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="dp-surface flex items-center gap-4 rounded-2xl p-5 shadow-sm">
          <div className="dp-bg-ink flex h-12 w-12 shrink-0 items-center justify-center rounded-xl p-2">
            <Image src="/logo.png" alt="DIPRA" width={40} height={40} className="h-auto w-full" />
          </div>
          <div>
            <p className="dp-text-brand font-[family-name:var(--font-display)] text-lg font-bold tracking-wide">
              DIPRA
            </p>
            <h1 className="dp-muted text-sm">Portal de {cliente.nombre}</h1>
          </div>
        </div>

        <PortalTabs token={token} />

        <div>{children}</div>
      </div>
    </div>
  );
}
