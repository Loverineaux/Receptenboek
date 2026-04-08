-- ============================================================
-- Admin Systeem
-- ============================================================

-- Role kolom op profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

-- Blocked kolom op profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

-- Admin instellen
UPDATE profiles SET role = 'admin' WHERE email = 'robinlovink1@gmail.com';

-- ============================================================
-- App instellingen (o.a. toegangscode)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

INSERT INTO app_settings (key, value) VALUES ('registration_access_code', 'KokenMetKokkies2026')
ON CONFLICT DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_settings_admin_select ON app_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY app_settings_admin_update ON app_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- Eigenaarschap voor ingrediënten
-- ============================================================
ALTER TABLE generic_ingredients ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);

-- ============================================================
-- Herbruikbare admin-check functie voor RLS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
