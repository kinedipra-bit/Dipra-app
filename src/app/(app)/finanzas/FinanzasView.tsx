"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Gasto, Servicio } from "@/lib/dipra/types";
import { archivarServicio, crearGasto, crearServicio, eliminarGasto } from "./actions";
import type { ClienteServicioConNombres, PagoConCliente } from "./page";

function fmtMonto(n: number) {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

function fmtFecha(f: string) {
  const d = new Date(f + "T00:00:00");
  return isNaN(d.getTime()) ? f : d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "2-digit" });
}

type Vista = "resumen" | "servicios" | "pagos" | "gastos";

export function FinanzasView({
  serviciosIniciales,
  clienteServicios,
  pendientesDePago,
  ingresosMes,
  gastosMes,
  periodoActual,
  pagosIniciales,
  gastosIniciales,
  clientes,
}: {
  serviciosIniciales: Servicio[];
  clienteServicios: ClienteServicioConNombres[];
  pendientesDePago: ClienteServicioConNombres[];
  ingresosMes: number;
  gastosMes: number;
  periodoActual: string;
  pagosIniciales: PagoConCliente[];
  gastosIniciales: Gasto[];
  clientes: { id: string; nombre: string }[];
}) {
  const [vista, setVista] = useState<Vista>("resumen");
  const [servicios, setServicios] = useState(serviciosIniciales);
  const [gastos, setGastos] = useState(gastosIniciales);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold dp-text-heading">Finanzas</h1>

      <div className="flex items-center gap-1.5">
        {(
          [
            { id: "resumen", label: "Resumen" },
            { id: "servicios", label: "Servicios" },
            { id: "pagos", label: "Pagos" },
            { id: "gastos", label: "Gastos" },
          ] as const
        ).map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVista(v.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              vista === v.id ? "dp-bg-brand text-white" : "dp-bg-faint dp-body"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {vista === "resumen" && (
        <ResumenTab
          ingresosMes={ingresosMes}
          gastosMes={gastosMes}
          periodoActual={periodoActual}
          pendientesDePago={pendientesDePago}
          clienteServicios={clienteServicios}
        />
      )}

      {vista === "servicios" && <ServiciosTab servicios={servicios} setServicios={setServicios} />}

      {vista === "pagos" && <PagosTab pagos={pagosIniciales} clientes={clientes} />}

      {vista === "gastos" && <GastosTab gastos={gastos} setGastos={setGastos} />}
    </div>
  );
}

function ResumenTab({
  ingresosMes,
  gastosMes,
  periodoActual,
  pendientesDePago,
  clienteServicios,
}: {
  ingresosMes: number;
  gastosMes: number;
  periodoActual: string;
  pendientesDePago: ClienteServicioConNombres[];
  clienteServicios: ClienteServicioConNombres[];
}) {
  const neto = ingresosMes - gastosMes;
  return (
    <div className="flex flex-col gap-5">
      <p className="dp-muted -mb-2 text-xs">Período {periodoActual}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="dp-surface rounded-2xl p-5 shadow-sm">
          <p className="dp-muted text-sm">Ingresos este mes</p>
          <p className="dp-text-brand mt-1 text-2xl font-semibold">{fmtMonto(ingresosMes)}</p>
        </div>
        <div className="dp-surface rounded-2xl p-5 shadow-sm">
          <p className="dp-muted text-sm">Gastos este mes</p>
          <p className="dp-alert mt-1 text-2xl font-semibold">{fmtMonto(gastosMes)}</p>
        </div>
        <div className="dp-surface rounded-2xl p-5 shadow-sm">
          <p className="dp-muted text-sm">Neto</p>
          <p className={`mt-1 text-2xl font-semibold ${neto >= 0 ? "dp-text-brand" : "dp-alert"}`}>{fmtMonto(neto)}</p>
        </div>
      </div>

      <div className="dp-surface rounded-2xl p-5 shadow-sm">
        <h2 className="dp-text-heading mb-1 font-medium">Pendientes de pago este mes</h2>
        <p className="dp-muted mb-3 text-xs">Clientes con un plan activo sin un pago registrado para este período.</p>
        {pendientesDePago.length === 0 ? (
          <p className="dp-muted text-sm">Todos los planes activos tienen su pago de este mes registrado.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5">
            {pendientesDePago.map((cs) => (
              <li key={cs.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/clientes/${cs.client_id}/finanzas`} className="dp-text-brand hover:underline">
                  {cs.clienteNombre}
                </Link>
                <span className="dp-muted text-xs">
                  {cs.servicioNombre} · {fmtMonto(cs.precio_acordado)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="dp-surface rounded-2xl p-5 shadow-sm">
        <h2 className="dp-text-heading mb-3 font-medium">Planes y servicios activos</h2>
        {clienteServicios.length === 0 ? (
          <p className="dp-muted text-sm">Todavía no hay servicios asignados a ningún cliente.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5">
            {clienteServicios.map((cs) => (
              <li key={cs.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/clientes/${cs.client_id}/finanzas`} className="dp-text-brand hover:underline">
                  {cs.clienteNombre}
                </Link>
                <span className="dp-muted text-xs">
                  {cs.servicioNombre} · {fmtMonto(cs.precio_acordado)}
                  {cs.servicioTipo === "plan" ? " /mes" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ServiciosTab({
  servicios,
  setServicios,
}: {
  servicios: Servicio[];
  setServicios: React.Dispatch<React.SetStateAction<Servicio[]>>;
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"sesion" | "plan">("sesion");
  const [precio, setPrecio] = useState("");
  const [periodicidad, setPeriodicidad] = useState("mensual");
  const [descripcion, setDescripcion] = useState("");
  const [pending, startTransition] = useTransition();

  const crear = () => {
    if (!nombre.trim()) return;
    startTransition(async () => {
      const creado = await crearServicio({
        nombre: nombre.trim(),
        tipo,
        precio: Number(precio) || 0,
        periodicidad: tipo === "plan" ? periodicidad : "",
        descripcion: descripcion.trim(),
      });
      setServicios((prev) => [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNombre("");
      setPrecio("");
      setDescripcion("");
      setMostrarForm(false);
    });
  };

  const toggleArchivar = (s: Servicio) => {
    setServicios((prev) => prev.map((x) => (x.id === s.id ? { ...x, activo: !x.activo } : x)));
    void archivarServicio(s.id, !s.activo);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setMostrarForm((v) => !v)}
          className="dp-bg-brand rounded-xl px-3.5 py-2 text-sm font-medium text-white"
        >
          + Nuevo servicio
        </button>
      </div>

      {mostrarForm && (
        <div className="dp-surface flex flex-col gap-3 rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">Nombre</span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Kinesiología individual"
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">Tipo</span>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as "sesion" | "plan")}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
              >
                <option value="sesion">Sesión suelta</option>
                <option value="plan">Plan periódico</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">Precio (CLP)</span>
              <input
                type="number"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
              />
            </label>
            {tipo === "plan" && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Periodicidad</span>
                <input
                  value={periodicidad}
                  onChange={(e) => setPeriodicidad(e.target.value)}
                  placeholder="Ej. mensual"
                  className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
                />
              </label>
            )}
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Descripción (opcional)</span>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. 3 sesiones por semana, incluye evaluación mensual"
              className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
            />
          </label>
          <button
            type="button"
            onClick={crear}
            disabled={!nombre.trim() || pending}
            className="dp-bg-brand w-fit rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {pending ? "Guardando…" : "Guardar servicio"}
          </button>
        </div>
      )}

      <div className="dp-surface overflow-hidden rounded-2xl shadow-sm">
        {servicios.length === 0 ? (
          <p className="dp-muted p-6 text-center text-sm">Todavía no hay servicios en el catálogo.</p>
        ) : (
          <div className="divide-y divide-black/5">
            {servicios.map((s) => (
              <div key={s.id} className={`flex items-center justify-between p-4 ${!s.activo ? "opacity-50" : ""}`}>
                <div>
                  <p className="dp-text-heading text-sm font-medium">
                    {s.nombre} {!s.activo && <span className="dp-muted text-xs">(archivado)</span>}
                  </p>
                  <p className="dp-muted text-xs">
                    {s.tipo === "plan" ? `Plan · ${s.periodicidad || "periódico"}` : "Sesión suelta"} ·{" "}
                    {fmtMonto(s.precio)}
                    {s.descripcion ? ` · ${s.descripcion}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleArchivar(s)}
                  className="dp-muted text-xs hover:dp-text-brand"
                >
                  {s.activo ? "Archivar" : "Reactivar"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PagosTab({ pagos, clientes }: { pagos: PagoConCliente[]; clientes: { id: string; nombre: string }[] }) {
  return (
    <div className="dp-surface overflow-hidden rounded-2xl shadow-sm">
      <p className="dp-muted border-b border-black/5 p-4 text-xs">
        Los pagos se registran desde la ficha de cada cliente (pestaña &quot;Finanzas&quot;) — acá se ven los últimos
        30 en orden cronológico.
      </p>
      {pagos.length === 0 ? (
        <p className="dp-muted p-6 text-center text-sm">Todavía no hay pagos registrados.</p>
      ) : (
        <div className="divide-y divide-black/5">
          {pagos.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <Link
                  href={`/clientes/${p.client_id}/finanzas`}
                  className="dp-text-brand font-medium hover:underline"
                >
                  {p.clienteNombre}
                </Link>
                <p className="dp-muted text-xs">
                  {fmtFecha(p.fecha)}
                  {p.metodo ? ` · ${p.metodo}` : ""}
                  {p.periodo ? ` · período ${p.periodo}` : ""}
                  {p.comentario ? ` · ${p.comentario}` : ""}
                </p>
              </div>
              <span className="dp-text-heading font-mono text-sm font-semibold">{fmtMonto(p.monto)}</span>
            </div>
          ))}
        </div>
      )}
      {clientes.length === 0 && <p className="dp-muted p-4 text-xs">Todavía no hay clientes cargados.</p>}
    </div>
  );
}

function GastosTab({
  gastos,
  setGastos,
}: {
  gastos: Gasto[];
  setGastos: React.Dispatch<React.SetStateAction<Gasto[]>>;
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [categoria, setCategoria] = useState("");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [pending, startTransition] = useTransition();
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const crear = () => {
    if (!categoria.trim() || !monto) return;
    startTransition(async () => {
      const creado = await crearGasto({ fecha, categoria: categoria.trim(), monto: Number(monto) || 0, descripcion: descripcion.trim() });
      setGastos((prev) => [creado, ...prev]);
      setCategoria("");
      setMonto("");
      setDescripcion("");
      setMostrarForm(false);
    });
  };

  const borrar = (id: string) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    setEliminandoId(id);
    startTransition(async () => {
      await eliminarGasto(id);
      setGastos((prev) => prev.filter((g) => g.id !== id));
      setEliminandoId(null);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setMostrarForm((v) => !v)}
          className="dp-bg-brand rounded-xl px-3.5 py-2 text-sm font-medium text-white"
        >
          + Nuevo gasto
        </button>
      </div>

      {mostrarForm && (
        <div className="dp-surface flex flex-col gap-3 rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">Fecha</span>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-mono outline-none focus:dp-border-brand"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">Categoría</span>
              <input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ej. Arriendo, materiales…"
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">Monto (CLP)</span>
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Descripción (opcional)</span>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
            />
          </label>
          <button
            type="button"
            onClick={crear}
            disabled={!categoria.trim() || !monto || pending}
            className="dp-bg-brand w-fit rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {pending ? "Guardando…" : "Guardar gasto"}
          </button>
        </div>
      )}

      <div className="dp-surface overflow-hidden rounded-2xl shadow-sm">
        {gastos.length === 0 ? (
          <p className="dp-muted p-6 text-center text-sm">Todavía no hay gastos registrados.</p>
        ) : (
          <div className="divide-y divide-black/5">
            {gastos.map((g) => (
              <div key={g.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="dp-text-heading font-medium">{g.categoria}</p>
                  <p className="dp-muted text-xs">
                    {fmtFecha(g.fecha)}
                    {g.descripcion ? ` · ${g.descripcion}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="dp-alert font-mono text-sm font-semibold">{fmtMonto(g.monto)}</span>
                  <button
                    type="button"
                    onClick={() => borrar(g.id)}
                    disabled={pending && eliminandoId === g.id}
                    className="dp-muted text-xs hover:dp-alert disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
