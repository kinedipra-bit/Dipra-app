-- RUT del cliente (para emitir boletas) — nullable, los clientes ya
-- cargados no lo tienen todavía.
alter table public.clients
  add column rut text;

-- Link al portal de boletas del SII de Nicolás — un solo valor por
-- profesional (no por cliente), para tener un acceso directo desde la
-- ficha y emitir la boleta a mano con los datos del cliente ya a la vista.
alter table public.professionals
  add column link_boletas_sii text;
