-- ── BETMAIL ──────────────────────────────────────────────────
-- Interní pošta. Na rozdíl od chatu se tu nic neztratí — je to
-- kanál pro věci, které mají zůstat dohledatelné.

create table if not exists betmail (
  id          bigserial primary key,
  predmet     text not null,
  telo        text not null,
  odesilatel  uuid not null,
  odesilatel_jmeno text,
  prijemce    uuid not null,
  priorita    text not null default 'bezna'
              check (priorita in ('nizka','bezna','vysoka')),
  -- Vlákno: odpověď i přeposlání odkazují na původní zprávu.
  odpoved_na  bigint references betmail on delete set null,
  -- Přílohy odkazují do Cloudu, ne do vlastního úložiště. Jeden
  -- soubor na jednom místě — jinak by se tytéž smlouvy válely dvakrát.
  prilohy     bigint[] not null default '{}',
  precteno_at timestamptz,
  archivovano boolean not null default false,
  smazano_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- Doručená pošta je nejčastější dotaz.
create index if not exists betmail_dorucena on betmail (prijemce, created_at desc)
  where smazano_at is null;
create index if not exists betmail_odeslana on betmail (odesilatel, created_at desc)
  where smazano_at is null;
create index if not exists betmail_neprectene on betmail (prijemce)
  where precteno_at is null and smazano_at is null and not archivovano;
create index if not exists betmail_vlakno on betmail (odpoved_na) where odpoved_na is not null;

create table if not exists betmail_reakce (
  zprava_id   bigint not null references betmail on delete cascade,
  user_id     uuid not null,
  znak        text not null,
  created_at  timestamptz not null default now(),
  -- Jeden člověk, jedna reakce daného druhu.
  primary key (zprava_id, user_id, znak)
);

alter table betmail enable row level security;
alter table betmail_reakce enable row level security;
