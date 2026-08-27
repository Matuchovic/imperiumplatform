-- ── AI AGENT GARÁŽ ───────────────────────────────────────────
-- Agenti pracují na pozadí. Každý má ruční brzdu — nic rizikového
-- neudělá bez schválení člověkem.

create table if not exists agenti (
  klic        text primary key,
  zapnuty     boolean not null default false,
  -- Interval v minutách. Null znamená, že se spouští ručně.
  interval_min integer,
  posledni_beh timestamptz,
  pristi_beh  timestamptz,
  nastaveni   jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

-- Co agent udělal. Bez záznamu by nešlo poznat, jestli pracuje,
-- nebo jen tiše selhává.
create table if not exists agent_beh (
  id          bigserial primary key,
  klic        text not null,
  zacatek     timestamptz not null default now(),
  konec       timestamptz,
  stav        text not null default 'bezi'
              check (stav in ('bezi','hotovo','chyba','preruseno')),
  shrnuti     text,
  vysledku    integer not null default 0,
  chyba       text
);

create index if not exists agent_beh_klic on agent_beh (klic, zacatek desc);

-- Co agent navrhl a čeká na schválení. Nic se neprovede samo.
create table if not exists agent_navrhy (
  id          bigserial primary key,
  klic        text not null,
  beh_id      bigint references agent_beh on delete set null,
  druh        text not null,
  nazev       text not null,
  obsah       jsonb not null default '{}',
  stav        text not null default 'ceka'
              check (stav in ('ceka','schvaleno','zamitnuto','provedeno')),
  rozhodl     uuid,
  rozhodnuto_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists navrhy_ceka on agent_navrhy (klic, created_at desc)
  where stav = 'ceka';

alter table agenti enable row level security;
alter table agent_beh enable row level security;
alter table agent_navrhy enable row level security;
