-- ── ROLE ─────────────────────────────────────────────────────
-- Přechod ze tří rolí (client/manager/admin) na šest funkcí plus
-- klienta. Role určuje přístup, ne jen popisek.

-- 1. Uvolnit starou podmínku, jinak by přejmenování neprošlo.
alter table profiles drop constraint if exists profiles_role;

-- 2. Převod stávajících hodnot. Musí proběhnout PŘED novou podmínkou.
update profiles set role = 'ceo'     where role = 'admin';
update profiles set role = 'manazer' where role = 'manager';
update profiles set role = 'klient'  where role = 'client';

-- 3. Nová podmínka.
alter table profiles add constraint profiles_role
  check (role in ('ceo','vyvojar','manazer','marketing','scout','ucetni','klient'));

alter table profiles alter column role set default 'klient';

-- 4. Funkce pro RLS musí znát nové názvy. Bez security definer by se
--    politika níž zacyklila sama na sobě.
create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

-- Uživatel si nesmí přepsat vlastní roli. Bez toho by si kdokoli
-- nastavil 'ceo' jedním voláním API.
drop policy if exists "uprava vlastniho profilu" on profiles;
create policy "uprava vlastniho profilu" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = public.my_role());

-- 5. Účet vlastníka na roli vývojář. Uprav e-mail podle svého.
update profiles set role = 'vyvojar'
where id = (select id from auth.users where email = 'matuchovic@betim.cz');

-- Kontrola
select u.email, p.name, p.role
from auth.users u join profiles p on p.id = u.id
order by p.role;
