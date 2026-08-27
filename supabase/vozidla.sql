-- ── VOZOVÝ PARK ──────────────────────────────────────────────

create table if not exists vozidla (
  id          bigserial primary key,
  spz         text not null,
  znacka      text not null,
  model       text,
  rok         integer,
  palivo      text check (palivo is null or palivo in ('benzin','nafta','elektro','hybrid','lpg','cng')),
  vin         text,
  barva       text,
  tachometr   integer not null default 0,
  stav        text not null default 'aktivni'
              check (stav in ('aktivni','servis','odstaveno','vyrazeno')),
  -- Řidič. Vozidlo bez řidiče je v parku, ale nikomu nepatří.
  ridic       uuid references auth.users on delete set null,
  ridic_jmeno text,
  -- Lhůty. Systém hlídá, co se blíží.
  stk_do      date,
  pojisteni_do date,
  znamka_do   date,
  servis_do   date,
  poznamka    text,
  created_at  timestamptz not null default now()
);

create unique index if not exists vozidla_spz on vozidla (upper(replace(spz, ' ', '')));
create index if not exists vozidla_ridic on vozidla (ridic) where ridic is not null;

-- ── KNIHA JÍZD ───────────────────────────────────────────────

create table if not exists kniha_jizd (
  id          bigserial primary key,
  vozidlo_id  bigint not null references vozidla on delete cascade,
  datum       date not null,
  ucel        text not null,
  odkud       text,
  kam         text,
  km_start    integer not null,
  km_cil      integer not null,
  soukroma    boolean not null default false,
  ridic       uuid,
  ridic_jmeno text,
  created_at  timestamptz not null default now(),
  -- Cílový stav nemůže být nižší než výchozí.
  constraint kniha_jizd_km check (km_cil >= km_start)
);

create index if not exists jizdy_vozidlo on kniha_jizd (vozidlo_id, datum desc);

-- ── SERVIS ───────────────────────────────────────────────────

create table if not exists servis (
  id          bigserial primary key,
  vozidlo_id  bigint not null references vozidla on delete cascade,
  datum       date not null,
  druh        text not null default 'oprava'
              check (druh in ('servis','oprava','pneu','stk','myti','jine')),
  popis       text not null,
  tachometr   integer,
  cena        numeric(10, 2),
  dodavatel   text,
  zapsal      uuid,
  created_at  timestamptz not null default now()
);

create index if not exists servis_vozidlo on servis (vozidlo_id, datum desc);

-- ── POŠKOZENÍ ────────────────────────────────────────────────
-- Fotografie odkazují do cloudu, ne do vlastního úložiště.

create table if not exists poskozeni (
  id          bigserial primary key,
  vozidlo_id  bigint not null references vozidla on delete cascade,
  datum       date not null default current_date,
  misto       text not null,
  popis       text,
  zavaznost   text not null default 'drobne'
              check (zavaznost in ('drobne','stredni','vazne')),
  vyreseno    boolean not null default false,
  fotky       bigint[] not null default '{}',
  nahlasil    uuid,
  nahlasil_jmeno text,
  created_at  timestamptz not null default now()
);

create index if not exists poskozeni_vozidlo on poskozeni (vozidlo_id, created_at desc);

-- ── TANKOVACÍ KARTY ──────────────────────────────────────────

create table if not exists tankovaci_karty (
  id          bigserial primary key,
  cislo       text not null,
  vydavatel   text,
  platnost_do date,
  pin_napoveda text,
  limit_mesic numeric(10, 2),
  -- Karta patří vozidlu, nebo člověku. Někdy obojímu.
  vozidlo_id  bigint references vozidla on delete set null,
  drzitel     uuid references auth.users on delete set null,
  drzitel_jmeno text,
  aktivni     boolean not null default true,
  poznamka    text,
  created_at  timestamptz not null default now()
);

create unique index if not exists karty_cislo on tankovaci_karty (cislo);

alter table vozidla enable row level security;
alter table kniha_jizd enable row level security;
alter table servis enable row level security;
alter table poskozeni enable row level security;
alter table tankovaci_karty enable row level security;
