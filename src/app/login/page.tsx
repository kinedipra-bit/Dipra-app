import Image from "next/image";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center dp-bg-app px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="dp-bg-ink flex h-20 w-20 items-center justify-center rounded-2xl p-3">
            <Image src="/logo.png" alt="DIPRA" width={56} height={56} className="h-auto w-full" />
          </div>
          <div className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold dp-text-heading">
              DIPRA
            </h1>
            <p className="dp-text-tagline text-sm">Acceso profesionales</p>
          </div>
        </div>

        <form action={signIn} className="dp-surface flex flex-col gap-4 rounded-2xl p-6 shadow-sm">
          <input type="hidden" name="next" value={next ?? "/"} />

          {error && (
            <p className="dp-bg-alert-soft dp-alert rounded-lg px-3 py-2 text-sm">
              No pudimos iniciar sesión: {error}
            </p>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:dp-border-brand"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Contraseña</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:dp-border-brand"
            />
          </label>

          <button
            type="submit"
            className="dp-bg-brand mt-2 rounded-lg py-2 font-medium text-white transition-colors"
          >
            Entrar
          </button>
        </form>

        <p className="dp-text-faint mt-6 text-center text-xs">
          ¿Sos paciente? Pedile a tu profesional el link de acceso a tu portal.
        </p>
      </div>
    </div>
  );
}
