-- Přechod na Supabase Auth. Spusť PO schema.sql.
-- app_users se ruší — účty žijí v auth.users.

drop table if exists app_users;

alter table profiles add column if not exists birth_date   date;
alter table profiles add column if not exists marketing_ok boolean not null default false;
alter table profiles add column if not exists terms_at     timestamptz;

-- Věk hlídá databáze, ne jen formulář. NULL je povolený kvůli účtům
-- založeným ručně přes dashboard, kde datum narození nikdo nezadával.
alter table profiles drop constraint if exists profiles_adult;
alter table profiles add constraint profiles_adult
  check (birth_date is null or birth_date <= (current_date - interval '18 years'));

-- Profil vzniká automaticky s účtem. Bez toho by se po registraci
-- uživatel přihlásil do systému, který o něm nic neví.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, birth_date, marketing_ok, terms_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'birth_date', '')::date,
    coalesce((new.raw_user_meta_data->>'marketing_ok')::boolean, false),
    now()
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Doplnit profily účtům, které vznikly dřív než trigger.
insert into public.profiles (id, name, terms_at)
select u.id, coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)), now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Vlastní tikety teď auth.uid() zná, takže politika dává smysl.
drop policy if exists "vlastni tikety" on tickets;
create policy "vlastni tikety" on tickets
  for select using (auth.uid() = user_id);
