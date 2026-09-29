-- Agrega el estado "No asistió" a las citas — antes solo existía
-- "Cancelada" para citas que no se hicieron, sin distinguir si se avisó
-- con anticipación o si la persona simplemente no llegó. Sirve además para
-- la alerta de "citas sin seguimiento" (ver alertasProgramacion.ts): una
-- cita marcada no_asistio ya no cuenta como pendiente de evolución.
alter table public.citas drop constraint citas_estado_check;
alter table public.citas
  add constraint citas_estado_check
  check (estado in ('pendiente', 'confirmada', 'alerta', 'cancelada', 'no_asistio'));
