-- ── ÚKOLY ────────────────────────────────────────────────────
-- Sekce v navigaci existovala bez dat. Asistent z ní teď umí
-- zakládat úkoly přímo z rozhovoru.

create table if not exists ukoly (
  id          bigserial primary key,
  nazev       text not null,
  popis       text,
  termin      date,
  hotovo      boolean not null default false,
  priorita    text not null default 'bezna'
              check (priorita in ('nizka','bezna','vysoka')),
  -- Komu se úkol týká. Nepovinné — úkol nemusí mít klienta.
  klient_id   uuid references auth.users on delete set null,
  vytvoril    uuid,
  zdroj       text not null default 'rucne',
  created_at  timestamptz not null default now(),
  hotovo_at   timestamptz
);

create index if not exists ukoly_otevrene on ukoly (termin) where not hotovo;
create index if not exists ukoly_klient on ukoly (klient_id) where klient_id is not null;

alter table ukoly enable row level security;

-- ── POZNÁMKA U KLIENTA ───────────────────────────────────────
-- Asistent umí připsat poznámku k profilu. Sloupec `note` patřil
-- tabulce approvals, ne profilům — tohle to doplňuje.

alter table profiles add column if not exists poznamka text;
