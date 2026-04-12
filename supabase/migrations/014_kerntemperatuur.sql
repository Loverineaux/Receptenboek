-- Add kerntemperatuur column to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS kerntemperatuur text;
