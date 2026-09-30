import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { InstalarApp } from "@/components/InstalarApp";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/clientes", label: "Clientes" },
  { href: "/agenda", label: "Agenda" },
  { href: "/biblioteca", label: "Biblioteca" },
  { href: "/ajustes", label: "Ajustes" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: professional } = await supabase
    .from("professionals")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const displayName = professional?.full_name || professional?.email || user.email || "";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <aside
        className="dp-bg-ink flex shrink-0 flex-col gap-4 p-4 sm:w-60 sm:justify-between sm:gap-0 sm:p-5"
        style={{ backgroundColor: "var(--dp-sidebar-bg)" }}
      >
        <div>
          <div className="mb-3 flex items-center gap-3 sm:mb-8">
            <div className="dp-bg-white-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-1.5">
              <Image src="/logo.png" alt="DIPRA" width={32} height={32} className="h-auto w-full" />
            </div>
            <span className="font-[family-name:var(--font-display)] font-semibold text-white">DIPRA</span>
          </div>

          <nav className="flex gap-1 overflow-x-auto sm:flex-col">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="dp-text-nav shrink-0 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:dp-bg-white-5"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3">
          <InstalarApp className="px-3" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="dp-bg-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                {initials || "?"}
              </div>
              <span className="dp-text-sidebar-muted truncate text-xs">{displayName}</span>
            </div>
            <form action={signOut}>
              <button type="submit" className="dp-text-sidebar-muted shrink-0 text-xs hover:text-white">
                Salir
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
