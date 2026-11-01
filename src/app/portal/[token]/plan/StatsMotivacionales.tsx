function Stat({ valor, label }: { valor: string; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 px-2 py-1 text-center">
      <span className="dp-text-brand font-[family-name:var(--font-display)] text-xl font-bold">{valor}</span>
      <span className="dp-muted text-[10px] leading-tight font-medium uppercase tracking-wide">{label}</span>
    </div>
  );
}

// Franja de stats arriba de "Mi rutina" — para que el cliente sienta
// progreso apenas abre el portal, no solo vea una lista de ejercicios.
export function StatsMotivacionales({
  diasEntrenados,
  diasTotales,
  rachaSemanas,
  sesionesTotales,
}: {
  diasEntrenados: number;
  diasTotales: number;
  rachaSemanas: number;
  sesionesTotales: number;
}) {
  return (
    <div className="dp-scope-dark flex items-stretch divide-x divide-white/10 rounded-2xl p-3 shadow-sm">
      <Stat valor={`${diasEntrenados}/${diasTotales}`} label="Días esta semana" />
      <Stat valor={String(rachaSemanas)} label={rachaSemanas === 1 ? "Semana seguida" : "Semanas seguidas"} />
      <Stat valor={String(sesionesTotales)} label="Sesiones en total" />
    </div>
  );
}
