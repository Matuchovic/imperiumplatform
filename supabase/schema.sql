-- BETIMPERIUM — schéma motoru a tiketů.
-- Spusť v Supabase → SQL Editor.
-- Zásada: klientské klíče nevidí nic než vlastní řádky. Motor běží
-- pod service_role a RLS obchází, proto pro něj žádné politiky nejsou.

-- ── Profily ──────────────────────────────────────────────────────────
create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,
  name         text not null default '',
  plan         text not null default 'start',
  bankroll     numeric(12,2) not null default 0,
  goal         numeric(12,2) not null default 0,
  unit_pct     numeric(4,2)  not null default 2,
  created_at   timestamptz not null default now()
);

-- ── Snímky kurzů ─────────────────────────────────────────────────────
-- Roste nejrychleji ze všech tabulek. Dělené po dnech, ať jde starší
-- oddíly odpojit bez mazání po řádcích.
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

-- ── Kandidáti z motoru ───────────────────────────────────────────────
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

-- ── Schválení ────────────────────────────────────────────────────────
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

-- ── Tikety klientů ───────────────────────────────────────────────────
create table if not exists tickets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
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
  clv           numeric(6,4),   -- odds / closing_odds - 1
  placed_at     timestamptz not null default now(),
  settled_at    timestamptz
);

create index if not exists tickets_by_user
  on tickets (user_id, placed_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table profiles       enable row level security;
alter table tickets        enable row level security;
alter table candidates     enable row level security;
alter table approvals      enable row level security;
alter table odds_snapshots enable row level security;

-- Vlastní profil: čtení i úprava.
create policy "vlastni profil" on profiles
  for select using (auth.uid() = id);
create policy "uprava vlastniho profilu" on profiles
  for update using (auth.uid() = id);

-- Vlastní tikety: jen čtení. Zapisuje motor pod service_role,
-- aby si klient nemohl dopsat výhru.
create policy "vlastni tikety" on tickets
  for select using (auth.uid() = user_id);

-- candidates, approvals a odds_snapshots zůstávají bez politik.
-- RLS je zapnuté a žádná politika neexistuje → anon klíč nevidí nic.
