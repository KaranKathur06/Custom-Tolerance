-- Settings Control Plane: non-destructive metadata evolution.
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS value_type TEXT,
  ADD COLUMN IF NOT EXISTS default_value JSONB,
  ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_editable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_platform_settings_category
  ON public.platform_settings(category);

CREATE INDEX IF NOT EXISTS idx_platform_settings_updated_at
  ON public.platform_settings(updated_at DESC);

INSERT INTO public.permissions (code, module, resource, action, description)
VALUES
  ('settings.general.read', 'settings', 'general', 'read', 'Read general platform settings'),
  ('settings.general.update', 'settings', 'general', 'update', 'Update general platform settings'),
  ('settings.registration.read', 'settings', 'registration', 'read', 'Read registration settings'),
  ('settings.registration.update', 'settings', 'registration', 'update', 'Update registration settings'),
  ('settings.verification.read', 'settings', 'verification', 'read', 'Read verification settings'),
  ('settings.verification.update', 'settings', 'verification', 'update', 'Update verification settings'),
  ('settings.rfq.read', 'settings', 'rfq', 'read', 'Read RFQ settings'),
  ('settings.rfq.update', 'settings', 'rfq', 'update', 'Update RFQ settings'),
  ('settings.marketplace.read', 'settings', 'marketplace', 'read', 'Read marketplace settings'),
  ('settings.marketplace.update', 'settings', 'marketplace', 'update', 'Update marketplace settings'),
  ('settings.uploads.read', 'settings', 'uploads', 'read', 'Read upload settings'),
  ('settings.uploads.update', 'settings', 'uploads', 'update', 'Update upload settings'),
  ('settings.security.read', 'settings', 'security', 'read', 'Read security settings'),
  ('settings.security.update', 'settings', 'security', 'update', 'Update security settings'),
  ('settings.features.read', 'settings', 'features', 'read', 'Read feature flags'),
  ('settings.features.update', 'settings', 'features', 'update', 'Update feature flags'),
  ('settings.advanced.read', 'settings', 'advanced', 'read', 'Read advanced configuration'),
  ('settings.advanced.update', 'settings', 'advanced', 'update', 'Update advanced configuration')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', p.id
FROM public.permissions p
WHERE p.code IN (
  'settings.general.read', 'settings.registration.read', 'settings.verification.read',
  'settings.rfq.read', 'settings.marketplace.read', 'settings.uploads.read',
  'settings.features.read'
)
ON CONFLICT DO NOTHING;

UPDATE public.platform_settings
SET category = CASE key
  WHEN 'maintenance_mode' THEN 'general'
  WHEN 'marketplace_status' THEN 'marketplace'
  WHEN 'registration_controls' THEN 'registration'
  WHEN 'verification_policies' THEN 'verification'
  ELSE COALESCE(category, 'advanced')
END,
value_type = CASE jsonb_typeof(value)
  WHEN 'boolean' THEN 'boolean'
  WHEN 'number' THEN 'number'
  WHEN 'array' THEN 'array'
  WHEN 'object' THEN 'object'
  ELSE 'string'
END,
default_value = COALESCE(default_value, value),
updated_at = COALESCE(updated_at, now())
WHERE category IS NULL OR value_type IS NULL OR default_value IS NULL;