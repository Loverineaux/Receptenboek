-- Add extraction counter to profiles for donation nudge tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extraction_count integer DEFAULT 0;
