-- Keep-warm (migratie 017) weer verwijderen: sinds de overstap van Nano naar
-- Micro-compute (2026-10-19) swapt de database niet meer en blijven de
-- responstijden ook na stilte 0,1–0,3 s. De job is daarmee overbodig.

select cron.unschedule(jobid) from cron.job where jobname = 'keep-warm';

drop function if exists maintenance.keep_warm();
drop schema if exists maintenance;
drop extension if exists pg_prewarm;
