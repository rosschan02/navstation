-- Migration: Unified sites structure
-- Version: 2.0.0
-- Date: 2026-01-29
-- Description: Merge sites, resources, qr_codes into unified sites table

-- Step 1: Add type and sort_order to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'site' CHECK (type IN ('site', 'qrcode', 'software'));
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Step 2: Create backup of old tables
-- CREATE TABLE sites_backup AS SELECT * FROM sites;
-- CREATE TABLE resources_backup AS SELECT * FROM resources;
-- CREATE TABLE qr_codes_backup AS SELECT * FROM qr_codes;

-- Step 3: Create new sites table structure (if not exists, add new columns)
ALTER TABLE sites ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS logo TEXT DEFAULT '';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS icon_bg VARCHAR(100) DEFAULT 'bg-slate-100';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS icon_color VARCHAR(100) DEFAULT 'text-slate-600';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS qr_image TEXT DEFAULT '';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Rename icon column if it's TEXT to VARCHAR (skip if already correct)
-- ALTER TABLE sites ALTER COLUMN icon TYPE VARCHAR(100);

-- Step 4: Create categories for old resource pages
INSERT INTO categories (name, label, type, icon, icon_bg, icon_color, sort_order)
VALUES
    ('dev', '开发工具', 'site', 'terminal', 'bg-green-100', 'text-green-600', 1),
    ('design', '设计资源', 'site', 'palette', 'bg-pink-100', 'text-pink-600', 2),
    ('read', '阅读', 'site', 'menu_book', 'bg-amber-100', 'text-amber-600', 3),
    ('fun', '娱乐', 'site', 'sports_esports', 'bg-purple-100', 'text-purple-600', 4),
    ('shop', '购物', 'site', 'shopping_bag', 'bg-orange-100', 'text-orange-600', 5)
ON CONFLICT (name) DO UPDATE SET
    type = EXCLUDED.type,
    sort_order = EXCLUDED.sort_order;

-- Step 5: Migrate resources to sites
INSERT INTO sites (name, description, url, category_id, icon, icon_bg, icon_color, tags, sort_order, status, created_at)
SELECT
    r.title,
    r.description,
    r.url,
    c.id,
    COALESCE(NULLIF(r.icon, ''), 'link'),
    COALESCE(NULLIF(r.icon_bg, ''), 'bg-slate-100'),
    COALESCE(NULLIF(r.icon_color, ''), 'text-slate-600'),
    r.tags,
    r.sort_order,
    'active',
    r.created_at
FROM resources r
LEFT JOIN categories c ON c.name = r.page
WHERE NOT EXISTS (
    SELECT 1 FROM sites s WHERE s.name = r.title AND s.url = r.url
);

-- Step 6: Create QR code category and migrate qr_codes
INSERT INTO categories (name, label, type, icon, icon_bg, icon_color, sort_order)
VALUES ('qrcode', '公众号/小程序', 'qrcode', 'qr_code_2', 'bg-blue-100', 'text-blue-600', 10)
ON CONFLICT (name) DO UPDATE SET type = 'qrcode';

INSERT INTO sites (name, description, url, category_id, icon, icon_bg, icon_color, qr_image, sort_order, status, created_at)
SELECT
    q.name,
    q.category,
    '',
    (SELECT id FROM categories WHERE name = 'qrcode'),
    COALESCE(NULLIF(q.icon, ''), 'qr_code_2'),
    COALESCE(NULLIF(q.icon_bg, ''), 'bg-blue-100'),
    COALESCE(NULLIF(q.icon_color, ''), 'text-blue-600'),
    q.qr_image,
    q.sort_order,
    'active',
    q.created_at
FROM qr_codes q
WHERE NOT EXISTS (
    SELECT 1 FROM sites s WHERE s.name = q.name AND s.qr_image = q.qr_image
);

-- Step 7: Create software category
INSERT INTO categories (name, label, type, icon, icon_bg, icon_color, sort_order)
VALUES ('software', '软件下载', 'software', 'download', 'bg-teal-100', 'text-teal-600', 11)
ON CONFLICT (name) DO UPDATE SET type = 'software';

-- Step 8: Link software to category
ALTER TABLE software ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
UPDATE software SET category_id = (SELECT id FROM categories WHERE name = 'software') WHERE category_id IS NULL;

-- Step 9: Create indexes
CREATE INDEX IF NOT EXISTS idx_sites_category ON sites(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_software_category ON software(category_id);

-- Step 10: Update click_events target_type check (optional - may need manual intervention)
-- ALTER TABLE click_events DROP CONSTRAINT IF EXISTS click_events_target_type_check;
-- ALTER TABLE click_events ADD CONSTRAINT click_events_target_type_check CHECK (target_type IN ('site', 'software'));

-- Note: After verifying migration, you can drop old tables:
-- DROP TABLE IF EXISTS resources;
-- DROP TABLE IF EXISTS qr_codes;
