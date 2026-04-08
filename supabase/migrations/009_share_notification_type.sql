-- Add share column to notification_preferences
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS share boolean DEFAULT true;
