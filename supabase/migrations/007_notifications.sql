-- ============================================================
-- Feature 7: Notificatiesysteem
-- ============================================================

-- ============================================================
-- Notificaties
-- ============================================================
CREATE TABLE notifications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    actor_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type            text NOT NULL
                    CHECK (type IN ('comment', 'reply', 'favorite', 'rating', 'collection_follow', 'collection_invite')),
    message         text NOT NULL,
    link            text,
    is_read         boolean DEFAULT false,
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (recipient_id) WHERE is_read = false;
CREATE INDEX idx_notifications_actor ON notifications (actor_id);

-- ============================================================
-- Notificatievoorkeuren
-- ============================================================
CREATE TABLE notification_preferences (
    user_id             uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    comment             boolean DEFAULT true,
    reply               boolean DEFAULT true,
    favorite            boolean DEFAULT true,
    rating              boolean DEFAULT true,
    collection_follow   boolean DEFAULT true,
    collection_invite   boolean DEFAULT true,
    push_enabled        boolean DEFAULT true,
    updated_at          timestamptz DEFAULT now()
);

CREATE TRIGGER set_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- Push subscriptions (FCM tokens)
-- ============================================================
CREATE TABLE push_subscriptions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    fcm_token       text UNIQUE NOT NULL,
    device_name     text,
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions (user_id);

-- ============================================================
-- Auto-create preferences voor nieuwe gebruikers
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_profile_preferences()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_preferences
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_preferences();

-- Backfill voor bestaande gebruikers
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles
ON CONFLICT DO NOTHING;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Notifications: gebruikers zien/wijzigen alleen eigen
CREATE POLICY "notifications_select_own" ON notifications
    FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "notifications_update_own" ON notifications
    FOR UPDATE USING (auth.uid() = recipient_id);
CREATE POLICY "notifications_delete_own" ON notifications
    FOR DELETE USING (auth.uid() = recipient_id);

-- Preferences: gebruikers zien/wijzigen alleen eigen
CREATE POLICY "notification_preferences_select_own" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notification_preferences_update_own" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notification_preferences_insert_own" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Push subscriptions: gebruikers zien/wijzigen alleen eigen
CREATE POLICY "push_subscriptions_select_own" ON push_subscriptions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "push_subscriptions_insert_own" ON push_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_subscriptions_delete_own" ON push_subscriptions
    FOR DELETE USING (auth.uid() = user_id);
