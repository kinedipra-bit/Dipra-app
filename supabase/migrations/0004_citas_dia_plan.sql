-- Enlaza (opcionalmente) una cita de la agenda con un día puntual del plan
-- del cliente (ej. "Día 2"), para poder calcular descansos REALES entre
-- sesiones de alta intensidad sobre el mismo grupo muscular, en vez de un
-- aviso genérico basado solo en la estructura de la semana (que no tiene
-- fechas de calendario).
alter table public.citas
  add column dia_plan_label text;
