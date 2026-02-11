-- NavStation Database Schema
-- Target: PostgreSQL 14+
-- Version: 2.0.0

-- Categories for sites (with type support)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'site' CHECK (type IN ('site', 'qrcode', 'software')),
    css_class VARCHAR(200) DEFAULT '',
    icon VARCHAR(100) DEFAULT 'folder',
    icon_bg VARCHAR(100) DEFAULT 'bg-blue-100',
    icon_color VARCHAR(100) DEFAULT 'text-blue-600',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unified sites table (includes regular sites and QR codes)
CREATE TABLE IF NOT EXISTS sites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    url TEXT DEFAULT '',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    logo TEXT DEFAULT '',
    icon VARCHAR(100) DEFAULT 'link',
    icon_bg VARCHAR(100) DEFAULT 'bg-slate-100',
    icon_color VARCHAR(100) DEFAULT 'text-slate-600',
    qr_image TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Software downloads (admin uploads for users to download)
CREATE TABLE IF NOT EXISTS software (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    version VARCHAR(50) DEFAULT '',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    logo TEXT DEFAULT '',
    icon VARCHAR(100) DEFAULT 'download',
    icon_bg VARCHAR(100) DEFAULT 'bg-blue-100',
    icon_color VARCHAR(100) DEFAULT 'text-blue-600',
    sort_order INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    avatar TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Click tracking for analytics
CREATE TABLE IF NOT EXISTS click_events (
    id SERIAL PRIMARY KEY,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('site', 'software')),
    target_id INTEGER NOT NULL,
    source VARCHAR(100) DEFAULT 'direct',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site settings (global configuration)
CREATE TABLE IF NOT EXISTS site_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default settings
INSERT INTO site_settings (key, value) VALUES
    ('site_name', '导航站'),
    ('site_description', '综合导航门户与站点管理仪表板'),
    ('site_version', 'v2.0 中文版'),
    ('footer_text', '© 2024 通用站点导航。保留所有权利。'),
    ('logo_url', '')
ON CONFLICT (key) DO NOTHING;

-- API Keys for external system authentication
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,              -- Key 名称（如：OA系统对接）
    key_prefix VARCHAR(20) NOT NULL,         -- Key 前缀用于识别（如：nav_sk_abc）
    key_hash VARCHAR(255) NOT NULL,          -- Key 的 SHA256 哈希值
    permissions VARCHAR(20) DEFAULT 'read',  -- 权限：read / write
    description TEXT DEFAULT '',             -- 备注说明
    is_active BOOLEAN DEFAULT true,          -- 是否启用
    last_used_at TIMESTAMP WITH TIME ZONE,   -- 最后使用时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phonebook entries for quick department/phone lookup
CREATE TABLE IF NOT EXISTS phonebook_entries (
    id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    short_code CHAR(4) NOT NULL UNIQUE CHECK (short_code ~ '^[0-9]{4}$'),
    long_code VARCHAR(13) NOT NULL UNIQUE CHECK (long_code ~ '^[0-9]{1,13}$'),
    remark TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sites_category ON sites(category_id);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_software_category ON software(category_id);
CREATE INDEX IF NOT EXISTS idx_software_created_at ON software(created_at);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_click_events_created_at ON click_events(created_at);
CREATE INDEX IF NOT EXISTS idx_click_events_target ON click_events(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_phonebook_department ON phonebook_entries(department_name);
CREATE INDEX IF NOT EXISTS idx_phonebook_status ON phonebook_entries(status);
