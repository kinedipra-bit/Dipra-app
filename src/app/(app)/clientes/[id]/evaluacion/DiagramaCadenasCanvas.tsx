"use client";

import { useEffect, useRef, useState } from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { subirDibujoCadenas, eliminarDibujoCadenas } from "./actions";

const W = 260;
const H = 360;
const COLOR_NORMAL = "#111827";
const COLOR_RESTRICCION = "#dc2626";

// Figura genérica de referencia (no es anatomía real, solo una guía para
// orientar el dibujo) — se redibuja cada vez que se limpia el lienzo.
function dibujarFigura(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(W / 2, 38, 17, 0, Math.PI * 2);
  ctx.moveTo(W / 2 - 14, 55);
  ctx.lineTo(W / 2 - 30, 148);
  ctx.lineTo(W / 2 + 30, 148);
  ctx.lineTo(W / 2 + 14, 55);
  ctx.closePath();
  ctx.moveTo(W / 2 - 30, 148);
  ctx.lineTo(W / 2 - 26, 182);
  ctx.lineTo(W / 2 + 26, 182);
  ctx.lineTo(W / 2 + 30, 148);
  ctx.closePath();
  ctx.moveTo(W / 2 - 20, 182);
  ctx.lineTo(W / 2 - 16, 340);
  ctx.moveTo(W / 2 + 20, 182);
  ctx.lineTo(W / 2 + 16, 340);
  ctx.moveTo(W / 2 - 30, 62);
  ctx.lineTo(W / 2 - 46, 138);
  ctx.moveTo(W / 2 + 30, 62);
  ctx.lineTo(W / 2 + 46, 138);
  ctx.stroke();
}

type Punto = { x: number; y: number };
type Trazo = { color: string; puntos: Punto[] };

function redibujarTodo(ctx: CanvasRenderingContext2D, trazos: Trazo[]) {
  dibujarFigura(ctx);
  trazos.forEach((t) => {
    if (t.puntos.length < 2) return;
    ctx.strokeStyle = t.color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(t.puntos[0].x, t.puntos[0].y);
    t.puntos.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  });
}

/**
 * Mini pizarra para dibujar a mano un diagnóstico de cadenas sobre una
 * figura genérica de referencia — vive junto a "Movilidad por esferas"
 * (cada patrón evaluado puede tener su propio dibujo). Se exporta a PNG en
 * el navegador y se sube al bucket "diagramas" (ver subirDibujoCadenas).
 */
export function DiagramaCadenasCanvas({
  clienteId,
  entryId,
  dibujoPath,
  onChange,
}: {
  clienteId: string;
  entryId: string;
  dibujoPath: string | null;
  onChange: (path: string | null) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [color, setColor] = useState<typeof COLOR_NORMAL | typeof COLOR_RESTRICCION>(COLOR_NORMAL);
  const [guardando, setGuardando] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trazandoRef = useRef(false);
  const trazosRef = useRef<Trazo[]>([]);

  const urlDibujo = dibujoPath
    ? createBrowserClient().storage.from("diagramas").getPublicUrl(dibujoPath).data.publicUrl
    : null;

  useEffect(() => {
    if (!editando) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    trazosRef.current = [];
    if (urlDibujo) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => ctx.drawImage(img, 0, 0, W, H);
      img.src = urlDibujo;
    } else {
      dibujarFigura(ctx);
    }
  }, [editando, urlDibujo]);

  const posicion = (e: React.PointerEvent<HTMLCanvasElement>): Punto => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };

  const empezarTrazo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    trazandoRef.current = true;
    trazosRef.current = [...trazosRef.current, { color, puntos: [posicion(e)] }];
  };

  const seguirTrazo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!trazandoRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const trazoActual = trazosRef.current[trazosRef.current.length - 1];
    trazoActual.puntos.push(posicion(e));
    redibujarTodo(ctx, trazosRef.current);
  };

  const terminarTrazo = () => {
    trazandoRef.current = false;
  };

  const deshacer = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    trazosRef.current = trazosRef.current.slice(0, -1);
    redibujarTodo(ctx, trazosRef.current);
  };

  const limpiar = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    trazosRef.current = [];
    dibujarFigura(ctx);
  };

  const guardar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setGuardando(true);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setGuardando(false);
        return;
      }
      const formData = new FormData();
      formData.set("dibujo", new File([blob], "dibujo.png", { type: "image/png" }));
      const path = await subirDibujoCadenas(clienteId, entryId, formData);
      onChange(path);
      setGuardando(false);
      setEditando(false);
    }, "image/png");
  };

  const borrar = () => {
    if (!dibujoPath || !confirm("¿Eliminar este dibujo?")) return;
    void eliminarDibujoCadenas(clienteId, entryId, dibujoPath);
    onChange(null);
  };

  if (!editando) {
    return (
      <div className="flex flex-col gap-1.5">
        {urlDibujo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlDibujo} alt="Diagnóstico de cadenas dibujado" className="w-32 rounded-lg border border-black/10" />
        ) : (
          <p className="dp-muted text-[11px]">Sin dibujo todavía.</p>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditando(true)} className="dp-text-brand text-[11px] font-medium hover:underline">
            {urlDibujo ? "✎ Editar dibujo" : "+ Dibujar diagnóstico de cadenas"}
          </button>
          {urlDibujo && (
            <button type="button" onClick={borrar} className="dp-muted hover:dp-alert text-[11px]">
              ✕ Borrar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={empezarTrazo}
        onPointerMove={seguirTrazo}
        onPointerUp={terminarTrazo}
        onPointerLeave={terminarTrazo}
        className="touch-none rounded-lg border border-black/10"
        style={{ width: W, height: H }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setColor(COLOR_NORMAL)}
          title="Trazo normal"
          className={`h-5 w-5 rounded-full border-2 ${color === COLOR_NORMAL ? "border-black/40" : "border-transparent"}`}
          style={{ backgroundColor: COLOR_NORMAL }}
        />
        <button
          type="button"
          onClick={() => setColor(COLOR_RESTRICCION)}
          title="Marcar restricción/compensación"
          className={`h-5 w-5 rounded-full border-2 ${color === COLOR_RESTRICCION ? "border-black/40" : "border-transparent"}`}
          style={{ backgroundColor: COLOR_RESTRICCION }}
        />
        <button type="button" onClick={deshacer} className="dp-muted text-[11px] hover:underline">
          Deshacer
        </button>
        <button type="button" onClick={limpiar} className="dp-muted text-[11px] hover:underline">
          Limpiar
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="dp-bg-brand ml-auto rounded-lg px-3 py-1 text-[11px] font-medium text-white disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar dibujo"}
        </button>
        <button type="button" onClick={() => setEditando(false)} className="dp-muted text-[11px] hover:underline">
          Cancelar
        </button>
      </div>
    </div>
  );
}
