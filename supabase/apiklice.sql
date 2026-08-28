-- ── API KLÍČE ────────────────────────────────────────────────
-- Klíč sám se neukládá, jen jeho otisk. Kdo se dostane
-- k databázi, nedostane se k API.

create table if not exists api_klice (
  id          bigserial primary key,
  nazev       text not null,
  -- SHA-256 klíče. Podle něj se klíč hledá při ověření.
  otisk_hash  text not null unique,
  -- Prvních pár znaků pro zobrazení v seznamu.
  nahled      text not null,
  druh        text not null default 'live' check (druh in ('live','test')),

  opravneni   text[] not null default '{}',
  -- Prázdné pole znamená bez omezení. Rozhraní na to upozorní.
  domeny      text[] not null default '{}',
  limit_hod   integer not null default 600,

  plati_do    timestamptz,
  posledni_pouziti timestamptz,
  posledni_ip text,

  odvolany_at timestamptz,
  odvolal     uuid,
  vytvoril    uuid,
  created_at  timestamptz not null default now()
);

create index if not exists api_klice_hash on api_klice (otisk_hash)
  where odvolany_at is null;

-- Protokol volání. Bez něj nejde poznat, co klíč dělá,
-- ani doložit, kdo co založil.
create table if not exists api_volani (
  id          bigserial primary key,
  klic_id     bigint references api_klice on delete cascade,
  cesta       text not null,
  metoda      text not null,
  stav        integer not null,
  ip          text,
  puvod       text,
  trvani_ms   integer,
  chyba       text,
  created_at  timestamptz not null default now()
);

create index if not exists api_volani_klic on api_volani (klic_id, created_at desc);
-- Podklad pro hodinový limit.
create index if not exists api_volani_okno on api_volani (klic_id, created_at);

alter table api_klice enable row level security;
alter table api_volani enable row level security;
