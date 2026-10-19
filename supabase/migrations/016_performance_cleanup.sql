-- Database-belasting terugdringen (login en recepten laden waren traag).
--
-- 1. Keep-warm cronjob stoppen: riep elke 4 min /api/ping aan, dat op zijn beurt
--    5 API-routes (incl. de zware receptenquery) afvuurde. Dat hield de kleine
--    instance 24/7 bezig, plus pg_net-responses en cron-logs die bleven groeien.
--    Vercel Fluid Compute houdt functies zelf warm; de ping kostte meer dan hij opleverde.
select cron.unschedule(jobid) from cron.job where command like '%/api/ping%';

-- 2. Opgebouwde logs van die job opruimen (alleen responses/logregels, geen app-data).
truncate net._http_response;
truncate cron.job_run_details;

-- 3. Realtime alleen voor tabellen waar de app daadwerkelijk op abonneert
--    (recipes, favorites, ratings, collections, comments, notifications).
--    Elke publicatietabel kost WAL-decoding bij iedere schrijfactie.
alter publication supabase_realtime drop table
  public.ingredients,
  public.steps,
  public.tags,
  public.recipe_tags,
  public.nutrition,
  public.benodigdheden,
  public.comment_likes,
  public.collection_follows,
  public.collection_collaborators,
  public.collection_ratings,
  public.generic_ingredients,
  public.products,
  public.notification_preferences,
  public.push_subscriptions,
  public.app_settings;
