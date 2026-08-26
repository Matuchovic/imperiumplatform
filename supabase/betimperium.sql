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


-- ── 9. PÁSMA KURZŮ A ROZESÍLÁNÍ ──────────────────────────────
-- Stejná výhoda se v každém pásmu chová jinak: při kurzu 4.00 přijde
-- běžně 16 proher v řadě, při 1.30 jsou to tři. Klient si proto volí,
-- co odebírá, a u tiketu zůstává zapsané, ze kterého pásma přišel.

alter table candidates add column if not exists band text
  check (band in ('zaklad','standard','rozsireny','odvazny'));
alter table tickets    add column if not exists band text
  check (band in ('zaklad','standard','rozsireny','odvazny'));

create index if not exists candidates_band on candidates (band, status, created_at desc);

alter table profiles add column if not exists subscribed_bands text[]
  not null default array['zaklad','standard'];

-- Kanál doručení. Bez něj tip skončí v databázi a klient ho uvidí,
-- jen když si sám otevře aplikaci — u kurzů, které se hýbou, pozdě.
alter table profiles add column if not exists telegram_chat_id text;

create index if not exists profiles_telegram on profiles (telegram_chat_id)
  where telegram_chat_id is not null;

-- Která pásma smí odejít bez schválení člověkem.
alter table app_settings add column if not exists auto_bands text[]
  not null default array['zaklad','standard'];

-- Stopa po každém automatickém běhu. Bez ní se po měsíci nedozvíš,
-- proč v úterý neodešlo nic.
create table if not exists engine_runs (
  id           bigserial primary key,
  started_at   timestamptz not null default now(),
  scanned      integer not null default 0,
  found        integer not null default 0,
  auto_sent    integer not null default 0,
  awaiting     integer not null default 0,
  tickets      integer not null default 0,
  paused       boolean not null default false,
  error        text
);

create index if not exists engine_runs_recent on engine_runs (started_at desc);

alter table engine_runs enable row level security;


-- ── 10. AUDIT, UDÁLOSTI A AI VRSTVA ──────────────────────────
-- Audit vzniká DŘÍV, než cokoli začne měnit peníze nebo stavy.
-- Obráceně by se první chyba nedala dohledat.

create table if not exists audit_log (
  id          bigserial primary key,
  action      text not null,
  entity      text not null,
  entity_id   text not null,
  actor_id    uuid,
  -- kdo změnu vyvolal: uživatel, cron, agent
  source      text not null,
  previous    jsonb,
  next        jsonb,
  reason      text,
  run_id      text,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_entity on audit_log (entity, entity_id, created_at desc);
create index if not exists audit_log_recent on audit_log (created_at desc);
create index if not exists audit_log_action on audit_log (action, created_at desc);

-- Doménové události. Tabulka místo fronty — na Vercelu a Supabase
-- je to přiměřené a idempotenci zajistí unique klíč.
create table if not exists domain_events (
  id            bigserial primary key,
  event_key     text not null,
  type          text not null,
  entity        text not null,
  entity_id     text not null,
  payload       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  processed_at  timestamptz,
  error         text
);

-- Tenhle index je celá idempotence: stejná událost neprojde dvakrát.
create unique index if not exists domain_events_key on domain_events (event_key);
create index if not exists domain_events_pending on domain_events (created_at)
  where processed_at is null;

-- Signály trhu. Odvozené hodnoty počítá TypeScript, ne model.
create table if not exists market_signals (
  id            bigserial primary key,
  type          text not null,
  event_id      text not null,
  market_id     text not null,
  selection_id  text not null,
  severity      text not null check (severity in ('info','low','medium','high','critical')),
  source        text not null,
  metrics       jsonb not null default '{}'::jsonb,
  dedupe_key    text not null,
  detected_at   timestamptz not null default now()
);

create index if not exists market_signals_dedupe on market_signals (dedupe_key, detected_at desc);
create index if not exists market_signals_market on market_signals (event_id, market_id, detected_at desc);

create table if not exists market_incidents (
  id           bigserial primary key,
  incident_key text not null,
  event_id     text not null,
  market_id    text not null,
  severity     text not null,
  trigger      text not null,
  status       text not null default 'open'
               check (status in ('open','investigating','resolved')),
  signal_ids   bigint[] not null default '{}',
  started_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

create unique index if not exists market_incidents_key on market_incidents (incident_key);

-- Každý běh agenta musí být dohledatelný.
create table if not exists ai_runs (
  id              bigserial primary key,
  run_id          text not null,
  agent           text not null,
  task            text not null,
  trigger_event   text,
  model           text,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  input_refs      jsonb,
  tool_calls      jsonb not null default '[]'::jsonb,
  output          jsonb,
  action_suggested text,
  action_executed  boolean not null default false,
  approved_by     uuid,
  approved_at     timestamptz,
  error           text,
  duration_ms     integer,
  tokens_in       integer,
  tokens_out      integer
);

create index if not exists ai_runs_recent on ai_runs (started_at desc);
create index if not exists ai_runs_agent on ai_runs (agent, started_at desc);

-- Návrhy čekající na člověka. Bez schválení se akce neprovede.
create table if not exists ai_approvals (
  id           bigserial primary key,
  ai_run_id    bigint references ai_runs on delete cascade,
  agent        text not null,
  tool         text not null,
  action_key   text not null,
  reason       text not null,
  severity     text not null,
  evidence     jsonb,
  status       text not null default 'pending'
               check (status in ('pending','approved','rejected','expired')),
  decided_by   uuid,
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);

create unique index if not exists ai_approvals_key on ai_approvals (action_key)
  where status = 'pending';

-- Vypínače rizikových podsystémů. Výchozí stav je vypnuto —
-- zapíná se vědomě.
alter table app_settings add column if not exists watcher_enabled     boolean not null default false;
alter table app_settings add column if not exists automations_enabled boolean not null default false;
alter table app_settings add column if not exists settlement_enabled  boolean not null default false;
alter table app_settings add column if not exists ai_agents_enabled   boolean not null default false;
alter table app_settings add column if not exists ai_write_enabled    boolean not null default false;

-- Idempotence rozesílání. Bez tohohle indexu vytvoří dvojí běh cronu
-- klientovi tentýž tiket dvakrát.
-- Pozor: na existující duplicity migrace selže. Kontrola je níž.
do $$
declare dup integer;
begin
  select count(*) into dup from (
    select user_id, candidate_id from tickets
    where candidate_id is not null
    group by user_id, candidate_id having count(*) > 1
  ) x;

  if dup > 0 then
    raise notice 'Nalezeno % duplicitních dvojic tiketů. Index se nevytvoří, dokud se neuklidí.', dup;
  else
    create unique index if not exists tickets_unique_dispatch
      on tickets (user_id, candidate_id) where candidate_id is not null;
  end if;
end $$;

alter table audit_log        enable row level security;
alter table domain_events    enable row level security;
alter table market_signals   enable row level security;
alter table market_incidents enable row level security;
alter table ai_runs          enable row level security;
alter table ai_approvals     enable row level security;


-- ── 11. ŘÍZENÍ PŘÍSTUPU ──────────────────────────────────────
-- Zásada: klientský klíč nevidí nic než vlastní řádky.
-- Zapnuté RLS bez politiky = tabulka je pro anon klíč neviditelná.

alter table automations     enable row level security;
alter table engine_runs     enable row level security;
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


-- ── 12. PRVNÍ ADMIN ──────────────────────────────────────────
-- Uprav e-mail na svůj.

update profiles set role = 'admin'
where id = (select id from auth.users where email = 'matuchovic@betim.cz');


-- ── KONTROLA ─────────────────────────────────────────────────
-- Po spuštění by mělo vyjít: účet s rolí admin a osm tabulek.

select u.email, p.name, p.role, p.birth_date
from auth.users u
left join profiles p on p.id = u.id;
