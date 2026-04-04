-- ============================================================
-- Feature 5: Ingrediëntendatabase + Barcodescanner
-- ============================================================

-- ============================================================
-- Generieke ingrediënten
-- ============================================================
CREATE TABLE generic_ingredients (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    name_plural     text,
    category        text,
    aliases         text[] DEFAULT '{}',

    -- Voedingswaarden per 100 gram (gemiddeld uit producten)
    avg_kcal        numeric,
    avg_protein     numeric,
    avg_fat         numeric,
    avg_saturated_fat numeric,
    avg_carbs       numeric,
    avg_sugars      numeric,
    avg_fiber       numeric,
    avg_salt        numeric,
    product_count   integer DEFAULT 0,

    -- Eenheid-conversies
    gram_per_piece  numeric,    -- 1 ui = 150g
    gram_per_ml     numeric,    -- dichtheid (olijfolie: 0.92)
    gram_per_el     numeric,    -- 1 eetlepel = Xg
    gram_per_tl     numeric,    -- 1 theelepel = Xg

    -- Encyclopedie-content (AI-gegenereerd)
    description     text,
    origin          text,
    usage_tips      text,
    storage_tips    text,
    season          text,
    variants        text[] DEFAULT '{}',
    fun_facts       text,

    image_url       text,
    content_generated_at timestamptz,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_generic_ingredients_name ON generic_ingredients (lower(trim(name)));
CREATE INDEX idx_generic_ingredients_category ON generic_ingredients (category);
-- Full-text search via trigram instead (immutable-safe)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_generic_ingredients_name_trgm ON generic_ingredients USING GIN (name gin_trgm_ops);

-- ============================================================
-- Producten (barcode-gescand)
-- ============================================================
CREATE TABLE products (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode             text NOT NULL,
    generic_ingredient_id uuid REFERENCES generic_ingredients(id) ON DELETE SET NULL,
    brand               text,
    product_name        text NOT NULL,
    weight_grams        numeric,
    weight_ml           numeric,

    -- Voedingswaarden per 100g (exact, van verpakking)
    kcal                numeric,
    protein             numeric,
    fat                 numeric,
    saturated_fat       numeric,
    carbs               numeric,
    sugars              numeric,
    fiber               numeric,
    salt                numeric,

    image_url           text,
    nutrition_image_url text,

    source              text DEFAULT 'user_scan'
                        CHECK (source IN ('open_food_facts', 'user_scan', 'user_photo')),
    scanned_by          uuid REFERENCES profiles(id),
    verification_count  integer DEFAULT 1,

    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_products_barcode ON products (barcode);
CREATE INDEX idx_products_generic_ingredient ON products (generic_ingredient_id);

-- ============================================================
-- Eenheid-conversietabel
-- ============================================================
CREATE TABLE unit_conversions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_name       text UNIQUE NOT NULL,
    unit_aliases    text[] DEFAULT '{}',
    ml_equivalent   numeric,
    gram_default    numeric,
    notes           text
);

INSERT INTO unit_conversions (unit_name, unit_aliases, ml_equivalent, gram_default, notes) VALUES
    ('eetlepel',    '{"el", "eetl", "tablespoon", "tbsp"}', 15, 15, NULL),
    ('theelepel',   '{"tl", "theel", "teaspoon", "tsp"}', 5, 5, NULL),
    ('kopje',       '{"cup", "kop"}', 240, 240, 'Amerikaans kopje'),
    ('snufje',      '{"pinch"}', NULL, 0.5, 'Zeer kleine hoeveelheid'),
    ('scheutje',    '{"splash", "scheut"}', 15, 15, 'Ongeveer 1 eetlepel'),
    ('glas',        '{"glass"}', 200, 200, 'Standaard glas'),
    ('deciliter',   '{"dl"}', 100, 100, NULL),
    ('liter',       '{"l"}', 1000, 1000, NULL),
    ('milliliter',  '{"ml"}', 1, 1, NULL),
    ('gram',        '{"g"}', NULL, 1, NULL),
    ('kilogram',    '{"kg"}', NULL, 1000, NULL);

-- ============================================================
-- Koppeling: recept-ingrediënt → generiek ingrediënt
-- ============================================================
ALTER TABLE ingredients
    ADD COLUMN generic_ingredient_id uuid REFERENCES generic_ingredients(id) ON DELETE SET NULL;
CREATE INDEX idx_ingredients_generic ON ingredients (generic_ingredient_id);

-- ============================================================
-- Triggers
-- ============================================================
CREATE TRIGGER set_generic_ingredients_updated_at
    BEFORE UPDATE ON generic_ingredients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- Herbereken gemiddelde voedingswaarden
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_generic_nutrition(ingredient_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    UPDATE generic_ingredients SET
        avg_kcal = sub.avg_kcal, avg_protein = sub.avg_protein,
        avg_fat = sub.avg_fat, avg_saturated_fat = sub.avg_saturated_fat,
        avg_carbs = sub.avg_carbs, avg_sugars = sub.avg_sugars,
        avg_fiber = sub.avg_fiber, avg_salt = sub.avg_salt,
        product_count = sub.cnt, updated_at = now()
    FROM (
        SELECT AVG(kcal) avg_kcal, AVG(protein) avg_protein, AVG(fat) avg_fat,
               AVG(saturated_fat) avg_saturated_fat, AVG(carbs) avg_carbs,
               AVG(sugars) avg_sugars, AVG(fiber) avg_fiber, AVG(salt) avg_salt,
               COUNT(*)::integer cnt
        FROM products
        WHERE generic_ingredient_id = ingredient_id AND kcal IS NOT NULL
    ) sub
    WHERE id = ingredient_id;
END; $$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE generic_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generic_ingredients_select_all" ON generic_ingredients FOR SELECT USING (true);
CREATE POLICY "generic_ingredients_insert_auth" ON generic_ingredients FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "generic_ingredients_update_auth" ON generic_ingredients FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "products_select_all" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert_auth" ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "products_update_auth" ON products FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "unit_conversions_select_all" ON unit_conversions FOR SELECT USING (true);

-- ============================================================
-- Seed data: veelvoorkomende ingrediënten
-- ============================================================
INSERT INTO generic_ingredients (name, name_plural, category, aliases, gram_per_piece, gram_per_el, gram_per_tl) VALUES
    -- Groente
    ('ui', 'uien', 'groente', '{"ajuin", "sjalot"}', 150, NULL, NULL),
    ('rode ui', 'rode uien', 'groente', '{}', 130, NULL, NULL),
    ('sjalot', 'sjalotten', 'groente', '{"sjalotje"}', 30, NULL, NULL),
    ('knoflook', NULL, 'groente', '{"knoflookteen", "teen knoflook"}', NULL, NULL, NULL),
    ('knoflookteen', 'knoflooktenen', 'groente', '{"teen knoflook", "teentje knoflook"}', 5, NULL, NULL),
    ('tomaat', 'tomaten', 'groente', '{"trostomaat", "vleestomaat"}', 120, NULL, NULL),
    ('cherrytomaat', 'cherrytomaten', 'groente', '{"cherrytomaatjes", "snoeptomaat", "snoeptomaatjes"}', 15, NULL, NULL),
    ('paprika', 'paprika''s', 'groente', '{"rode paprika", "groene paprika", "gele paprika", "puntpaprika"}', 160, NULL, NULL),
    ('wortel', 'wortelen', 'groente', '{"winterwortel", "winterpeen", "peen", "bospeen"}', 80, NULL, NULL),
    ('courgette', 'courgettes', 'groente', '{}', 250, NULL, NULL),
    ('aubergine', 'aubergines', 'groente', '{}', 300, NULL, NULL),
    ('broccoli', NULL, 'groente', '{"broccoliroosjes"}', 350, NULL, NULL),
    ('bloemkool', NULL, 'groente', '{"bloemkoolroosjes"}', 600, NULL, NULL),
    ('spinazie', NULL, 'groente', '{"verse spinazie", "babyspinazie"}', NULL, NULL, NULL),
    ('sla', NULL, 'groente', '{"kropsla", "ijsbergsla", "veldsla", "rucola", "gemengde sla"}', NULL, NULL, NULL),
    ('komkommer', 'komkommers', 'groente', '{}', 400, NULL, NULL),
    ('champignon', 'champignons', 'groente', '{"kastanjechampignon", "kastanjechampignons"}', 15, NULL, NULL),
    ('prei', NULL, 'groente', '{}', 200, NULL, NULL),
    ('selderij', NULL, 'groente', '{"bleekselderij", "selderijstengel"}', 40, NULL, NULL),
    ('pompoen', NULL, 'groente', '{"flespompoen", "butternut", "butternutpompoen", "hokkaido"}', 1500, NULL, NULL),
    ('zoete aardappel', 'zoete aardappelen', 'groente', '{"bataat", "sweet potato"}', 200, NULL, NULL),
    ('rode biet', 'rode bieten', 'groente', '{"bieten", "bietjes", "kookbietjes"}', 150, NULL, NULL),
    ('venkel', NULL, 'groente', '{"venkelknol"}', 250, NULL, NULL),
    ('asperge', 'asperges', 'groente', '{"groene asperges", "witte asperges"}', 15, NULL, NULL),
    ('spitskool', NULL, 'groente', '{}', 500, NULL, NULL),
    ('radijs', 'radijzen', 'groente', '{"radijsjes"}', 10, NULL, NULL),
    ('mais', NULL, 'groente', '{"suikermais", "maïs", "maïskorrels"}', NULL, NULL, NULL),
    ('tuinerwt', 'tuinerwten', 'groente', '{"doperwten", "erwten"}', NULL, NULL, NULL),

    -- Fruit
    ('citroen', 'citroenen', 'fruit', '{}', 80, NULL, NULL),
    ('limoen', 'limoenen', 'fruit', '{"limoenrasp"}', 60, NULL, NULL),
    ('avocado', 'avocado''s', 'fruit', '{}', 170, NULL, NULL),
    ('appel', 'appels', 'fruit', '{}', 180, NULL, NULL),
    ('banaan', 'bananen', 'fruit', '{}', 120, NULL, NULL),
    ('mango', 'mango''s', 'fruit', '{}', 300, NULL, NULL),
    ('aardbei', 'aardbeien', 'fruit', '{}', 15, NULL, NULL),
    ('framboos', 'frambozen', 'fruit', '{}', 5, NULL, NULL),
    ('nectarine', 'nectarines', 'fruit', '{}', 150, NULL, NULL),

    -- Vlees
    ('kipfilet', NULL, 'vlees', '{"kipfiletblokjes", "kipfiletreepjes", "kippenfilet"}', 175, NULL, NULL),
    ('kippendijfilet', NULL, 'vlees', '{"kipdijfilet", "kippendij", "kippenbout"}', 150, NULL, NULL),
    ('kipgehakt', NULL, 'vlees', '{}', NULL, NULL, NULL),
    ('rundergehakt', NULL, 'vlees', '{"gehakt", "half-om-halfgehakt", "mager gehakt", "mager rundergehakt"}', NULL, NULL, NULL),
    ('spekblokjes', NULL, 'vlees', '{"spek", "ontbijtspek", "spekreepjes", "gerookt spek"}', NULL, NULL, NULL),
    ('lamsrack', NULL, 'vlees', '{"lamskotelet", "lamskoteletten"}', NULL, NULL, NULL),
    ('rosbief', NULL, 'vlees', '{"roastbeef"}', NULL, NULL, NULL),
    ('salami', NULL, 'vlees', '{}', NULL, NULL, NULL),

    -- Vis
    ('zalm', NULL, 'vis', '{"zalmfilet", "zalmfilé", "gerookte zalm"}', 150, NULL, NULL),
    ('garnaal', 'garnalen', 'vis', '{"gamba''s", "garnalen", "hollandse garnalen"}', NULL, NULL, NULL),
    ('tonijn', NULL, 'vis', '{"tonijnfilet", "tonijn uit blik"}', NULL, NULL, NULL),

    -- Zuivel
    ('ei', 'eieren', 'zuivel', '{"kippenei", "scharrelei"}', 60, NULL, NULL),
    ('melk', NULL, 'zuivel', '{"volle melk", "halfvolle melk", "magere melk"}', NULL, NULL, NULL),
    ('boter', NULL, 'zuivel', '{"roomboter", "ongezouten boter"}', NULL, 15, 5),
    ('room', NULL, 'zuivel', '{"slagroom", "kookroom", "crème fraîche"}', NULL, 15, 5),
    ('geraspte kaas', NULL, 'zuivel', '{"kaas", "belegen kaas", "oude kaas", "jong belegen kaas", "Goudse kaas"}', NULL, 10, NULL),
    ('parmezaan', NULL, 'zuivel', '{"parmezaanse kaas", "Parmigiano", "Parmigiano Reggiano", "Pecorino"}', NULL, 8, NULL),
    ('mozzarella', NULL, 'zuivel', '{"verse mozzarella", "burrata", "mini-burrata"}', 125, NULL, NULL),
    ('geitenkaas', NULL, 'zuivel', '{"zachte geitenkaas", "geitenkaasplakjes"}', NULL, NULL, NULL),
    ('feta', NULL, 'zuivel', '{"fetakaas", "witte kaas"}', NULL, NULL, NULL),
    ('yoghurt', NULL, 'zuivel', '{"Griekse yoghurt", "volle yoghurt", "magere yoghurt", "kwark"}', NULL, NULL, NULL),
    ('ricotta', NULL, 'zuivel', '{}', NULL, NULL, NULL),
    ('mascarpone', NULL, 'zuivel', '{}', NULL, NULL, NULL),

    -- Granen & pasta
    ('rijst', NULL, 'granen', '{"witte rijst", "basmatirijst", "jasminrijst", "zilvervliesrijst", "risottorijst"}', NULL, NULL, NULL),
    ('pasta', NULL, 'granen', '{"spaghetti", "penne", "fusilli", "tagliatelle", "linguine", "casarecce", "farfalle", "orzo"}', NULL, NULL, NULL),
    ('couscous', NULL, 'granen', '{"volkoren couscous"}', NULL, NULL, NULL),
    ('aardappel', 'aardappelen', 'granen', '{"aardappels", "krieltjes", "kruimige aardappelen", "vastkokende aardappelen"}', 150, NULL, NULL),
    ('bloem', NULL, 'granen', '{"tarwebloem", "patentbloem", "zelfrijzend bakmeel"}', NULL, 8, 3),
    ('brood', NULL, 'granen', '{"boterham", "broodjes", "ciabatta", "focaccia", "tortilla", "wrap"}', NULL, NULL, NULL),
    ('panko', NULL, 'granen', '{"paneermeel", "broodkruimels"}', NULL, 8, 3),
    ('havermout', NULL, 'granen', '{"havervlokken", "oatmeal"}', NULL, 10, NULL),
    ('kikkererwt', 'kikkererwten', 'granen', '{"kikkererwten uit blik"}', NULL, NULL, NULL),
    ('kidneyboon', 'kidneybonen', 'granen', '{"kidneybonen uit blik"}', NULL, NULL, NULL),
    ('linzen', NULL, 'granen', '{"rode linzen", "groene linzen", "bruine linzen", "belugalinzen"}', NULL, NULL, NULL),

    -- Kruiden & specerijen
    ('zout', NULL, 'kruiden', '{"zeezout", "keltisch zout", "fleur de sel"}', NULL, 18, 6),
    ('peper', NULL, 'kruiden', '{"zwarte peper", "gemalen peper", "versgemalen peper"}', NULL, 6, 2),
    ('paprikapoeder', NULL, 'kruiden', '{"gerookt paprikapoeder", "smoked paprika"}', NULL, 7, 2.5),
    ('komijn', NULL, 'kruiden', '{"komijnpoeder", "cumin"}', NULL, 6, 2),
    ('kurkuma', NULL, 'kruiden', '{"kurkumapoeder", "geelwortel"}', NULL, 7, 3),
    ('kaneel', NULL, 'kruiden', '{"kaneelpoeder", "kaneelstokje"}', NULL, 8, 3),
    ('oregano', NULL, 'kruiden', '{"gedroogde oregano"}', NULL, 3, 1),
    ('basilicum', NULL, 'kruiden', '{"vers basilicum", "basilicumblaadjes"}', 2, NULL, NULL),
    ('peterselie', NULL, 'kruiden', '{"verse peterselie", "platte peterselie", "krulpeterselie"}', NULL, 4, 1.5),
    ('bieslook', NULL, 'kruiden', '{}', NULL, 3, 1),
    ('koriander', NULL, 'kruiden', '{"verse koriander", "korianderblaadjes"}', NULL, 3, 1),
    ('munt', NULL, 'kruiden', '{"verse munt", "muntblaadjes"}', NULL, 3, 1),
    ('tijm', NULL, 'kruiden', '{"verse tijm", "gedroogde tijm", "takjes tijm"}', NULL, 3, 1),
    ('rozemarijn', NULL, 'kruiden', '{"verse rozemarijn", "gedroogde rozemarijn"}', NULL, 4, 1.5),
    ('nootmuskaat', NULL, 'kruiden', '{"gemalen nootmuskaat"}', NULL, 7, 2.5),
    ('chilipeper', NULL, 'kruiden', '{"rode peper", "chilipeper", "chilivlokken", "sambal"}', 10, 5, 2),

    -- Overig
    ('olijfolie', NULL, 'overig', '{"extra vierge olijfolie", "extra virgin"}', NULL, 14, 5),
    ('zonnebloemolie', NULL, 'overig', '{"plantaardige olie", "bakolie", "frituurvet"}', NULL, 14, 5),
    ('sesamolie', NULL, 'overig', '{}', NULL, 14, 5),
    ('sojasaus', NULL, 'overig', '{"ketjap manis", "ketjap", "tamari"}', NULL, 18, 6),
    ('tomatenpuree', NULL, 'overig', '{"tomatenpassata", "gezeefde tomaten", "gepelde tomaten"}', NULL, 16, 5),
    ('mosterd', NULL, 'overig', '{"dijonmosterd", "grove mosterd", "Dijon mosterd", "honingmosterd"}', NULL, 15, 5),
    ('honing', NULL, 'overig', '{}', NULL, 21, 7),
    ('suiker', NULL, 'overig', '{"kristalsuiker", "poedersuiker", "basterdsuiker", "bruine suiker", "rietsuiker"}', NULL, 12, 4),
    ('azijn', NULL, 'overig', '{"witte wijnazijn", "balsamicoazijn", "balsamico", "appelazijn", "rijstazijn"}', NULL, 15, 5),
    ('bouillonblokje', 'bouillonblokjes', 'overig', '{"bouillon", "groentebouillon", "kippenbouillon", "runderbouillon"}', 10, NULL, NULL),
    ('kokosmelk', NULL, 'overig', '{"kokosroom", "kokoscrème"}', NULL, NULL, NULL),
    ('pijnboompit', 'pijnboompitten', 'overig', '{"pijnboompitjes"}', NULL, 10, 3),
    ('cashewnoot', 'cashewnoten', 'overig', '{"cashews"}', NULL, 10, NULL),
    ('walnoot', 'walnoten', 'overig', '{}', NULL, 10, NULL),
    ('pistachenoot', 'pistachenoten', 'overig', '{"pistache", "pistaches"}', NULL, 10, NULL),
    ('hummus', NULL, 'overig', '{}', NULL, 15, NULL),
    ('pesto', NULL, 'overig', '{"groene pesto", "rode pesto"}', NULL, 15, NULL),
    ('tahini', NULL, 'overig', '{"tahin", "sesampasta"}', NULL, 15, 5);
