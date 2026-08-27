-- ── HLAS ─────────────────────────────────────────────────────
-- Úložiště namluvených vět. Každá se vygeneruje jednou a zůstane
-- tu — ElevenLabs účtuje za znaky, takže opakované generování
-- téhož je zbytečná útrata.

insert into storage.buckets (id, name, public)
values ('hlas', 'hlas', false)
on conflict (id) do nothing;

-- Vybraný hlas. V databázi, ne v prostředí — měnit ho po každém
-- poslechu přes Vercel a čekat na nasazení by bylo nepoužitelné.
create table if not exists hlas_nastaveni (
  id          integer primary key default 1 check (id = 1),
  hlas_id     text,
  hlas_nazev  text,
  -- Model. Novější zvládají češtinu lépe, ale stojí víc.
  model       text not null default 'eleven_multilingual_v2',
  updated_at  timestamptz not null default now()
);

insert into hlas_nastaveni (id) values (1) on conflict (id) do nothing;

alter table hlas_nastaveni enable row level security;
