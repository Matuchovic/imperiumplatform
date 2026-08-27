-- ── VÝPLATY ──────────────────────────────────────────────────
-- Jeden řádek na člověka a měsíc. Zapisuje se ručně — systém
-- nemá docházku, ze které by hodiny bral.
--
-- Daně a odvody se nepočítají. To je práce účetní a chybný
-- výpočet by firmu dostal do problémů; systém spočítá hrubou
-- mzdu a čistou doplní ten, kdo za ni odpovídá.

create table if not exists vyplaty (
  id          bigserial primary key,
  -- Vždy první den měsíce, ať se dá řadit i porovnávat.
  obdobi      date not null,
  user_id     uuid not null,
  jmeno       text,

  -- Hodinová práce
  hodiny      numeric(7, 2),
  sazba       numeric(10, 2),
  -- Měsíční plat. Vyplní se jedno, nebo druhé.
  mesicni     numeric(10, 2),

  premie      numeric(10, 2) not null default 0,
  srazky      numeric(10, 2) not null default 0,
  zalohy      numeric(10, 2) not null default 0,

  -- Hrubá se dopočítá, ale jde přepsat — někdy je potřeba.
  hrube       numeric(10, 2),
  -- Čistou doplní účetní po výpočtu odvodů.
  ciste       numeric(10, 2),

  stav        text not null default 'rozpracovano'
              check (stav in ('rozpracovano','ke_schvaleni','schvaleno','vyplaceno')),
  poznamka    text,
  vyplaceno_at timestamptz,
  upravil     uuid,
  updated_at  timestamptz not null default now(),

  -- Jeden člověk, jeden řádek za měsíc.
  unique (obdobi, user_id)
);

create index if not exists vyplaty_obdobi on vyplaty (obdobi desc);
create index if not exists vyplaty_clovek on vyplaty (user_id, obdobi desc);

-- Výchozí sazba člověka. Přenese se do nového období, aby se
-- nemusela vypisovat každý měsíc znovu.
alter table profiles add column if not exists sazba_hod numeric(10, 2);
alter table profiles add column if not exists mesicni_plat numeric(10, 2);

alter table vyplaty enable row level security;
