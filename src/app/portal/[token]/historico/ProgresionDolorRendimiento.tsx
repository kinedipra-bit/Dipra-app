export interface SemanaDolorRendimiento {
  numero: number;
  mesociclo: string;
  volumen: number;
  dolorPromedio: number | null;
}

const ANCHO = 600;
const ALTO = 180;
const PAD_X = 10;
const PAD_Y = 14;

function puntosX(n: number): number[] {
  if (n <= 1) return [ANCHO / 2];
  const paso = (ANCHO - PAD_X * 2) / (n - 1);
  return Array.from({ length: n }, (_, i) => PAD_X + i * paso);
}

// Agrupa índices consecutivos con dato (no-null) en tramos — así la línea
// de dolor no "salta" por encima de semanas sin check-ins todavía (recién
// se agregó el check-in diario, así que la mayoría del historial va a
// tener huecos por un tiempo).
function tramosConDato(valores: (number | null)[]): number[][] {
  const tramos: number[][] = [];
  let actual: number[] = [];
  valores.forEach((v, i) => {
    if (v === null) {
      if (actual.length > 0) tramos.push(actual);
      actual = [];
    } else {
      actual.push(i);
    }
  });
  if (actual.length > 0) tramos.push(actual);
  return tramos;
}

// Gráfico combinado dolor/rendimiento — misma idea que un carrusel de
// marketing que vio Nicolás (dos líneas cruzándose: dolor bajando,
// rendimiento subiendo) pero con datos reales: volumen semanal movido
// (sesiones) vs. promedio de dolor auto-reportado esa semana (ver
// CheckinDiarioCard en Tareas).
export function ProgresionDolorRendimiento({ semanas }: { semanas: SemanaDolorRendimiento[] }) {
  const hayVolumen = semanas.some((s) => s.volumen > 0);
  const hayDolor = semanas.some((s) => s.dolorPromedio !== null);
  if (!hayVolumen || !hayDolor || semanas.length < 2) return null;

  const xs = puntosX(semanas.length);
  const maxVolumen = Math.max(...semanas.map((s) => s.volumen), 1);

  const yVolumen = (v: number) => ALTO - PAD_Y - (v / maxVolumen) * (ALTO - PAD_Y * 2);
  const yDolor = (d: number) => ALTO - PAD_Y - (d / 5) * (ALTO - PAD_Y * 2);

  const puntosVolumen = semanas.map((s, i) => `${xs[i]},${yVolumen(s.volumen)}`).join(" ");
  const dolorValores = semanas.map((s) => s.dolorPromedio);
  const tramosDolor = tramosConDato(dolorValores);

  return (
    <section className="dp-scope-dark rounded-2xl p-5 shadow-sm">
      <h2 className="dp-text-brand mb-1 font-[family-name:var(--font-display)] font-semibold">
        Dolor vs. rendimiento
      </h2>
      <p className="dp-muted mb-3 text-xs">
        Volumen movido (línea verde, sube es bueno) contra el dolor que fuiste registrando (línea roja, baja
        es bueno) semana a semana.
      </p>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full" preserveAspectRatio="none">
        <polyline points={puntosVolumen} fill="none" stroke="var(--dp-brand)" strokeWidth={2.5} />
        {semanas.map((s, i) => (
          <circle key={`v-${s.numero}`} cx={xs[i]} cy={yVolumen(s.volumen)} r={3} fill="var(--dp-brand)" />
        ))}
        {tramosDolor.map((tramo, ti) => (
          <polyline
            key={ti}
            points={tramo.map((i) => `${xs[i]},${yDolor(semanas[i].dolorPromedio as number)}`).join(" ")}
            fill="none"
            stroke="var(--dp-alert)"
            strokeWidth={2.5}
            strokeDasharray="5 4"
          />
        ))}
        {semanas.map((s, i) =>
          s.dolorPromedio === null ? null : (
            <circle key={`d-${s.numero}`} cx={xs[i]} cy={yDolor(s.dolorPromedio)} r={3} fill="var(--dp-alert)" />
          )
        )}
      </svg>
      <div className="dp-muted mt-1 flex justify-between font-mono text-[9px]">
        {semanas.map((s) => (
          <span key={s.numero}>S{s.numero}</span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="dp-bg-brand h-2 w-2 rounded-full" />
          <span className="dp-body">Volumen (kg)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="dp-bg-alert h-2 w-2 rounded-full" />
          <span className="dp-body">Dolor promedio (0-5)</span>
        </span>
      </div>
    </section>
  );
}
