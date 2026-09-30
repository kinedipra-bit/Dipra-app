-- Fecha de nacimiento del cliente — para calcular su edad automáticamente
-- y avisar cuando se acerca su cumpleaños. Nullable: los clientes ya
-- cargados no la tienen todavía.
alter table public.clients
  add column fecha_nacimiento date;
