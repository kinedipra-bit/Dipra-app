-- Para las alertas de programación del profesional: distinguir sesiones
-- registradas por el cliente desde el portal (vs. cargadas por el
-- profesional en una atención presencial) y si ya fueron revisadas.
--
-- `revisada` arranca en true por default a propósito: todas las sesiones
-- ya existentes fueron cargadas por el profesional (no hay "revisar" nada
-- ahí), y una sesión nueva cargada por el profesional tampoco necesita
-- revisión — la app la inserta explícita en true. Solo crearSesionPortal
-- inserta revisada=false, que es el único caso real a destacar.
alter table public.sesiones
  add column registrada_por_cliente boolean not null default false,
  add column revisada boolean not null default true;
