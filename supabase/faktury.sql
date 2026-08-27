-- ── FAKTURY ──────────────────────────────────────────────────

create table if not exists faktury (
  id          bigserial primary key,
  cislo       text not null unique,
  -- Klient z databáze, nebo ručně vypsaný odběratel.
  klient_id   uuid references auth.users on delete set null,
  odberatel   text not null,
  odberatel_ico text,
  odberatel_dic text,
  odberatel_adresa text,
  odberatel_email text,

  vystaveno   date not null default current_date,
  splatnost   date,
  duzp        date,

  polozky     jsonb not null default '[]',
  bez_dph     numeric(12, 2) not null default 0,
  dph         numeric(12, 2) not null default 0,
  castka      numeric(12, 2) not null default 0,

  vs          text,
  ks          text,
  zpusob      text not null default 'prevod'
              check (zpusob in ('prevod','hotove','karta')),

  stav        text not null default 'koncept'
              check (stav in ('koncept','vystavena','zaplacena','stornovana')),
  zaplaceno_at timestamptz,

  -- Opakovaná faktura. Systém připomene, člověk potvrdí —
  -- automat by tiše vystavoval chybné doklady.
  opakovana   boolean not null default false,
  opakovat_po integer,
  posledni_opakovani date,

  -- Veřejný odkaz pro klienta. Náhodný, nedá se uhodnout.
  token       text not null default encode(gen_random_bytes(16), 'hex'),

  poznamka    text,
  vystavil    uuid,
  fakturoid_id text,
  created_at  timestamptz not null default now()
);

create index if not exists faktury_stav on faktury (stav, splatnost);
create index if not exists faktury_klient on faktury (klient_id) where klient_id is not null;
create unique index if not exists faktury_token on faktury (token);

-- Upomínky. Každá se zapíše, ať je vidět, co už klient dostal.
create table if not exists upominky (
  id          bigserial primary key,
  faktura_id  bigint not null references faktury on delete cascade,
  uroven      text not null check (uroven in ('prvni','druha','predzalobni')),
  odeslano_at timestamptz not null default now(),
  odeslal     uuid,
  odeslal_jmeno text
);

create index if not exists upominky_faktura on upominky (faktura_id, odeslano_at desc);

-- Fakturační údaje firmy. Jeden řádek.
create table if not exists fakturacni_udaje (
  id          integer primary key default 1 check (id = 1),
  nazev       text not null default 'BETIMPERIUM s.r.o.',
  ico         text,
  dic         text,
  adresa      text,
  ucet        text,
  platce_dph  boolean not null default false,
  splatnost_dni integer not null default 14,
  podpis      text,
  updated_at  timestamptz not null default now()
);

insert into fakturacni_udaje (id) values (1) on conflict (id) do nothing;

alter table faktury enable row level security;
alter table upominky enable row level security;
alter table fakturacni_udaje enable row level security;
