-- ── SUPPORT A KAMPANĚ ────────────────────────────────────────
-- Tabulky pro sekce, které dosud byly rozcestníky.

create table if not exists tikety_podpory (
  id          bigserial primary key,
  predmet     text not null,
  zprava      text,
  klient_id   uuid references auth.users on delete set null,
  -- Kdo se ozval, když ještě nemá účet.
  od_koho     text,
  kanal       text not null default 'email'
              check (kanal in ('email','telegram','telefon','osobne')),
  stav        text not null default 'novy'
              check (stav in ('novy','v_reseni','ceka_na_klienta','vyreseno')),
  priorita    text not null default 'bezna'
              check (priorita in ('nizka','bezna','vysoka')),
  resitel     uuid,
  created_at  timestamptz not null default now(),
  -- Doba do první odpovědi je jediné číslo, které o podpoře
  -- něco vypovídá. Proto vlastní sloupec, ne dopočet.
  prvni_odpoved_at timestamptz,
  uzavreno_at timestamptz
);

create index if not exists podpora_otevrene on tikety_podpory (created_at desc)
  where stav <> 'vyreseno';
create index if not exists podpora_klient on tikety_podpory (klient_id)
  where klient_id is not null;

create table if not exists kampane (
  id          bigserial primary key,
  nazev       text not null,
  kanal       text not null default 'email' check (kanal in ('email','sms','telegram')),
  predmet     text,
  obsah       text,
  -- Komu se posílá. Segment se ukládá jako podmínka, ne jako
  -- seznam příjemců — ten by za týden byl neplatný.
  segment     jsonb,
  stav        text not null default 'koncept'
              check (stav in ('koncept','naplanovano','odesila_se','odeslano','zastaveno')),
  odeslat_v   timestamptz,
  prijemcu    integer not null default 0,
  odeslano    integer not null default 0,
  doruceno    integer not null default 0,
  otevreno    integer not null default 0,
  odhlaseno   integer not null default 0,
  vytvoril    uuid,
  created_at  timestamptz not null default now(),
  dokonceno_at timestamptz
);

create index if not exists kampane_recent on kampane (created_at desc);

alter table tikety_podpory enable row level security;
alter table kampane enable row level security;
