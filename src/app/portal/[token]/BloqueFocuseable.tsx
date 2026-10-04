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
      ? "bg-[rgba(30,132,73,0.25)] border-[3px] p-6 shadow-xl scale-[1.06]"
      : estado === "atenuado"
        ? "dp-bg-faint border-2 p-2 opacity-40 scale-[0.98]"
        : "dp-bg-faint border-2 p-4";

  return (
    <div
      className={`dp-border-brand rounded-xl transition-all duration-200 ${estadoClass}`}
    >
      <button
        type="button"
        onClick={onFocus}
        className="mb-1 flex w-full items-center justify-between gap-2 text-left"
      >
        <h3 className={`dp-muted font-semibold tracking-wide uppercase ${estado === "activo" ? "text-lg" : "text-base"}`}>
          {title}
        </h3>
        {meta}
      </button>
      {children}
    </div>
  );
}
