-- ── NOTIFIKACE ───────────────────────────────────────────────
-- Odběry pro push a volby, co komu chodit má.

create table if not exists push_odbery (
  id          bigserial primary key,
  user_id     uuid not null,
  -- Endpoint je jedinečný pro zařízení i prohlížeč. Jeden člověk
  -- má tolik odběrů, kolik má zařízení.
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  zarizeni    text,
  created_at  timestamptz not null default now(),
  posledni_at timestamptz
);

create index if not exists push_uzivatel on push_odbery (user_id);

create table if not exists notifikace_volby (
  user_id     uuid primary key,
  chat        boolean not null default true,
  kalendar    boolean not null default true,
  asistent    boolean not null default false,
  kandidati   boolean not null default true,
  support     boolean not null default true,
  ukoly       boolean not null default true,
  -- Tiché hodiny. Mimo ně se nic neposílá.
  ticho_od    time,
  ticho_do    time,
  updated_at  timestamptz not null default now()
);

alter table push_odbery enable row level security;
alter table notifikace_volby enable row level security;

-- ── AVATAR ───────────────────────────────────────────────────
-- Volitelný efekt kolem kolečka. Barva se odvozuje ze jména,
-- takže se neukládá.

alter table profiles add column if not exists avatar_efekt text not null default 'zadny';
