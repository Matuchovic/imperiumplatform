-- ── PERSONÁL ─────────────────────────────────────────────────
-- Pracovní údaje k lidem, které už systém zná. Samostatná tabulka
-- by znamenala dva zdroje pravdy o tomtéž člověku — profil by měl
-- roli a personál pozici a časem by si to začalo odporovat.

alter table profiles add column if not exists pozice text;
alter table profiles add column if not exists telefon text;
alter table profiles add column if not exists nastup date;
alter table profiles add column if not exists ukonceni date;
alter table profiles add column if not exists uvazek text
  check (uvazek is null or uvazek in ('hpp','dpp','dpc','osvc','spolecnik'));
alter table profiles add column if not exists poznamka_hr text;

-- Řazení podle nástupu je nejčastější dotaz nad personálem.
create index if not exists profiles_personal on profiles (role, nastup desc)
  where role <> 'klient';
