-- ── TÝMOVÝ CHAT ──────────────────────────────────────────────

create table if not exists kanaly (
  id          bigserial primary key,
  nazev       text not null,
  popis       text,
  -- Soukromý kanál vidí jen jeho členové.
  soukromy    boolean not null default false,
  vytvoril    uuid not null,
  created_at  timestamptz not null default now()
);

create unique index if not exists kanaly_nazev on kanaly (lower(nazev));

create table if not exists kanal_clenove (
  kanal_id    bigint not null references kanaly on delete cascade,
  user_id     uuid not null,
  precteno_do timestamptz,
  primary key (kanal_id, user_id)
);

create table if not exists zpravy (
  id          bigserial primary key,
  kanal_id    bigint not null references kanaly on delete cascade,
  autor       uuid not null,
  autor_jmeno text,
  text        text not null,
  created_at  timestamptz not null default now()
);

-- Načítání zpráv kanálu odzadu je nejčastější dotaz.
create index if not exists zpravy_kanal on zpravy (kanal_id, created_at desc);

-- ── TREZOR ───────────────────────────────────────────────────
-- Hesla a klíče. Hodnoty jsou šifrované klíčem z prostředí, takže
-- únik databáze sám o sobě nic neodhalí — bez TREZOR_KLIC jsou
-- uložené řetězce nepoužitelné.

create table if not exists trezor (
  id          bigserial primary key,
  nazev       text not null,
  kategorie   text not null default 'ostatni'
              check (kategorie in ('sluzba','databaze','platby','socialni','ostatni')),
  uzivatel    text,
  -- Šifrovaný text ve tvaru iv:tag:data (base64). Nikdy ne otevřeně.
  tajemstvi   text not null,
  url         text,
  poznamka    text,
  vlozil      uuid not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists trezor_kategorie on trezor (kategorie, nazev);

-- Každé zobrazení hesla se zapíše. Bez toho by trezor byl jen
-- sdílená složka s hesly.
create table if not exists trezor_pristupy (
  id          bigserial primary key,
  polozka_id  bigint not null references trezor on delete cascade,
  user_id     uuid not null,
  jmeno       text,
  akce        text not null check (akce in ('zobrazeno','zkopirovano','zmeneno','smazano')),
  created_at  timestamptz not null default now()
);

create index if not exists trezor_pristupy_recent on trezor_pristupy (created_at desc);

alter table kanaly enable row level security;
alter table kanal_clenove enable row level security;
alter table zpravy enable row level security;
alter table trezor enable row level security;
alter table trezor_pristupy enable row level security;

-- Výchozí kanál, ať chat není po spuštění prázdný.
insert into kanaly (nazev, popis, vytvoril)
select 'obecné', 'Vše, co nemá vlastní kanál',
       (select id from auth.users order by created_at limit 1)
where not exists (select 1 from kanaly) 
  and exists (select 1 from auth.users);
