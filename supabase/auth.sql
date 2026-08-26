-- Účty pro vlastní přihlašování (scrypt + JWT v cookie).
-- Spusť po schema.sql.
--
-- Pozn.: schema.sql počítá s tabulkou profiles navázanou na auth.users
-- pro případ přechodu na Supabase Auth. Do té doby platí tahle tabulka.

create table if not exists app_users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  password_hash  text not null,          -- formát salt:hash (scrypt)
  name           text not null,
  birth_date     date not null,
  plan           text not null default 'start',
  bankroll       numeric(12,2) not null default 0,
  goal           numeric(12,2) not null default 0,
  unit_pct       numeric(4,2)  not null default 2,
  marketing_ok   boolean not null default false,
  terms_at       timestamptz not null,   -- kdy odsouhlasil podmínky
  created_at     timestamptz not null default now()
);

create index if not exists app_users_email on app_users (lower(email));

-- Ověření věku na úrovni databáze, ne jen ve formuláři.
alter table app_users drop constraint if exists app_users_adult;
alter table app_users add constraint app_users_adult
  check (birth_date <= (current_date - interval '18 years'));

-- RLS zapnuté bez politik → anon klíč nevidí ani řádek.
-- Hesla čte výhradně server přes service_role.
alter table app_users enable row level security;
