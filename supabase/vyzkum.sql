-- ── VÝZKUM A KONCEPTY ────────────────────────────────────────
-- Reporty z webového výzkumu a koncepty tiketů. Koncept není
-- publikovaný tiket — do rozesílání se dostane až schválením.

create table if not exists reporty (
  id          bigserial primary key,
  nazev       text not null,
  udalost     text,
  dotaz       text,
  nase_data   jsonb,
  web_nalezy  jsonb,
  shrnuti     text,
  zdroje      jsonb not null default '[]'::jsonb,
  vytvoril    uuid,
  created_at  timestamptz not null default now()
);

create index if not exists reporty_recent on reporty (created_at desc);

create table if not exists koncepty_tiketu (
  id            bigserial primary key,
  candidate_id  uuid references candidates on delete set null,
  udalost       text not null,
  trh           text not null,
  vyber         text not null,
  -- Čísla vždycky z motoru. Model je nesmí vytvořit.
  kurz          numeric(8,3) not null,
  prahovy_kurz  numeric(8,3),
  ev            numeric(6,4),
  jednotky      numeric(6,2),
  pasmo         text,
  vyzkum        jsonb,
  stav          text not null default 'draft'
                check (stav in ('draft','zamitnuto','schvaleno')),
  vytvoril      uuid,
  created_at    timestamptz not null default now()
);

create index if not exists koncepty_draft on koncepty_tiketu (created_at desc) where stav = 'draft';

alter table reporty enable row level security;
alter table koncepty_tiketu enable row level security;
