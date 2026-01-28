-- NavStation Database Schema
-- Target: PostgreSQL 14+

-- Categories for sites and resources
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    css_class VARCHAR(200) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin-managed navigation sites
CREATE TABLE IF NOT EXISTS sites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    url TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    icon TEXT DEFAULT '',
    color_class VARCHAR(200) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resource items for categorized pages (dev/design/read/fun/shop)
CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    url TEXT NOT NULL,
    icon VARCHAR(100) DEFAULT '',
    img TEXT DEFAULT '',
    icon_bg VARCHAR(100) DEFAULT '',
    icon_color VARCHAR(100) DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    page VARCHAR(50) NOT NULL CHECK (page IN ('dev', 'design', 'read', 'fun', 'shop')),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QR code gallery items
CREATE TABLE IF NOT EXISTS qr_codes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) DEFAULT '',
    icon VARCHAR(100) DEFAULT '',
    icon_bg VARCHAR(100) DEFAULT '',
    icon_color VARCHAR(100) DEFAULT '',
    qr_image TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('site', 'resource', 'qr')),
    target_id INTEGER NOT NULL,
    source VARCHAR(100) DEFAULT 'direct',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_click_events_created_at ON click_events(created_at);
CREATE INDEX IF NOT EXISTS idx_click_events_target ON click_events(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_resources_page ON resources(page);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
