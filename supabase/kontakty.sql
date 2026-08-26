-- ── DATABÁZE KONTAKTŮ ────────────────────────────────────────
-- Přesná kopie struktury scout_leads z NextIT, aby CSV prošlo
-- bez přemapování. Importér Supabase vyžaduje, aby KAŽDÝ sloupec
-- z CSV existoval v cílové tabulce — chybějící sloupec shodí
-- celý import s hláškou o neshodě struktury.
--
-- id je uuid, ne číselná řada. scout_leads to tak má.

drop table if exists kontakty;

create table kontakty (
  id            uuid primary key default gen_random_uuid(),

  -- základ z ARES
  company_name  text not null,
  ico           text,
  industry      text,
  nace_code     text,
  city          text,
  address       text,
  website       text,

  -- kontaktní údaje doplněné obohacením
  email         text,
  phone         text,
  web_quality   text,

  -- pozůstatky rozesílání z NextIT. Zůstávají kvůli importu
  -- a kvůli tomu, že je z nich vidět, komu se už psalo.
  ai_subject    text,
  ai_body       text,
  status        text default 'new',
  sent_at       timestamptz,
  opened_at     timestamptz,
  error         text,
  color         text,

  created_at    timestamptz default now(),

  -- ── doplněno pro BETIMPERIUM ──────────────────────────────
  -- Odkud záznam pochází a k čemu se smí použít. Bez toho se za
  -- rok nedá zjistit, jestli se ta firma smí oslovit.
  zdroj         text not null default 'ARES / NextIT scout',
  ucel          text not null default 'interni_evidence'
                check (ucel in ('interni_evidence', 'obchodni_kontakt', 'osloveni_povoleno')),
  odhlaseno_at  timestamptz,
  poznamka      text
);

-- IČO je jedinečné, ale u části záznamů chybí.
create unique index if not exists kontakty_ico on kontakty (ico) where ico is not null;

-- Fulltext přes název, město a obor. Bez indexu je hledání
-- v jednadvaceti tisících řádcích viditelně cítit.
create index if not exists kontakty_hledani on kontakty
  using gin (to_tsvector('simple',
    coalesce(company_name,'') || ' ' || coalesce(city,'') || ' ' || coalesce(industry,'')));

create index if not exists kontakty_obor  on kontakty (industry);
create index if not exists kontakty_mesto on kontakty (city);
create index if not exists kontakty_ucel  on kontakty (ucel);
create index if not exists kontakty_email on kontakty (email) where email is not null;

-- Kontakty vidí jen tým přes service_role. Klientům do nich nic není.
alter table kontakty enable row level security;
