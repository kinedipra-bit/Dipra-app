// Ayuda contextual breve al principio de cada pestaña del portal — para
// que el cliente entienda de un vistazo para qué sirve esa sección, sin
// tener que preguntarle a Nicolás.
export function AyudaSeccion({ children }: { children: React.ReactNode }) {
  return (
    <p className="dp-bg-faint dp-body rounded-lg px-3 py-2 text-xs leading-relaxed">
      <span aria-hidden>ℹ️ </span>
      {children}
    </p>
  );
}
