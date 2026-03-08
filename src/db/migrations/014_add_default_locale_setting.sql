INSERT INTO site_settings (key, value, updated_at)
VALUES ('default_locale', 'en', NOW())
ON CONFLICT (key) DO NOTHING;
