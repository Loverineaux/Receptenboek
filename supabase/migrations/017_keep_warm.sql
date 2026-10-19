-- Lichte keep-warm voor de kleine (Nano) instance.
--
-- De database heeft ~430 MB RAM en swapt: na een paar minuten stilte staan de
-- pagina's van de hete tabellen op schijf en duurt de eerste query 5-10 s.
-- Deze job raakt elke 2 minuten de tabellen + indexen aan die bij inloggen en
-- het receptenoverzicht nodig zijn, zodat ze in het geheugen blijven.
-- Puur SQL binnen de database: geen HTTP-calls (pg_net), geen Vercel-functies.
-- De echte oplossing is meer geheugen (compute-upgrade); dit is pleisterwerk.

create extension if not exists pg_prewarm with schema extensions;

create schema if not exists maintenance;
revoke all on schema maintenance from public;

create or replace function maintenance.keep_warm()
returns void
language plpgsql
as $$
declare
  rel regclass;
begin
  -- Alle app-tabellen en hun indexen (public is klein, enkele MB) plus de
  -- auth-tabellen die bij inloggen/sessiecontrole worden gelezen.
  for rel in
    select c.oid::regclass
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'i')
      and (
        n.nspname = 'public'
        or (n.nspname = 'auth' and (
              c.relname in ('users', 'identities', 'sessions', 'refresh_tokens', 'flow_state')
              or c.oid in (
                select i.indexrelid from pg_index i
                join pg_class t on t.oid = i.indrelid
                join pg_namespace tn on tn.oid = t.relnamespace
                where tn.nspname = 'auth'
                  and t.relname in ('users', 'identities', 'sessions', 'refresh_tokens', 'flow_state')
              )))
      )
  loop
    begin
      perform extensions.pg_prewarm(rel);
    exception when others then
      -- Geen rechten of relatie net verdwenen: overslaan, volgende proberen.
      null;
    end;
  end loop;

  -- pg_cron logt elke run; houd die tabel klein.
  delete from cron.job_run_details where end_time < now() - interval '1 day';
end;
$$;

revoke all on function maintenance.keep_warm() from public;

select cron.schedule('keep-warm', '*/2 * * * *', 'select maintenance.keep_warm()');
