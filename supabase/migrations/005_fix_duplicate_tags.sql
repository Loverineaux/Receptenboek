-- Stap 1: Merge dubbele tags (case-insensitive) naar de juist-gecapitaliseerde versie
-- Voor elke groep duplicaten: behoud de tag met hoofdletter, update recipe_tags, verwijder de rest

DO $$
DECLARE
    keeper RECORD;
    dupe RECORD;
BEGIN
    -- Vind alle tags die duplicaten hebben (case-insensitive)
    FOR keeper IN
        SELECT DISTINCT ON (LOWER(name)) id, name
        FROM tags
        ORDER BY LOWER(name),
            -- Prefer de versie met hoofdletter
            CASE WHEN LEFT(name, 1) = UPPER(LEFT(name, 1)) THEN 0 ELSE 1 END
    LOOP
        -- Update alle recipe_tags die naar een duplicate verwijzen
        FOR dupe IN
            SELECT id FROM tags
            WHERE LOWER(name) = LOWER(keeper.name) AND id != keeper.id
        LOOP
            -- Verplaats recipe_tags naar de keeper, skip als al bestaat
            UPDATE recipe_tags SET tag_id = keeper.id
            WHERE tag_id = dupe.id
            AND NOT EXISTS (
                SELECT 1 FROM recipe_tags rt2
                WHERE rt2.recipe_id = recipe_tags.recipe_id AND rt2.tag_id = keeper.id
            );
            -- Verwijder overgebleven recipe_tags die nu duplicaat zijn
            DELETE FROM recipe_tags WHERE tag_id = dupe.id;
            -- Verwijder de dubbele tag
            DELETE FROM tags WHERE id = dupe.id;
        END LOOP;

        -- Normaliseer de naam naar eerste letter hoofdletter
        UPDATE tags SET name = INITCAP(LOWER(keeper.name)) WHERE id = keeper.id AND name != INITCAP(LOWER(keeper.name));
    END LOOP;
END $$;

-- Stap 2: Maak de unique constraint case-insensitive
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key;
CREATE UNIQUE INDEX tags_name_unique_ci ON tags (LOWER(name));
