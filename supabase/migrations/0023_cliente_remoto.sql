-- Marca manual "cliente 100% remoto" — informativa, para destacar en el
-- listado a quienes Nicolás solo planifica (nunca atiende presencial).
-- No confundir con esClienteRemoto() en alertasProgramacion.ts, que es una
-- inferencia a partir de si el cliente registró sesiones desde su portal.
alter table public.clients
  add column remoto boolean not null default false;
