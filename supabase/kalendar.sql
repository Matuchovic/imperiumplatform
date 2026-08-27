-- ── KALENDÁŘ A POZNÁMKY ──────────────────────────────────────
-- Dva kalendáře v jedné tabulce: firemní vidí celý tým, osobní
-- jen jeho vlastník. Rozhoduje sloupec `sdilena`.

create table if not exists udalosti (
  id          bigserial primary key,
  nazev       text not null,
  -- true = firemní kalendář, false = osobní
  sdilena     boolean not null default false,
  datum       date not null,
  cas_od      time,
  cas_do      time,
  cely_den    boolean not null default false,
  misto       text,
  s_kym       text,
  poznamka    text,
  barva       text not null default 'zelena'
              check (barva in ('zelena','jantar','modra','cervena')),
  vlastnik    uuid not null,
  created_at  timestamptz not null default now()
);

create index if not exists udalosti_mesic on udalosti (datum);
create index if not exists udalosti_vlastnik on udalosti (vlastnik, datum) where not sdilena;
create index if not exists udalosti_firemni on udalosti (datum) where sdilena;

-- ── POZNÁMKY ─────────────────────────────────────────────────
-- Rychlé zápisky pod kalendářem. Firemní jsou pro celý tým,
-- osobní vidí jen autor.

create table if not exists poznamky (
  id          bigserial primary key,
  text        text not null,
  sdilena     boolean not null default false,
  hotovo      boolean not null default false,
  autor       uuid not null,
  autor_jmeno text,
  created_at  timestamptz not null default now()
);

create index if not exists poznamky_recent on poznamky (created_at desc);

alter table udalosti enable row level security;
alter table poznamky enable row level security;
