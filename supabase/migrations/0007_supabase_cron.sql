-- =====================================================================
--  Home OS — migracija 0007
--  Zakazivanje preko SUPABASE pg_cron + pg_net (umjesto Vercel Cron).
--  Supabase svakih par minuta pozove POSTOJEĆE rute u aplikaciji
--  (/api/cron/reminders i /api/cron/digest) s CRON_SECRET headerom.
--  Logika ostaje u aplikaciji — mijenja se samo KO okida.
--
--  PRIJE POKRETANJA zamijeni dvije vrijednosti ispod (Find & Replace):
--    __APP_URL__       ->  https://tvoja-app.vercel.app   (bez / na kraju)
--    __CRON_SECRET__   ->  ista vrijednost kao CRON_SECRET u Vercel env
--
--  Pokreni u Supabase → SQL Editor.
-- =====================================================================

-- 1) Ekstenzije (na Supabase su dostupne; ovo ih uključi ako već nisu).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Ukloni stare verzije poslova ako postoje (idempotentno).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'homeos_reminders') then
    perform cron.unschedule('homeos_reminders');
  end if;
  if exists (select 1 from cron.job where jobname = 'homeos_digest') then
    perform cron.unschedule('homeos_digest');
  end if;
end $$;

-- 3) Podsjetnici — SVAKU MINUTU (provjeri i pošalji čim nešto dospije).
select cron.schedule(
  'homeos_reminders',
  '* * * * *',
  $job$
    select net.http_get(
      url     := '__APP_URL__/api/cron/reminders',
      headers := jsonb_build_object('Authorization', 'Bearer __CRON_SECRET__')
    );
  $job$
);

-- 4) Dnevni sažetak (digest) — svaki dan u 07:00 UTC.
select cron.schedule(
  'homeos_digest',
  '0 7 * * *',
  $job$
    select net.http_get(
      url     := '__APP_URL__/api/cron/digest',
      headers := jsonb_build_object('Authorization', 'Bearer __CRON_SECRET__')
    );
  $job$
);

-- =====================================================================
--  Korisne provjere (pokreni po želji):
--    select jobid, jobname, schedule, active from cron.job;
--    select * from cron.job_run_details order by start_time desc limit 20;
--
--  Napomena o tajni: naredba je vidljiva u cron.job tabeli (vidi je samo
--  vlasnik baze). Za jaču zaštitu možeš CRON_SECRET držati u Supabase Vault
--  i čitati ga u naredbi umjesto da ga upišeš direktno.
--
--  Ukloniti zakazivanje (ako zatreba):
--    select cron.unschedule('homeos_reminders');
--    select cron.unschedule('homeos_digest');
-- =====================================================================
