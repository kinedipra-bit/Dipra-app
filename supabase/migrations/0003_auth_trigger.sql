-- Crea automáticamente la fila en public.professionals cuando Nicolás (o
-- Tefi) invita/crea un usuario nuevo desde el dashboard de Supabase
-- (Authentication > Users > Add user / Invite). Así no hace falta un
-- flujo de registro propio: el alta de profesionales queda a cargo de
-- quien administra el proyecto de Supabase.

create function public.handle_new_professional()
returns trigger as $$
begin
  insert into public.professionals (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_professional();
