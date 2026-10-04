"use client";

/**
 * Tarjeta de bloque con foco táctil: tocando el título, ese bloque se
 * agranda/destaca (más padding, sombra, leve escala) y los demás bloques
 * (de cualquier día) quedan atenuados — para que en el gym se note de un
 * vistazo en qué bloque está el atleta. Si todavía no tocó ninguno, todos
 * se ven igual que antes (sin atenuar ni agrandar).
 */
export function BloqueFocuseable({
  title,
  meta,
  estado,
  onFocus,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  estado: "normal" | "activo" | "atenuado";
  onFocus: () => void;
  children: React.ReactNode;
}) {
  const estadoClass =
    estado === "activo"
      ? "p-4 shadow-lg scale-[1.02]"
      : estado === "atenuado"
        ? "p-3 opacity-45"
        : "p-4";

  return (
    <div
      className={`dp-bg-faint dp-border-brand rounded-xl border-2 transition-all duration-200 ${estadoClass}`}
    >
      <button
        type="button"
        onClick={onFocus}
        className="mb-1 flex w-full items-center justify-between gap-2 text-left"
      >
        <h3 className="dp-muted text-base font-semibold tracking-wide uppercase">{title}</h3>
        {meta}
      </button>
      {children}
    </div>
  );
}
