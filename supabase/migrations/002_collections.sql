-- Collecties (kookboeken)
CREATE TABLE collections (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title       text NOT NULL,
    description text,
    image_url   text,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- Collectie-recepten (junction)
CREATE TABLE collection_recipes (
    collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    recipe_id     uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    sort_order    integer DEFAULT 0,
    added_at      timestamptz DEFAULT now(),
    PRIMARY KEY (collection_id, recipe_id)
);

-- Indexen
CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collection_recipes_collection_id ON collection_recipes(collection_id);
CREATE INDEX idx_collection_recipes_recipe_id ON collection_recipes(recipe_id);

-- Updated_at trigger
CREATE TRIGGER set_collections_updated_at
    BEFORE UPDATE ON collections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_recipes ENABLE ROW LEVEL SECURITY;

-- Iedereen kan collecties zien (alles is publiek)
CREATE POLICY "collections_select_all"
    ON collections FOR SELECT USING (true);

CREATE POLICY "collections_insert_own"
    ON collections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "collections_update_own"
    ON collections FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "collections_delete_own"
    ON collections FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "collection_recipes_select_all"
    ON collection_recipes FOR SELECT USING (true);

CREATE POLICY "collection_recipes_insert"
    ON collection_recipes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_recipes.collection_id
            AND collections.user_id = auth.uid()
        )
    );

CREATE POLICY "collection_recipes_delete"
    ON collection_recipes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_recipes.collection_id
            AND collections.user_id = auth.uid()
        )
    );
