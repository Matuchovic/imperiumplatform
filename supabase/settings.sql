-- Nastavení systému. Jediný řádek, ať se nedá omylem rozmnožit.

create table if not exists app_settings (
  id                 boolean primary key default true check (id),
  platform_name      text    not null default 'BETIMPERIUM',
  tagline            text    not null default '',
  description        text    not null default '',
  language           text    not null default 'cs',
  currency           text    not null default 'CZK',
  timezone           text    not null default 'Europe/Prague',
  week_start         text    not null default 'monday',
  allow_signup       boolean not null default true,
  allow_trial        boolean not null default true,
  approve_clients    boolean not null default false,
  require_2fa_staff  boolean not null default true,
  default_units      numeric(4,1) not null default 2,
  default_sport      text    not null default 'fotbal',
  tip_expiry_minutes integer not null default 120,
  -- Zodpovědné sázení: výchozí stropy pro nové klienty
  default_week_limit  numeric(12,2) not null default 6000,
  default_loss_limit  numeric(12,2) not null default 8000,
  reality_check_min   integer not null default 60,
  retention_days     integer not null default 730,
  updated_at         timestamptz not null default now(),
  updated_by         uuid
);

insert into app_settings (id) values (true) on conflict (id) do nothing;

-- Čte i zapisuje jen server přes service_role. RLS zapnuté bez politik
-- znamená, že anon klíč nevidí ani řádek.
alter table app_settings enable row level security;
