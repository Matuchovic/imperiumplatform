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

-- ── DOPLNĚNÍ ─────────────────────────────────────────────────

-- Seznam povolených IP. Doména se dá podvrhnout, adresa ne —
-- prohlížeč hlavičku nastavuje sám, ale server si tam napíše cokoli.
alter table api_klice add column if not exists ip_seznam text[] not null default '{}';

-- Nástupce při výměně. Starý klíč ještě chvíli funguje, aby web
-- nespadl ve chvíli, kdy nikdo není u počítače.
alter table api_klice add column if not exists nahrazen_id bigint references api_klice on delete set null;
alter table api_klice add column if not exists dobehne_do timestamptz;

-- Testovací klíč zapisuje odděleně, ať zkoušení neplní ostrá data.
alter table api_klice add column if not exists jen_nanecisto boolean not null default false;

-- Upozornění na podezřelé chování. Zapisuje se jednou za druh a den,
-- aby se z toho nestal proud, který nikdo nečte.
create table if not exists api_podezreni (
  id          bigserial primary key,
  klic_id     bigint references api_klice on delete cascade,
  druh        text not null
              check (druh in ('naraz','chyby','nova_ip','v_noci')),
  popis       text not null,
  podrobnosti jsonb not null default '{}',
  vyreseno_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Den jako samostatný sloupec.
--
-- Přímo v indexu by nešel: created_at::date závisí na časovém
-- pásmu spojení, takže to PostgreSQL nepovažuje za neměnný výraz.
-- Převod na UTC neměnný je.
alter table api_podezreni
  add column if not exists den date
  generated always as (((created_at at time zone 'UTC')::date)) stored;

-- Jedno upozornění na druh a den, ať z toho není proud.
create unique index if not exists podezreni_denne
  on api_podezreni (klic_id, druh, den);

-- Webhooky opačným směrem. Systém se ozve webu, když se něco stane.
create table if not exists api_webhooky (
  id          bigserial primary key,
  nazev       text not null,
  url         text not null,
  -- Tajemství pro podpis. Web podle něj pozná, že zpráva je od nás.
  tajemstvi   text not null,
  udalosti    text[] not null default '{}',
  aktivni     boolean not null default true,
  posledni_ok timestamptz,
  posledni_chyba text,
  neuspechu   integer not null default 0,
  vytvoril    uuid,
  created_at  timestamptz not null default now()
);

create table if not exists api_webhook_pokusy (
  id          bigserial primary key,
  webhook_id  bigint not null references api_webhooky on delete cascade,
  udalost     text not null,
  telo        jsonb not null,
  stav        integer,
  pokus       integer not null default 1,
  chyba       text,
  created_at  timestamptz not null default now()
);

create index if not exists webhook_pokusy_idx on api_webhook_pokusy (webhook_id, created_at desc);

alter table api_podezreni enable row level security;
alter table api_webhooky enable row level security;
alter table api_webhook_pokusy enable row level security;
