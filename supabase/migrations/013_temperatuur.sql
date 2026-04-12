-- Add temperature column to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS temperatuur text;
