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
    short_code VARCHAR(4) DEFAULT '' CHECK (short_code IS NULL OR short_code = '' OR short_code ~ '^[0-9]{3,4}$'),
    long_code VARCHAR(13) DEFAULT '' CHECK (long_code IS NULL OR long_code = '' OR long_code ~ '^[0-9]{1,13}$'),
    remark TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DNS zones for BIND9 management
CREATE TABLE IF NOT EXISTS dns_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    server VARCHAR(255) NOT NULL DEFAULT '127.0.0.1',
    port INTEGER NOT NULL DEFAULT 53 CHECK (port > 0 AND port <= 65535),
    tsig_key_name VARCHAR(255) NOT NULL DEFAULT '',
    tsig_algorithm VARCHAR(50) NOT NULL DEFAULT 'hmac-sha256',
    tsig_secret TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DNS records managed via BIND9 dynamic update
CREATE TABLE IF NOT EXISTS dns_records (
    id SERIAL PRIMARY KEY,
    zone_id INTEGER NOT NULL REFERENCES dns_zones(id),
    name VARCHAR(255) NOT NULL DEFAULT '@',
    type VARCHAR(10) NOT NULL CHECK (type IN ('A', 'AAAA', 'CNAME', 'TXT', 'MX')),
    ttl INTEGER NOT NULL DEFAULT 300 CHECK (ttl >= 30 AND ttl <= 86400),
    value TEXT NOT NULL,
    priority INTEGER CHECK (priority >= 0 AND priority <= 65535),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_sync_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (last_sync_status IN ('pending', 'success', 'failed', 'skipped')),
    last_sync_message TEXT DEFAULT '',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT dns_records_mx_priority_required CHECK (
      (type = 'MX' AND priority IS NOT NULL) OR (type <> 'MX' AND priority IS NULL)
    )
);

-- DNS operation audit logs
CREATE TABLE IF NOT EXISTS dns_change_logs (
    id SERIAL PRIMARY KEY,
    zone_id INTEGER REFERENCES dns_zones(id) ON DELETE SET NULL,
    record_id INTEGER REFERENCES dns_records(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'sync')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
    request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_message TEXT DEFAULT '',
    operator_type VARCHAR(20) NOT NULL DEFAULT 'system',
    operator_name VARCHAR(100) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_dns_zones_active ON dns_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_dns_records_zone_id ON dns_records(zone_id);
CREATE INDEX IF NOT EXISTS idx_dns_records_status ON dns_records(status);
CREATE INDEX IF NOT EXISTS idx_dns_records_type ON dns_records(type);
CREATE INDEX IF NOT EXISTS idx_dns_change_logs_zone_created ON dns_change_logs(zone_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dns_change_logs_record_created ON dns_change_logs(record_id, created_at DESC);
