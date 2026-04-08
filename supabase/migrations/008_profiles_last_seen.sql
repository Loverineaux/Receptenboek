-- Add last_seen column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();

-- Update all existing profiles to now
UPDATE profiles SET last_seen = now() WHERE last_seen IS NULL;
