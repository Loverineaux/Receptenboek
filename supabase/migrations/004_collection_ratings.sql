-- Ratings voor collecties (zelfde werking als recept-ratings)
CREATE TABLE collection_ratings (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id   uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sterren         integer NOT NULL CHECK (sterren >= 1 AND sterren <= 5),
    created_at      timestamptz DEFAULT now(),
    UNIQUE (collection_id, user_id)
);

CREATE INDEX idx_collection_ratings_collection_id ON collection_ratings(collection_id);

-- RLS
ALTER TABLE collection_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collection_ratings_select_all"
    ON collection_ratings FOR SELECT USING (true);

CREATE POLICY "collection_ratings_insert_own"
    ON collection_ratings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "collection_ratings_update_own"
    ON collection_ratings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "collection_ratings_delete_own"
    ON collection_ratings FOR DELETE
    USING (auth.uid() = user_id);
