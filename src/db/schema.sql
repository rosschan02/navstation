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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sites_category ON sites(category_id);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_software_category ON software(category_id);
CREATE INDEX IF NOT EXISTS idx_software_created_at ON software(created_at);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_click_events_created_at ON click_events(created_at);
CREATE INDEX IF NOT EXISTS idx_click_events_target ON click_events(target_type, target_id);
