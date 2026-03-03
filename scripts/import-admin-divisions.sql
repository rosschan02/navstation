-- Import 4-level administrative divisions into PostgreSQL
--
-- Usage:
--   1) Ensure migration `src/db/migrations/011_add_admin_divisions.sql` has been executed.
--   2) Convert Excel to clean CSV (12 columns only).
--   3) Run:
--      psql "$DATABASE_URL" -f scripts/import-admin-divisions.sql
--
-- Optional: change CSV path here before running.
-- Note: psql `\copy` does not consistently handle variables across environments,
-- so keep this path literal for portability.

TRUNCATE TABLE admin_divisions_import;

\copy admin_divisions_import (name_prov, enname_prov, code_prov, name_city, enname_city, code_city, name_coun, enname_coun, code_coun, name_town, enname_town, code_town) FROM 'data/admin_code_251218.clean.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

BEGIN;

-- Level 1: Province
INSERT INTO admin_divisions (
    level, code, parent_level, parent_code, name_zh, name_en, province_code, city_code, county_code, town_code, updated_at
)
SELECT
    1 AS level,
    code_prov AS code,
    NULL AS parent_level,
    NULL AS parent_code,
    MIN(name_prov) AS name_zh,
    COALESCE(MIN(enname_prov), '') AS name_en,
    code_prov AS province_code,
    NULL,
    NULL,
    NULL,
    NOW()
FROM admin_divisions_import
WHERE code_prov <> ''
GROUP BY code_prov
ON CONFLICT (level, code) DO UPDATE SET
    parent_level = EXCLUDED.parent_level,
    parent_code = EXCLUDED.parent_code,
    level = EXCLUDED.level,
    name_zh = EXCLUDED.name_zh,
    name_en = EXCLUDED.name_en,
    province_code = EXCLUDED.province_code,
    city_code = EXCLUDED.city_code,
    county_code = EXCLUDED.county_code,
    town_code = EXCLUDED.town_code,
    updated_at = NOW();

-- Level 2: City
INSERT INTO admin_divisions (
    level, code, parent_level, parent_code, name_zh, name_en, province_code, city_code, county_code, town_code, updated_at
)
SELECT
    2 AS level,
    code_city AS code,
    1 AS parent_level,
    MIN(code_prov) AS parent_code,
    MIN(name_city) AS name_zh,
    COALESCE(MIN(enname_city), '') AS name_en,
    MIN(code_prov) AS province_code,
    code_city AS city_code,
    NULL,
    NULL,
    NOW()
FROM admin_divisions_import
WHERE code_prov <> '' AND code_city <> ''
GROUP BY code_city
ON CONFLICT (level, code) DO UPDATE SET
    parent_level = EXCLUDED.parent_level,
    parent_code = EXCLUDED.parent_code,
    level = EXCLUDED.level,
    name_zh = EXCLUDED.name_zh,
    name_en = EXCLUDED.name_en,
    province_code = EXCLUDED.province_code,
    city_code = EXCLUDED.city_code,
    county_code = EXCLUDED.county_code,
    town_code = EXCLUDED.town_code,
    updated_at = NOW();

-- Level 3: County / District
INSERT INTO admin_divisions (
    level, code, parent_level, parent_code, name_zh, name_en, province_code, city_code, county_code, town_code, updated_at
)
SELECT
    3 AS level,
    code_coun AS code,
    2 AS parent_level,
    MIN(code_city) AS parent_code,
    MIN(name_coun) AS name_zh,
    COALESCE(MIN(enname_coun), '') AS name_en,
    MIN(code_prov) AS province_code,
    MIN(code_city) AS city_code,
    code_coun AS county_code,
    NULL,
    NOW()
FROM admin_divisions_import
WHERE code_prov <> '' AND code_city <> '' AND code_coun <> ''
GROUP BY code_coun
ON CONFLICT (level, code) DO UPDATE SET
    parent_level = EXCLUDED.parent_level,
    parent_code = EXCLUDED.parent_code,
    level = EXCLUDED.level,
    name_zh = EXCLUDED.name_zh,
    name_en = EXCLUDED.name_en,
    province_code = EXCLUDED.province_code,
    city_code = EXCLUDED.city_code,
    county_code = EXCLUDED.county_code,
    town_code = EXCLUDED.town_code,
    updated_at = NOW();

-- Level 4: Town / Street
INSERT INTO admin_divisions (
    level, code, parent_level, parent_code, name_zh, name_en, province_code, city_code, county_code, town_code, updated_at
)
SELECT
    4 AS level,
    code_town AS code,
    3 AS parent_level,
    MIN(code_coun) AS parent_code,
    MIN(name_town) AS name_zh,
    COALESCE(MIN(enname_town), '') AS name_en,
    MIN(code_prov) AS province_code,
    MIN(code_city) AS city_code,
    MIN(code_coun) AS county_code,
    code_town AS town_code,
    NOW()
FROM admin_divisions_import
WHERE code_prov <> '' AND code_city <> '' AND code_coun <> '' AND code_town <> ''
GROUP BY code_town
ON CONFLICT (level, code) DO UPDATE SET
    parent_level = EXCLUDED.parent_level,
    parent_code = EXCLUDED.parent_code,
    level = EXCLUDED.level,
    name_zh = EXCLUDED.name_zh,
    name_en = EXCLUDED.name_en,
    province_code = EXCLUDED.province_code,
    city_code = EXCLUDED.city_code,
    county_code = EXCLUDED.county_code,
    town_code = EXCLUDED.town_code,
    updated_at = NOW();

-- Mark whether each region has selectable child regions.
UPDATE admin_divisions d
SET has_children = EXISTS (
        SELECT 1
        FROM admin_divisions c
        WHERE c.parent_level = d.level
          AND c.parent_code = d.code
    ),
    updated_at = NOW();

-- Build full path for detail pages.
WITH RECURSIVE division_path AS (
    SELECT
        code,
        level,
        parent_level,
        parent_code,
        name_zh,
        name_en,
        name_zh::TEXT AS path_zh,
        NULLIF(name_en, '')::TEXT AS path_en
    FROM admin_divisions
    WHERE parent_level IS NULL AND parent_code IS NULL

    UNION ALL

    SELECT
        child.code,
        child.level,
        child.parent_level,
        child.parent_code,
        child.name_zh,
        child.name_en,
        parent.path_zh || '/' || child.name_zh AS path_zh,
        CASE
            WHEN COALESCE(child.name_en, '') = '' THEN parent.path_en
            WHEN COALESCE(parent.path_en, '') = '' THEN child.name_en
            ELSE parent.path_en || '/' || child.name_en
        END AS path_en
    FROM admin_divisions child
    JOIN division_path parent
      ON child.parent_level = parent.level
     AND child.parent_code = parent.code
)
UPDATE admin_divisions d
SET full_name_zh = p.path_zh,
    full_name_en = COALESCE(p.path_en, ''),
    updated_at = NOW()
FROM division_path p
WHERE d.level = p.level
  AND d.code = p.code;

COMMIT;

-- Basic checks:
-- SELECT level, COUNT(*) FROM admin_divisions GROUP BY level ORDER BY level;
-- SELECT code, name_zh, full_name_zh FROM admin_divisions WHERE level = 4 AND name_zh LIKE '%镇%' LIMIT 20;
