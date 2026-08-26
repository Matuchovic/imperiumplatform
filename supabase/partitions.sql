-- Oddíly pro odds_snapshots. Bez nich zápis do dělené tabulky selže.
-- Pusť jednou měsíčně, nebo automatizuj přes pg_cron.

do $$
declare d date := current_date;
begin
  for i in 0..60 loop
    execute format(
      'create table if not exists odds_snapshots_%s
         partition of odds_snapshots
         for values from (%L) to (%L)',
      to_char(d + i, 'YYYYMMDD'), d + i, d + i + 1
    );
  end loop;
end $$;
