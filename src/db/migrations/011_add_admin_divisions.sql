-- Administrative divisions (4 levels) + import staging table

CREATE TABLE IF NOT EXISTS admin_divisions (
    level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 4),
    code VARCHAR(12) NOT NULL,
    parent_level SMALLINT CHECK (parent_level BETWEEN 1 AND 4),
    parent_code VARCHAR(12),
    name_zh VARCHAR(64) NOT NULL,
    name_en VARCHAR(128) NOT NULL DEFAULT '',
    province_code VARCHAR(6) NOT NULL,
    city_code VARCHAR(6),
    county_code VARCHAR(6),
    town_code VARCHAR(12),
    has_children BOOLEAN NOT NULL DEFAULT FALSE,
    full_name_zh TEXT NOT NULL DEFAULT '',
    full_name_en TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (level, code),
    FOREIGN KEY (parent_level, parent_code) REFERENCES admin_divisions(level, code) ON DELETE RESTRICT,
    CONSTRAINT admin_divisions_level_shape CHECK (
        (level = 1 AND parent_level IS NULL AND parent_code IS NULL AND city_code IS NULL AND county_code IS NULL AND town_code IS NULL)
        OR
        (level = 2 AND parent_level = 1 AND parent_code IS NOT NULL AND city_code IS NOT NULL AND county_code IS NULL AND town_code IS NULL)
        OR
        (level = 3 AND parent_level = 2 AND parent_code IS NOT NULL AND city_code IS NOT NULL AND county_code IS NOT NULL AND town_code IS NULL)
        OR
        (level = 4 AND parent_level = 3 AND parent_code IS NOT NULL AND city_code IS NOT NULL AND county_code IS NOT NULL AND town_code IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS admin_divisions_import (
    name_prov VARCHAR(64) NOT NULL,
    enname_prov VARCHAR(128) NOT NULL DEFAULT '',
    code_prov VARCHAR(6) NOT NULL,
    name_city VARCHAR(64) NOT NULL,
    enname_city VARCHAR(128) NOT NULL DEFAULT '',
    code_city VARCHAR(6) NOT NULL,
    name_coun VARCHAR(64) NOT NULL,
    enname_coun VARCHAR(128) NOT NULL DEFAULT '',
    code_coun VARCHAR(6) NOT NULL,
    name_town VARCHAR(64) NOT NULL,
    enname_town VARCHAR(128) NOT NULL DEFAULT '',
    code_town VARCHAR(12) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_divisions_parent ON admin_divisions(parent_level, parent_code);
CREATE INDEX IF NOT EXISTS idx_admin_divisions_name_zh ON admin_divisions(name_zh);
CREATE INDEX IF NOT EXISTS idx_admin_divisions_level_name_zh ON admin_divisions(level, name_zh);

-- Trigram index for fast ILIKE '%keyword%' fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_admin_divisions_name_zh_trgm ON admin_divisions USING gin (name_zh gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_admin_divisions_province_city_county ON admin_divisions(province_code, city_code, county_code);
CREATE INDEX IF NOT EXISTS idx_admin_divisions_town_code ON admin_divisions(town_code);
