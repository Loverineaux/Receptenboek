-- Data voor redesign v2 (seizoensbalk + gekookt-teller). Alleen toevoegingen.

-- 1. Seizoensmaanden per ingrediënt (1 = januari … 12 = december).
--    NULL = onbekend; alle 12 maanden = jaarrond. Vult de 12-maandenbalk op het
--    ingrediëntdetail en de "In het seizoen"-carrousel. Het bestaande vrije-tekst-
--    veld `season` blijft bestaan.
alter table public.generic_ingredients
  add column if not exists season_months smallint[]
  check (season_months is null or season_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]);

create index if not exists idx_generic_ingredients_season_months
  on public.generic_ingredients using gin (season_months);

-- 2. Gekookt-historie: één rij per afgeronde kookmodus.
create table if not exists public.cooked_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  cooked_at timestamptz not null default now()
);

create index if not exists idx_cooked_recipes_user on public.cooked_recipes (user_id, cooked_at desc);
create index if not exists idx_cooked_recipes_recipe on public.cooked_recipes (recipe_id);

alter table public.cooked_recipes enable row level security;

create policy cooked_recipes_select_own on public.cooked_recipes
  for select using ((select auth.uid()) = user_id);

create policy cooked_recipes_insert_own on public.cooked_recipes
  for insert with check ((select auth.uid()) = user_id);

create policy cooked_recipes_delete_own on public.cooked_recipes
  for delete using ((select auth.uid()) = user_id);
