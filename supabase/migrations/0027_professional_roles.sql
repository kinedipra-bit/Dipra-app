-- Roles de profesional — hasta ahora cualquier cuenta con login tenía
-- acceso total. 'admin' (Nicolás, default para no sacarle acceso a nadie
-- que ya existía) puede todo; 'colaboradora' (Estefanía) gestiona
-- Plan/Tareas/Agenda/Sesiones/Evaluación pero no puede editar la Ficha
-- clínica del paciente, ni ver/tocar Finanzas o Ajustes (eso se aplica en
-- las acciones de servidor, ver src/lib/dipra/auth.ts).
alter table public.professionals
  add column role text not null default 'admin' check (role in ('admin', 'colaboradora'));
