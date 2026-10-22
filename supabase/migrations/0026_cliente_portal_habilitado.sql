-- Marca manual "este cliente no usa el portal" — para clientes que
-- entrenan personalizado presencial y a quienes Nicolás nunca les va a
-- compartir el plan por el portal. Default true para no cambiar nada de
-- los clientes ya cargados. Con esto en false, Plan/Tareas dejan de
-- mostrar los avisos de "el cliente todavía no ve esta versión" /
-- "el cliente ve otra semana" — ese aviso no tiene sentido para alguien a
-- quien nunca se le va a compartir nada.
alter table public.clients
  add column portal_habilitado boolean not null default true;
