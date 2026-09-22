import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/clientes", label: "Clientes" },
  { href: "/agenda", label: "Agenda" },
  { href: "/biblioteca", label: "Biblioteca" },
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
    <div className="flex min-h-screen">
      <aside className="dp-bg-ink flex w-60 shrink-0 flex-col justify-between p-5" style={{ backgroundColor: "var(--dp-sidebar-bg)" }}>
        <div>
          <div className="mb-8 flex items-center gap-3">
            <div className="dp-bg-white-10 flex h-10 w-10 items-center justify-center rounded-xl p-1.5">
              <Image src="/logo.png" alt="DIPRA" width={32} height={32} className="h-auto w-full" />
            </div>
            <span className="font-[family-name:var(--font-display)] font-semibold text-white">DIPRA</span>
          </div>

          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="dp-text-nav rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:dp-bg-white-5"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="dp-bg-brand flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white">
              {initials || "?"}
            </div>
            <span className="dp-text-sidebar-muted truncate text-xs">{displayName}</span>
          </div>
          <form action={signOut}>
            <button type="submit" className="dp-text-sidebar-muted text-xs hover:text-white">
              Salir
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
