-- ── CLOUD ────────────────────────────────────────────────────
-- Soubory a složky. Bucket je PRIVÁTNÍ — přístup jen přes dočasné
-- podepsané odkazy. Veřejný bucket se smlouvami a osobními údaji
-- je díra, která se pozná až když je pozdě.

insert into storage.buckets (id, name, public)
values ('cloud', 'cloud', false)
on conflict (id) do update set public = false;

create table if not exists dokumenty (
  id          bigserial primary key,
  nazev       text not null,
  -- Složka nemá cestu v úložišti ani velikost.
  je_slozka   boolean not null default false,
  rodic_id    bigint references dokumenty on delete cascade,
  -- Cesta v bucketu. U složky null.
  ulozeni     text,
  velikost    bigint not null default 0,
  typ         text,
  druh        text not null default 'ostatni'
              check (druh in ('smlouva','faktura','vypis','doklad','report','ostatni')),
  vlozil      uuid not null,
  vlozil_jmeno text,
  created_at  timestamptz not null default now(),
  -- Koš: soubor zmizí z výpisu, ale v úložišti pořád leží
  -- a poskytovatel ho účtuje dál.
  smazano_at  timestamptz
);

create index if not exists dokumenty_slozka on dokumenty (rodic_id, nazev) where smazano_at is null;
create index if not exists dokumenty_kos on dokumenty (smazano_at) where smazano_at is not null;
create index if not exists dokumenty_druh on dokumenty (druh) where smazano_at is null;

alter table dokumenty enable row level security;

/**
 * Skutečné obsazení úložiště.
 *
 * `celkem` se čte ze `storage.objects`, tedy od úložiště samotného —
 * je pravdivé z principu. Vlastní součet by lhal ve dvou směrech:
 * soubor v koši ze součtu vypadne, ale místo zabírá dál, a když
 * nahrávání spadne mezi uložením souboru a zápisem řádku, zůstane
 * v bucketu kus, o kterém databáze neví.
 */
create or replace function public.obsazeni_cloudu()
returns table (celkem bigint, aktivni bigint, kos bigint, osirele bigint)
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  v_celkem bigint;
  v_aktivni bigint;
  v_kos bigint;
begin
  select coalesce(sum((o.metadata->>'size')::bigint), 0) into v_celkem
    from storage.objects o where o.bucket_id = 'cloud';

  select coalesce(sum(d.velikost), 0) into v_aktivni
    from public.dokumenty d where d.smazano_at is null and not d.je_slozka;

  select coalesce(sum(d.velikost), 0) into v_kos
    from public.dokumenty d where d.smazano_at is not null and not d.je_slozka;

  return query select
    v_celkem, v_aktivni, v_kos,
    -- Nikdy záporné: kdyby naše čísla přestřelila, je to chyba
    -- v účetnictví, ne důvod ukazovat minus.
    greatest(0, v_celkem - (v_aktivni + v_kos));
end $$;

comment on function public.obsazeni_cloudu is
  'Skutečné obsazení bucketu podle storage.objects, rozpadlé na aktivní, koš a osiřelé.';

-- ── ZÁMEK CLOUDU ─────────────────────────────────────────────
-- Druhá brána před soubory. PIN se ukládá jako otisk, ne otevřeně —
-- databáze tak neobsahuje nic, čím by se dalo odemknout.

create table if not exists cloud_zamek (
  user_id     uuid primary key,
  -- scrypt otisk ve tvaru sul:hash. Z něj se PIN zpětně nezíská.
  otisk       text not null,
  vytvoreno   timestamptz not null default now(),
  zmeneno     timestamptz not null default now(),
  -- Ochrana proti hádání: po pěti pokusech se brána zamkne.
  pokusy      integer not null default 0,
  blokovano_do timestamptz
);

alter table cloud_zamek enable row level security;
