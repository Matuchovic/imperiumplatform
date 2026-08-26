-- ── BEZPEČNOST ───────────────────────────────────────────────
-- Kdo je v systému, odkud a jak dlouho.
--
-- IP adresa je osobní údaj. Ukládá se celá, ale v rozhraní se
-- zobrazuje zkrácená a odkrytí se zapisuje do auditu. Uchování
-- je 90 dní, pak se maže — viz funkce na konci.

create table if not exists relace (
  id            bigserial primary key,
  user_id       uuid not null references auth.users on delete cascade,
  -- Otisk prohlížeče, aby šlo poznat návrat na stejné zařízení.
  otisk         text not null,
  ip            inet,
  zeme          text,
  mesto         text,
  vpn           boolean not null default false,
  zarizeni      text,
  system        text,
  prohlizec     text,
  pwa           boolean not null default false,
  zacatek       timestamptz not null default now(),
  posledni      timestamptz not null default now(),
  ukoncena_at   timestamptz,
  ukoncil       uuid
);

create index if not exists relace_zive on relace (posledni desc) where ukoncena_at is null;
create index if not exists relace_uzivatel on relace (user_id, zacatek desc);
create unique index if not exists relace_otisk on relace (user_id, otisk) where ukoncena_at is null;

create table if not exists bezpecnostni_udalosti (
  id          bigserial primary key,
  typ         text not null
              check (typ in ('prihlaseni','odhlaseni','neuspech','blokace','nova_zeme','nove_zarizeni','vpn')),
  zavaznost   text not null default 'info'
              check (zavaznost in ('info','pozor','zavazne')),
  user_id     uuid,
  email       text,
  ip          inet,
  zeme        text,
  detail      text,
  created_at  timestamptz not null default now()
);

create index if not exists udalosti_recent on bezpecnostni_udalosti (created_at desc);
create index if not exists udalosti_zavazne on bezpecnostni_udalosti (created_at desc)
  where zavaznost <> 'info';

create table if not exists blokovane_ip (
  ip          inet primary key,
  duvod       text,
  blokoval    uuid,
  created_at  timestamptz not null default now()
);

-- Úklid po 90 dnech. Bez uvedené lhůty by šlo o zpracování
-- osobních údajů bez pravidla.
create or replace function public.uklid_bezpecnosti()
returns void
language sql
security definer
set search_path = public
as $$
  delete from relace where zacatek < now() - interval '90 days';
  delete from bezpecnostni_udalosti where created_at < now() - interval '90 days';
$$;

alter table relace enable row level security;
alter table bezpecnostni_udalosti enable row level security;
alter table blokovane_ip enable row level security;
