-- ============================================================
-- BETIMPERIUM — kompletní databáze
--
-- Spusť celé v Supabase → SQL Editor. Skript je psaný tak, aby
-- šel pustit opakovaně: nic nepřepíše, co už existuje, a nic
-- nesmaže, co obsahuje data.
--
-- Pořadí uvnitř souboru je závazné — profily musí vzniknout dřív
-- než politiky, které se na ně odkazují.
-- ============================================================


-- ── 1. PROFILY ───────────────────────────────────────────────
-- Navázané na auth.users. Účty spravuje Supabase Auth, tady žijí
-- jen doplňkové údaje.

create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,
  name         text not null default '',
  plan         text not null default 'start',
  bankroll     numeric(12,2) not null default 0,
  goal         numeric(12,2) not null default 0,
  unit_pct     numeric(4,2)  not null default 2,
  created_at   timestamptz not null default now()
);

alter table profiles add column if not exists birth_date   date;
alter table profiles add column if not exists marketing_ok boolean not null default false;
alter table profiles add column if not exists terms_at     timestamptz;
alter table profiles add column if not exists role         text not null default 'client';

-- Věk hlídá databáze, ne jen formulář. NULL je povolený kvůli účtům
-- založeným ručně přes dashboard, kde datum narození nikdo nezadával.
alter table profiles drop constraint if exists profiles_adult;
alter table profiles add constraint profiles_adult
  check (birth_date is null or birth_date <= (current_date - interval '18 years'));

alter table profiles drop constraint if exists profiles_role;
alter table profiles add constraint profiles_role
  check (role in ('client', 'manager', 'admin'));

-- Stará tabulka z doby vlastního přihlašování. Účty jsou v auth.users.
drop table if exists app_users;


-- ── 2. ZALOŽENÍ PROFILU S ÚČTEM ──────────────────────────────
-- Bez tohoto triggeru se uživatel přihlásí do systému,
-- který o něm nic neví.

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


-- ── 3. SNÍMKY KURZŮ ──────────────────────────────────────────
-- Roste nejrychleji ze všech tabulek. Dělená po dnech, ať jde
-- starší oddíly odpojit bez mazání po řádcích.

create table if not exists odds_snapshots (
  id           bigserial,
  event_id     text not null,
  league       text not null,
  bookmaker    text not null,
  market       text not null,
  selection    text not null,
  price        numeric(8,3) not null,
  captured_at  timestamptz not null default now(),
  primary key (id, captured_at)
) partition by range (captured_at);

create index if not exists odds_lookup
  on odds_snapshots (event_id, bookmaker, captured_at desc);

-- Oddíly na 60 dní dopředu. Bez nich zápis do dělené tabulky selže.
-- Spusť znovu, než dojdou.
do $$
declare d date := current_date;
begin
  for i in 0..60 loop
    execute format(
      'create table if not exists odds_snapshots_%s
         partition of odds_snapshots
         for values from (%L) to (%L)',
      to_char(d + i, 'YYYYMMDD'), d + i, d + i + 1
    );
  end loop;
end $$;


-- ── 4. KANDIDÁTI Z MOTORU ────────────────────────────────────

create table if not exists candidates (
  id              uuid primary key default gen_random_uuid(),
  event_id        text not null,
  league          text not null,
  event_name      text not null,
  market          text not null,
  selection       text not null,
  sharp_odds      numeric(8,3) not null,
  fair_prob       numeric(6,5) not null,
  offered_odds    numeric(8,3) not null,
  offered_by      text not null,
  threshold_odds  numeric(8,3) not null,
  ev              numeric(6,4) not null,
  units           numeric(4,1) not null,
  commence_at     timestamptz not null,
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected','expired')),
  blocked_reason  text,
  created_at      timestamptz not null default now()
);

create index if not exists candidates_open
  on candidates (status, created_at desc);


-- ── 5. SCHVÁLENÍ ─────────────────────────────────────────────
-- Nemazatelná stopa: kdo, kdy a jaký kurz v tu chvíli viděl.

create table if not exists approvals (
  id            uuid primary key default gen_random_uuid(),
  candidate_id  uuid not null references candidates on delete cascade,
  approver_id   uuid not null references auth.users,
  odds_seen     numeric(8,3) not null,
  decision      text not null check (decision in ('approved','rejected')),
  note          text,
  created_at    timestamptz not null default now()
);


-- ── 6. TIKETY KLIENTŮ ────────────────────────────────────────

create table if not exists tickets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  candidate_id  uuid references candidates on delete set null,
  event_name    text not null,
  market        text not null,
  selection     text not null,
  odds          numeric(8,3) not null,
  units         numeric(4,1) not null,
  stake         numeric(12,2) not null,
  state         text not null default 'open'
                check (state in ('open','won','lost','void')),
  profit        numeric(12,2) not null default 0,
  closing_odds  numeric(8,3),
  clv           numeric(6,4),
  placed_at     timestamptz not null default now(),
  settled_at    timestamptz
);

create index if not exists tickets_by_user
  on tickets (user_id, placed_at desc);

-- Vazba na účet. Doplní se i tabulkám, které vznikly bez ní.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tickets_user_fk'
  ) then
    alter table tickets add constraint tickets_user_fk
      foreign key (user_id) references auth.users on delete cascade;
  end if;
end $$;


-- ── 7. NASTAVENÍ SYSTÉMU ─────────────────────────────────────
-- Jediný řádek, ať se nedá omylem rozmnožit.

create table if not exists app_settings (
  id                 boolean primary key default true check (id),
  platform_name      text    not null default 'BETIMPERIUM',
  tagline            text    not null default '',
  description        text    not null default '',
  language           text    not null default 'cs',
  currency           text    not null default 'CZK',
  timezone           text    not null default 'Europe/Prague',
  week_start         text    not null default 'monday',
  allow_signup       boolean not null default true,
  allow_trial        boolean not null default true,
  approve_clients    boolean not null default false,
  require_2fa_staff  boolean not null default true,
  default_units      numeric(4,1) not null default 2,
  default_sport      text    not null default 'fotbal',
  tip_expiry_minutes integer not null default 120,
  default_week_limit numeric(12,2) not null default 6000,
  default_loss_limit numeric(12,2) not null default 8000,
  reality_check_min  integer not null default 60,
  retention_days     integer not null default 730,
  updated_at         timestamptz not null default now(),
  updated_by         uuid
);

insert into app_settings (id) values (true) on conflict (id) do nothing;


-- ── 8. AUTOMATIZACE ──────────────────────────────────────────
-- Spouštěč je konkrétní podmínka, ne skóre. Skóre nikdo neumí
-- ověřit ani obhájit před klientem.

create table if not exists automations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  what         text not null default '',
  trigger_key  text not null,
  condition    text,
  actions      jsonb not null default '[]'::jsonb,
  active       boolean not null default false,
  -- safe = nic citlivého, money = mění členství a přístupy,
  -- betting = odesílá tipy klientům
  risk         text not null default 'safe'
               check (risk in ('safe','money','betting')),
  -- true = smí odejít jen klientům se souhlasem s marketingem
  needs_consent boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists automation_runs (
  id             bigserial primary key,
  automation_id  uuid not null references automations on delete cascade,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  ok             boolean,
  error          text,
  subject_id     uuid
);

create index if not exists automation_runs_recent
  on automation_runs (automation_id, started_at desc);

-- Nouzový vypínač. Jeden řádek v nastavení místo hromadné úpravy
-- automatizací — po znovuspuštění zůstanou zapnuté ty, co byly.
alter table app_settings add column if not exists automations_paused boolean not null default false;


-- ── 9. ŘÍZENÍ PŘÍSTUPU ───────────────────────────────────────
-- Zásada: klientský klíč nevidí nic než vlastní řádky.
-- Zapnuté RLS bez politiky = tabulka je pro anon klíč neviditelná.

alter table automations     enable row level security;
alter table automation_runs enable row level security;
alter table profiles       enable row level security;
alter table tickets        enable row level security;
alter table candidates     enable row level security;
alter table approvals      enable row level security;
alter table odds_snapshots enable row level security;
alter table app_settings   enable row level security;

-- Čte vlastní roli mimo RLS, jinak by se politika níž zacyklila.
create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

drop policy if exists "vlastni profil" on profiles;
create policy "vlastni profil" on profiles
  for select using (auth.uid() = id);

-- with check zakazuje změnit si vlastní roli. Bez toho by si kdokoliv
-- nastavil role = 'admin' jedním voláním API.
drop policy if exists "uprava vlastniho profilu" on profiles;
create policy "uprava vlastniho profilu" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = public.my_role());

-- Tikety jen ke čtení. Zapisuje server přes service_role, aby si
-- klient nemohl dopsat výhru.
drop policy if exists "vlastni tikety" on tickets;
create policy "vlastni tikety" on tickets
  for select using (auth.uid() = user_id);

-- candidates, approvals, odds_snapshots, app_settings, automations
-- a automation_runs zůstávají bez politik záměrně — přistupuje k nim
-- jen server přes service_role.


-- ── 10. PRVNÍ ADMIN ──────────────────────────────────────────
-- Uprav e-mail na svůj.

update profiles set role = 'admin'
where id = (select id from auth.users where email = 'matuchovic@betim.cz');


-- ── KONTROLA ─────────────────────────────────────────────────
-- Po spuštění by mělo vyjít: účet s rolí admin a osm tabulek.

select u.email, p.name, p.role, p.birth_date
from auth.users u
left join profiles p on p.id = u.id;
