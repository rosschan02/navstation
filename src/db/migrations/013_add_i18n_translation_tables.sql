CREATE TABLE IF NOT EXISTS category_translations (
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL DEFAULT '',
    label VARCHAR(100) NOT NULL DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (category_id, locale)
);

CREATE TABLE IF NOT EXISTS site_translations (
    site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL,
    name VARCHAR(200) NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    tags TEXT[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (site_id, locale)
);

CREATE TABLE IF NOT EXISTS software_translations (
    software_id INTEGER NOT NULL REFERENCES software(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL,
    name VARCHAR(200) NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (software_id, locale)
);

CREATE TABLE IF NOT EXISTS site_setting_translations (
    setting_key VARCHAR(100) NOT NULL REFERENCES site_settings(key) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (setting_key, locale)
);

CREATE INDEX IF NOT EXISTS idx_category_translations_locale ON category_translations(locale);
CREATE INDEX IF NOT EXISTS idx_site_translations_locale ON site_translations(locale);
CREATE INDEX IF NOT EXISTS idx_software_translations_locale ON software_translations(locale);
CREATE INDEX IF NOT EXISTS idx_site_setting_translations_locale ON site_setting_translations(locale);
