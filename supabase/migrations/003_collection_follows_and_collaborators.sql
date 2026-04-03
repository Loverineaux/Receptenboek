-- Collectienamen moeten globaal uniek zijn
ALTER TABLE collections ADD CONSTRAINT collections_title_unique UNIQUE (title);

-- Volgers van collecties
CREATE TABLE collection_follows (
    user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    created_at    timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, collection_id)
);

CREATE INDEX idx_collection_follows_collection_id ON collection_follows(collection_id);
CREATE INDEX idx_collection_follows_user_id ON collection_follows(user_id);

-- Medewerkers van collecties (max 10, afgedwongen in API)
CREATE TABLE collection_collaborators (
    collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invited_by    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at    timestamptz DEFAULT now(),
    PRIMARY KEY (collection_id, user_id)
);

CREATE INDEX idx_collection_collaborators_user_id ON collection_collaborators(user_id);

-- ─── RLS: collection_follows ───────────────────

ALTER TABLE collection_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collection_follows_select_all"
    ON collection_follows FOR SELECT USING (true);

CREATE POLICY "collection_follows_insert_own"
    ON collection_follows FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "collection_follows_delete_own"
    ON collection_follows FOR DELETE
    USING (auth.uid() = user_id);

-- ─── RLS: collection_collaborators ─────────────

ALTER TABLE collection_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collection_collaborators_select_all"
    ON collection_collaborators FOR SELECT USING (true);

-- Alleen de eigenaar van de collectie mag medewerkers toevoegen
CREATE POLICY "collection_collaborators_insert_owner"
    ON collection_collaborators FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_collaborators.collection_id
            AND collections.user_id = auth.uid()
        )
    );

-- Alleen de eigenaar mag medewerkers verwijderen
CREATE POLICY "collection_collaborators_delete_owner"
    ON collection_collaborators FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_collaborators.collection_id
            AND collections.user_id = auth.uid()
        )
    );

-- ─── Update collection_recipes RLS: owner OR collaborator ───

DROP POLICY "collection_recipes_insert" ON collection_recipes;
DROP POLICY "collection_recipes_delete" ON collection_recipes;

CREATE POLICY "collection_recipes_insert"
    ON collection_recipes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_recipes.collection_id
            AND collections.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM collection_collaborators
            WHERE collection_collaborators.collection_id = collection_recipes.collection_id
            AND collection_collaborators.user_id = auth.uid()
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
        OR EXISTS (
            SELECT 1 FROM collection_collaborators
            WHERE collection_collaborators.collection_id = collection_recipes.collection_id
            AND collection_collaborators.user_id = auth.uid()
        )
    );
