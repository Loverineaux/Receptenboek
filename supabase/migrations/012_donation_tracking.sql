-- Add donation tracking columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_donated numeric(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS donation_free_until integer DEFAULT 0;
