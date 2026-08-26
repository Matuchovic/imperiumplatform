-- Role uživatelů. Spusť po profiles.sql.

alter table profiles add column if not exists role text not null default 'client';

alter table profiles drop constraint if exists profiles_role;
alter table profiles add constraint profiles_role
  check (role in ('client', 'manager', 'admin'));

-- Role smí měnit jen service_role. Kdyby si ji uživatel mohl přepsat sám,
-- byla by celá autorizace k ničemu.
drop policy if exists "uprava vlastniho profilu" on profiles;
create policy "uprava vlastniho profilu" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from profiles where id = auth.uid()));

-- Povýšení prvního účtu na admina. E-mail si uprav.
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'matuchovic@betim.cz');
