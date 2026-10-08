"use client";

import { useState, useTransition } from "react";
import type { ClienteServicio, Pago, Servicio } from "@/lib/dipra/types";
import { asignarServicio, crearPago, eliminarPago, finalizarClienteServicio } from "@/app/(app)/finanzas/actions";

function fmtMonto(n: number) {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

function fmtFecha(f: string) {
  const d = new Date(f + "T00:00:00");
  return isNaN(d.getTime()) ? f : d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "2-digit" });
}

function periodoActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

type ClienteServicioConNombre = ClienteServicio & { servicioNombre: string; servicioTipo: "sesion" | "plan" };

export function ClienteFinanzasView({
  clienteId,
  serviciosActivos,
  clienteServiciosIniciales,
  pagosIniciales,
}: {
  clienteId: string;
  serviciosActivos: Servicio[];
  clienteServiciosIniciales: ClienteServicioConNombre[];
  pagosIniciales: Pago[];
}) {
  const [clienteServicios, setClienteServicios] = useState(clienteServiciosIniciales);
  const [pagos, setPagos] = useState(pagosIniciales);
  const [pending, startTransition] = useTransition();

  const [mostrarAsignar, setMostrarAsignar] = useState(false);
  const [servicioId, setServicioId] = useState("");
  const [precioAcordado, setPrecioAcordado] = useState("");
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0, 10));

  const [mostrarPago, setMostrarPago] = useState(false);
  const [clienteServicioId, setClienteServicioId] = useState("");
  const [montoPago, setMontoPago] = useState("");
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
  const [metodoPago, setMetodoPago] = useState("");
  const [periodoPago, setPeriodoPago] = useState(periodoActual());
  const [comentarioPago, setComentarioPago] = useState("");

  const activos = clienteServicios.filter((cs) => cs.activo);
  const periodosCubiertos = new Set(
    pagos.filter((p) => p.cliente_servicio_id).map((p) => `${p.cliente_servicio_id}::${p.periodo}`)
  );

  const elegirServicio = (id: string) => {
    setServicioId(id);
    const s = serviciosActivos.find((x) => x.id === id);
    setPrecioAcordado(s ? String(s.precio) : "");
  };

  const asignar = () => {
    if (!servicioId) return;
    startTransition(async () => {
      const creado = await asignarServicio(clienteId, {
        servicioId,
        precioAcordado: Number(precioAcordado) || 0,
        fechaInicio,
      });
      const servicio = serviciosActivos.find((s) => s.id === servicioId);
      setClienteServicios((prev) => [
        { ...creado, servicioNombre: servicio?.nombre ?? "—", servicioTipo: servicio?.tipo ?? "sesion" },
        ...prev,
      ]);
      setServicioId("");
      setPrecioAcordado("");
      setMostrarAsignar(false);
    });
  };

  const finalizar = (cs: ClienteServicioConNombre) => {
    if (!window.confirm(`¿Terminar "${cs.servicioNombre}" para este cliente?`)) return;
    startTransition(async () => {
      await finalizarClienteServicio(clienteId, cs.id);
      setClienteServicios((prev) =>
        prev.map((x) => (x.id === cs.id ? { ...x, activo: false, fecha_fin: new Date().toISOString().slice(0, 10) } : x))
      );
    });
  };

  const abrirPagoRapido = (cs: ClienteServicioConNombre) => {
    setClienteServicioId(cs.id);
    setMontoPago(String(cs.precio_acordado));
    setPeriodoPago(periodoActual());
    setFechaPago(new Date().toISOString().slice(0, 10));
    setMetodoPago("");
    setComentarioPago("");
    setMostrarPago(true);
  };

  const registrarPago = () => {
    if (!montoPago) return;
    startTransition(async () => {
      const creado = await crearPago(clienteId, {
        clienteServicioId: clienteServicioId || null,
        monto: Number(montoPago) || 0,
        fecha: fechaPago,
        metodo: metodoPago.trim(),
        periodo: periodoPago.trim(),
        comentario: comentarioPago.trim(),
      });
      setPagos((prev) => [creado, ...prev]);
      setMostrarPago(false);
      setClienteServicioId("");
      setMontoPago("");
      setComentarioPago("");
    });
  };

  const borrarPago = (id: string) => {
    if (!window.confirm("¿Eliminar este pago?")) return;
    startTransition(async () => {
      await eliminarPago(clienteId, id);
      setPagos((prev) => prev.filter((p) => p.id !== id));
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="dp-surface rounded-2xl p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="dp-text-heading font-medium">Servicios y planes</h2>
          <button
            type="button"
            onClick={() => setMostrarAsignar((v) => !v)}
            className="dp-text-brand rounded-lg border border-dashed border-black/15 px-2.5 py-1 text-xs font-medium"
          >
            + Asignar servicio
          </button>
        </div>

        {mostrarAsignar && (
          <div className="dp-bg-faint mb-4 flex flex-col gap-2 rounded-lg p-3">
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Servicio</span>
                <select
                  value={servicioId}
                  onChange={(e) => elegirServicio(e.target.value)}
                  className="rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none focus:dp-border-brand"
                >
                  <option value="">Elegí…</option>
                  {serviciosActivos.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} ({s.tipo === "plan" ? "plan" : "sesión"})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Precio acordado</span>
                <input
                  type="number"
                  value={precioAcordado}
                  onChange={(e) => setPrecioAcordado(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none focus:dp-border-brand"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Desde</span>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="rounded-lg border border-black/10 px-2 py-1.5 text-sm font-mono outline-none focus:dp-border-brand"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={asignar}
              disabled={!servicioId || pending}
              className="dp-bg-brand w-fit rounded-lg px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Asignar
            </button>
          </div>
        )}

        {activos.length === 0 ? (
          <p className="dp-muted text-sm">Este cliente no tiene ningún servicio o plan asignado todavía.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {activos.map((cs) => {
              const cubierto = periodosCubiertos.has(`${cs.id}::${periodoActual()}`);
              return (
                <div key={cs.id} className="dp-bg-faint flex items-center justify-between rounded-lg px-3 py-2">
                  <div>
                    <p className="dp-text-heading text-sm font-medium">{cs.servicioNombre}</p>
                    <p className="dp-muted text-xs">
                      {fmtMonto(cs.precio_acordado)}
                      {cs.servicioTipo === "plan" ? " /mes" : ""} · desde {fmtFecha(cs.fecha_inicio)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cs.servicioTipo === "plan" &&
                      (cubierto ? (
                        <span className="dp-bg-brand-soft dp-text-brand rounded-full px-2 py-0.5 text-[11px] font-medium">
                          ✓ Pagado este mes
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => abrirPagoRapido(cs)}
                          className="dp-bg-amber-soft dp-text-amber rounded-full px-2 py-0.5 text-[11px] font-medium hover:underline"
                        >
                          Marcar pagado este mes
                        </button>
                      ))}
                    <button
                      type="button"
                      onClick={() => finalizar(cs)}
                      className="dp-muted hover:dp-alert text-xs"
                    >
                      Terminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="dp-surface rounded-2xl p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="dp-text-heading font-medium">Pagos</h2>
          <button
            type="button"
            onClick={() => {
              setClienteServicioId("");
              setMontoPago("");
              setPeriodoPago("");
              setFechaPago(new Date().toISOString().slice(0, 10));
              setMetodoPago("");
              setComentarioPago("");
              setMostrarPago((v) => !v);
            }}
            className="dp-text-brand rounded-lg border border-dashed border-black/15 px-2.5 py-1 text-xs font-medium"
          >
            + Registrar pago
          </button>
        </div>

        {mostrarPago && (
          <div className="dp-bg-faint mb-4 flex flex-col gap-2 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Vincular a (opcional)</span>
                <select
                  value={clienteServicioId}
                  onChange={(e) => setClienteServicioId(e.target.value)}
                  className="rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none focus:dp-border-brand"
                >
                  <option value="">Pago suelto, sin plan</option>
                  {activos.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.servicioNombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Monto</span>
                <input
                  type="number"
                  value={montoPago}
                  onChange={(e) => setMontoPago(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none focus:dp-border-brand"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Fecha</span>
                <input
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  className="rounded-lg border border-black/10 px-2 py-1.5 text-sm font-mono outline-none focus:dp-border-brand"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Método</span>
                <input
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  placeholder="Ej. Transferencia, efectivo…"
                  className="rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none focus:dp-border-brand"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Período (opcional)</span>
                <input
                  value={periodoPago}
                  onChange={(e) => setPeriodoPago(e.target.value)}
                  placeholder="Ej. 2026-10"
                  className="rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none focus:dp-border-brand"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Comentario (opcional)</span>
                <input
                  value={comentarioPago}
                  onChange={(e) => setComentarioPago(e.target.value)}
                  className="rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none focus:dp-border-brand"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={registrarPago}
              disabled={!montoPago || pending}
              className="dp-bg-brand w-fit rounded-lg px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Guardar pago
            </button>
          </div>
        )}

        {pagos.length === 0 ? (
          <p className="dp-muted text-sm">Todavía no hay pagos registrados para este cliente.</p>
        ) : (
          <div className="flex flex-col divide-y divide-black/5">
            {pagos.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="dp-text-heading font-mono text-sm font-semibold">{fmtMonto(p.monto)}</p>
                  <p className="dp-muted text-xs">
                    {fmtFecha(p.fecha)}
                    {p.metodo ? ` · ${p.metodo}` : ""}
                    {p.periodo ? ` · período ${p.periodo}` : ""}
                    {p.comentario ? ` · ${p.comentario}` : ""}
                  </p>
                </div>
                <button type="button" onClick={() => borrarPago(p.id)} className="dp-muted hover:dp-alert text-xs">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
