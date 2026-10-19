import Image from "next/image";
import { SetPasswordForm } from "./SetPasswordForm";

// Sin chequeo de sesión server-side a propósito: el link de invitación trae
// la sesión en el fragmento (#access_token=...) de la URL, que solo el
// navegador puede leer — SetPasswordForm la detecta del lado del cliente.
export default function SetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center dp-bg-app px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="dp-bg-ink flex h-20 w-20 items-center justify-center rounded-2xl p-3">
            <Image src="/logo.png" alt="DIPRA" width={56} height={56} className="h-auto w-full" />
          </div>
          <div className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold dp-text-heading">
              Bienvenida a DIPRA
            </h1>
            <p className="dp-text-tagline text-sm">Creá tu contraseña para entrar</p>
          </div>
        </div>

        <SetPasswordForm />
      </div>
    </div>
  );
}
