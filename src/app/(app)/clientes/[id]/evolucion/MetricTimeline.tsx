"use client";

import { useState } from "react";
import type { PrHistorialEntry } from "@/lib/dipra/types";
import type { MetricKey } from "./metricas";

const VB_W = 900;
const VB_H = 150;
const PLOT_LEFT = 10;
const PLOT_RIGHT = 890;
const PLOT_TOP = 20;
const PLOT_BOTTOM = 120;
const TICK_Y = 138;
const BAND_LABEL_Y = 34;
// Más de ~3 meses sin medición entre dos marcas — se dibuja esa línea
// punteada en vez de sólida, para no insinuar progreso continuo donde en
// realidad hubo un salto sin datos. Los mesociclos suelen medirse cada
// 4-8 semanas, así que el umbral queda bastante por encima de ese ritmo
// normal — solo marca quiebres de verdad (vacaciones, lesión, etc.).
const GAP_PUNTEADO_DIAS = 90;

type Punto = {
  id: string;
  t: number;
  valor: number;
  fecha: string;
  mesociclo: string;
  objetivo: string;
};

function mesesEntre(desde: Date, hasta: Date): Date[] {
  const meses: Date[] = [];
  const cursor = new Date(desde.getFullYear(), desde.getMonth(), 1);
  const limite = new Date(hasta.getFullYear(), hasta.getMonth(), 1);
  while (cursor.getTime() <= limite.getTime()) {
    meses.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return meses;
}

function labelMes(d: Date, conAnio: boolean): string {
  const mes = d.toLocaleDateString("es-CL", { month: "short" }).replace(/\.$/, "");
  return conAnio ? `${mes} '${String(d.getFullYear()).slice(2)}` : mes;
}

function fmtFechaCorta(f: string) {
  const d = new Date(f + "T00:00:00");
  return isNaN(d.getTime()) ? f : d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "2-digit" });
}

const MESES_COMPARACION_PROGRESO = 6;
const DIA_MS = 24 * 60 * 60 * 1000;

function formatearDuracion(dias: number): string {
  if (dias < 45) return `${Math.round(dias)} día${Math.round(dias) === 1 ? "" : "s"}`;
  const meses = dias / 30.44;
  if (meses < 18) return `${Math.round(meses)} meses`;
  return `${(meses / 12).toFixed(1)} años`;
}

// Feedback de progreso basado en evidencia: compara el último registro con
// el que haya más cerca de MESES_COMPARACION_PROGRESO meses antes (o el más
// antiguo disponible, si hay menos historial que eso) — y lo dice con la
// duración REAL entre ambos, nunca "6 meses" fijo si en realidad hay menos
// datos.
function progresoReciente(puntos: Punto[]): { texto: string; signo: "pos" | "neg" | "neutro" } | null {
  if (puntos.length < 2) return null;
  const ultimo = puntos[puntos.length - 1];
  const objetivoT = ultimo.t - MESES_COMPARACION_PROGRESO * 30.44 * DIA_MS;
  const anteriores = puntos.slice(0, -1);
  const comparacion = anteriores.reduce((mejor, p) =>
    Math.abs(p.t - objetivoT) < Math.abs(mejor.t - objetivoT) ? p : mejor
  );
  const dias = (ultimo.t - comparacion.t) / DIA_MS;
  if (dias < 14) return null; // demasiado poco tiempo entre mediciones para que un delta signifique algo
  const delta = ultimo.valor - comparacion.valor;
  const signo = delta > 0 ? "pos" : delta < 0 ? "neg" : "neutro";
  const deltaTexto = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "sin cambios";
  const texto = `${deltaTexto} en ${formatearDuracion(dias)} (${fmtFechaCorta(comparacion.fecha)} → ${fmtFechaCorta(ultimo.fecha)})`;
  return { texto, signo };
}

// Línea de tiempo real (no columnas parejas) de una métrica — el eje X
// respeta las fechas de verdad, así un salto de un año entre mediciones se
// VE como un salto grande, y se puede comparar "mayo" con "mayo del año
// siguiente" a simple vista. Las franjas de fondo marcan la fase
// (mesociclo/objetivo) vigente desde cada medición hasta la siguiente.
export function MetricTimeline({
  hist,
  metricKey,
  extraId,
  label,
}: {
  hist: PrHistorialEntry[];
  // Una métrica fija (columna propia en client_pr_historial) o una
  // personalizada (clave dentro de la columna `extra` jsonb, ver
  // metricas.ts) — exactamente una de las dos.
  metricKey?: MetricKey;
  extraId?: string;
  label: string;
}) {
  const [activoId, setActivoId] = useState<string | null>(null);

  const valorDe = (h: PrHistorialEntry) =>
    metricKey ? Number(h[metricKey]) || 0 : Number(h.extra?.[extraId ?? ""]) || 0;

  const puntos: Punto[] = hist
    .map((h) => ({
      id: h.id,
      t: new Date(h.fecha + "T00:00:00").getTime(),
      valor: valorDe(h),
      fecha: h.fecha,
      mesociclo: h.mesociclo,
      objetivo: h.objetivo,
    }))
    .filter((p) => p.valor > 0 && !isNaN(p.t))
    .sort((a, b) => a.t - b.t);

  if (puntos.length === 0) {
    return (
      <div>
        <p className="dp-muted mb-1 text-xs font-medium">{label}</p>
        <p className="dp-muted text-[11px]">Sin mediciones todavía.</p>
      </div>
    );
  }

  const maxValor = Math.max(...puntos.map((p) => p.valor));
  const activo = puntos.find((p) => p.id === activoId) ?? null;
  const progreso = progresoReciente(puntos);

  // Un solo punto: nada que trazar en el tiempo, se muestra solo.
  if (puntos.length === 1) {
    const p = puntos[0];
    return (
      <div>
        <p className="dp-muted mb-1 text-xs font-medium">{label}</p>
        <p className="dp-text-heading font-mono text-sm">
          {p.valor} <span className="dp-muted text-[11px] font-normal">· {fmtFechaCorta(p.fecha)} · {p.mesociclo}</span>
        </p>
      </div>
    );
  }

  const tMin = puntos[0].t;
  const tMax = puntos[puntos.length - 1].t;
  const rango = Math.max(tMax - tMin, 24 * 60 * 60 * 1000);
  const pad = Math.max(rango * 0.06, 3 * 24 * 60 * 60 * 1000);
  const domMin = tMin - pad;
  const domMax = tMax + pad;

  const x = (t: number) => PLOT_LEFT + ((t - domMin) / (domMax - domMin)) * (PLOT_RIGHT - PLOT_LEFT);
  const yTope = maxValor * 1.18;
  const y = (v: number) => PLOT_BOTTOM - (v / yTope) * (PLOT_BOTTOM - PLOT_TOP);

  const meses = mesesEntre(new Date(domMin), new Date(domMax));
  // Si el primer tick que de verdad cambia de año cae fuera del área
  // visible (recortado por el padding), el primer tick VISIBLE queda sin
  // año — se fuerza el año en ese primero igual, para no dejar ambiguo de
  // qué año es el extremo izquierdo del gráfico.
  const ticksVisibles = meses
    .map((m, i) => ({
      t: m.getTime(),
      x: x(m.getTime()),
      conAnioSecuencial: i === 0 || m.getFullYear() !== meses[i - 1].getFullYear(),
    }))
    .filter((t) => t.x >= PLOT_LEFT - 1 && t.x <= PLOT_RIGHT + 1);
  const ticks = ticksVisibles.map((t, i) => ({
    x: t.x,
    texto: labelMes(new Date(t.t), i === 0 || t.conAnioSecuencial),
  }));

  const mostrarValorSiempre = puntos.length <= 6;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="dp-muted text-xs font-medium">{label}</p>
        {activo ? (
          <p className="dp-text-heading font-mono text-[11px]">
            {activo.valor} · {fmtFechaCorta(activo.fecha)} · {activo.mesociclo}
            {activo.objetivo && ` · ${activo.objetivo}`}
          </p>
        ) : (
          progreso && (
            <p
              className={`font-mono text-[11px] font-medium ${
                progreso.signo === "pos" ? "dp-text-brand" : progreso.signo === "neg" ? "dp-text-amber" : "dp-muted"
              }`}
            >
              {progreso.texto}
            </p>
          )
        )}
      </div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full"
        style={{ minWidth: 560 }}
        role="img"
        aria-label={`Evolución de ${label}`}
      >
        {/* Franjas de fase: desde cada medición hasta la siguiente (la última se extiende hasta el borde). */}
        {puntos.map((p, i) => {
          const siguiente = puntos[i + 1];
          const x0 = x(p.t);
          const x1 = siguiente ? x(siguiente.t) : PLOT_RIGHT;
          if (x1 <= x0) return null;
          const etiqueta = p.objetivo || p.mesociclo;
          // Ancho máximo en caracteres según el ancho real de la franja (a
          // ojo, ~5.5 unidades de viewBox por carácter a font-size 10) — una
          // franja angosta al borde no debe desbordar el texto fuera del
          // gráfico.
          const maxChars = Math.floor((x1 - x0 - 6) / 5.5);
          return (
            <g key={p.id}>
              <rect
                x={x0}
                y={PLOT_TOP}
                width={x1 - x0}
                height={PLOT_BOTTOM - PLOT_TOP}
                fill={i % 2 === 0 ? "rgba(0,0,0,0.035)" : "transparent"}
              />
              {etiqueta && maxChars >= 3 && (
                <text
                  x={(x0 + x1) / 2}
                  y={BAND_LABEL_Y}
                  textAnchor="middle"
                  className="dp-muted"
                  style={{ fontSize: 10 }}
                >
                  {etiqueta.length > maxChars ? `${etiqueta.slice(0, maxChars - 1)}…` : etiqueta}
                </text>
              )}
            </g>
          );
        })}

        {/* Línea entre mediciones — punteada si el salto es largo. */}
        {puntos.slice(1).map((p, i) => {
          const anterior = puntos[i];
          const diasGap = (p.t - anterior.t) / (24 * 60 * 60 * 1000);
          return (
            <line
              key={p.id}
              x1={x(anterior.t)}
              y1={y(anterior.valor)}
              x2={x(p.t)}
              y2={y(p.valor)}
              stroke="var(--dp-brand)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={diasGap > GAP_PUNTEADO_DIAS ? "6 4" : undefined}
            />
          );
        })}

        {/* Eje de meses. */}
        {ticks.map((t, i) => (
          <text key={i} x={t.x} y={TICK_Y} textAnchor="middle" className="dp-text-faint" style={{ fontSize: 10 }}>
            {t.texto}
          </text>
        ))}

        {/* Puntos — tocar/clickear muestra el detalle exacto arriba. */}
        {puntos.map((p) => {
          const esPr = p.valor === maxValor;
          const esUltimo = p === puntos[puntos.length - 1];
          const mostrarValor = mostrarValorSiempre || esPr || esUltimo;
          return (
            <g key={p.id} onClick={() => setActivoId((prev) => (prev === p.id ? null : p.id))} style={{ cursor: "pointer" }}>
              <title>{`${fmtFechaCorta(p.fecha)} · ${p.mesociclo}${p.objetivo ? ` · ${p.objetivo}` : ""}: ${p.valor}`}</title>
              <circle cx={x(p.t)} cy={y(p.valor)} r={5} fill="var(--dp-brand)" stroke="#fff" strokeWidth={2} />
              {esPr && (
                <text x={x(p.t)} y={y(p.valor) - 12} textAnchor="middle" className="dp-text-amber" style={{ fontSize: 11 }}>
                  ★
                </text>
              )}
              {mostrarValor && (
                <text
                  x={x(p.t)}
                  y={y(p.valor) - (esPr ? 24 : 12)}
                  textAnchor="middle"
                  className="dp-text-heading"
                  style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                >
                  {p.valor}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
