-- ============================================================
-- Receptenboek - Initial Database Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- 1. profiles (extends Supabase Auth users)
CREATE TABLE profiles (
    id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       text UNIQUE,
    display_name text,
    avatar_url  text,
    bio         text,
    created_at  timestamptz DEFAULT now()
);

-- 2. recipes
CREATE TABLE recipes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title           text NOT NULL,
    subtitle        text,
    image_url       text,
    tijd            text,
    moeilijkheid    text CHECK (moeilijkheid IN ('Makkelijk', 'Gemiddeld', 'Moeilijk')),
    categorie       text,
    bron            text,
    basis_porties   integer DEFAULT 2,
    is_public       boolean DEFAULT false,
    weetje          text,
    allergenen      text,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- 3. ingredients
CREATE TABLE ingredients (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id   uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    hoeveelheid text,
    eenheid     text,
    naam        text NOT NULL,
    sort_order  integer DEFAULT 0
);

-- 4. steps
CREATE TABLE steps (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id       uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    titel           text,
    beschrijving    text NOT NULL,
    afbeelding_url  text,
    sort_order      integer DEFAULT 0
);

-- 5. tags
CREATE TABLE tags (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text UNIQUE NOT NULL,
    created_by  uuid REFERENCES profiles(id)
);

-- 6. recipe_tags (junction)
CREATE TABLE recipe_tags (
    recipe_id   uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    tag_id      uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (recipe_id, tag_id)
);

-- 7. nutrition
CREATE TABLE nutrition (
    recipe_id       uuid PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
    energie_kcal    text,
    energie_kj      text,
    vetten          text,
    verzadigd       text,
    koolhydraten    text,
    suikers         text,
    vezels          text,
    eiwitten        text,
    zout            text
);

-- 8. ratings
CREATE TABLE ratings (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id   uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sterren     integer NOT NULL CHECK (sterren >= 1 AND sterren <= 5),
    created_at  timestamptz DEFAULT now(),
    UNIQUE (recipe_id, user_id)
);

-- 9. comments
CREATE TABLE comments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id   uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tekst       text NOT NULL,
    parent_id   uuid REFERENCES comments(id),
    created_at  timestamptz DEFAULT now()
);

-- 10. favorites
CREATE TABLE favorites (
    user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipe_id   uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at  timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, recipe_id)
);

-- 11. benodigdheden (kitchen tools needed)
CREATE TABLE benodigdheden (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id   uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    naam        text NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_is_public ON recipes(is_public);

CREATE INDEX idx_ingredients_recipe_id ON ingredients(recipe_id);
CREATE INDEX idx_steps_recipe_id ON steps(recipe_id);
CREATE INDEX idx_recipe_tags_recipe_id ON recipe_tags(recipe_id);
CREATE INDEX idx_recipe_tags_tag_id ON recipe_tags(tag_id);
CREATE INDEX idx_ratings_recipe_id ON ratings(recipe_id);
CREATE INDEX idx_comments_recipe_id ON comments(recipe_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_favorites_recipe_id ON favorites(recipe_id);
CREATE INDEX idx_benodigdheden_recipe_id ON benodigdheden(recipe_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile when a new auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on recipes
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on ALL tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE benodigdheden ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- profiles
-- ----------------------------------------
CREATE POLICY "profiles_select_all"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
    ON profiles FOR DELETE
    USING (auth.uid() = id);

-- Allow the trigger function to insert profiles
CREATE POLICY "profiles_insert_own"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ----------------------------------------
-- recipes
-- ----------------------------------------
CREATE POLICY "recipes_select_all"
    ON recipes FOR SELECT
    USING (true);

CREATE POLICY "recipes_insert_own"
    ON recipes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recipes_update_own"
    ON recipes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recipes_delete_own"
    ON recipes FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------
-- ingredients (follows parent recipe visibility)
-- ----------------------------------------
CREATE POLICY "ingredients_select_all"
    ON ingredients FOR SELECT
    USING (true);

CREATE POLICY "ingredients_insert"
    ON ingredients FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = ingredients.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "ingredients_update"
    ON ingredients FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = ingredients.recipe_id
            AND recipes.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = ingredients.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "ingredients_delete"
    ON ingredients FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = ingredients.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

-- ----------------------------------------
-- steps (follows parent recipe visibility)
-- ----------------------------------------
CREATE POLICY "steps_select_all"
    ON steps FOR SELECT
    USING (true);

CREATE POLICY "steps_insert"
    ON steps FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = steps.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "steps_update"
    ON steps FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = steps.recipe_id
            AND recipes.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = steps.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "steps_delete"
    ON steps FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = steps.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

-- ----------------------------------------
-- nutrition (follows parent recipe visibility)
-- ----------------------------------------
CREATE POLICY "nutrition_select_all"
    ON nutrition FOR SELECT
    USING (true);

CREATE POLICY "nutrition_insert"
    ON nutrition FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = nutrition.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "nutrition_update"
    ON nutrition FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = nutrition.recipe_id
            AND recipes.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = nutrition.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "nutrition_delete"
    ON nutrition FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = nutrition.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

-- ----------------------------------------
-- benodigdheden (follows parent recipe visibility)
-- ----------------------------------------
CREATE POLICY "benodigdheden_select_all"
    ON benodigdheden FOR SELECT
    USING (true);

CREATE POLICY "benodigdheden_insert"
    ON benodigdheden FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = benodigdheden.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "benodigdheden_update"
    ON benodigdheden FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = benodigdheden.recipe_id
            AND recipes.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = benodigdheden.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "benodigdheden_delete"
    ON benodigdheden FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = benodigdheden.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

-- ----------------------------------------
-- tags
-- ----------------------------------------
CREATE POLICY "tags_select_all"
    ON tags FOR SELECT
    USING (true);

CREATE POLICY "tags_insert_authenticated"
    ON tags FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- ----------------------------------------
-- recipe_tags (follows parent recipe visibility)
-- ----------------------------------------
CREATE POLICY "recipe_tags_select_all"
    ON recipe_tags FOR SELECT
    USING (true);

CREATE POLICY "recipe_tags_insert"
    ON recipe_tags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_tags.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "recipe_tags_delete"
    ON recipe_tags FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_tags.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

-- ----------------------------------------
-- ratings
-- ----------------------------------------
CREATE POLICY "ratings_select_all"
    ON ratings FOR SELECT
    USING (true);

CREATE POLICY "ratings_insert_authenticated"
    ON ratings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ratings_update_own"
    ON ratings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ratings_delete_own"
    ON ratings FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------
-- comments
-- ----------------------------------------
CREATE POLICY "comments_select_all"
    ON comments FOR SELECT
    USING (true);

CREATE POLICY "comments_insert_authenticated"
    ON comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete_own"
    ON comments FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------
-- favorites
-- ----------------------------------------
CREATE POLICY "favorites_select_own"
    ON favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own"
    ON favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_own"
    ON favorites FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- SEED DATA: Default tags
-- ============================================================

INSERT INTO tags (name) VALUES
    ('Calorie Smart'),
    ('High Protein'),
    ('Extra Veggies'),
    ('Quick & Easy'),
    ('Comfort Food'),
    ('Family Friendly');
