-- Migration: Add software downloads table
-- Version: 1.2.0
-- Date: 2026-01-29

-- Software downloads (admin uploads for users to download)
CREATE TABLE IF NOT EXISTS software (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    version VARCHAR(50) DEFAULT '',
    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    icon VARCHAR(100) DEFAULT 'download',
    icon_bg VARCHAR(100) DEFAULT 'bg-blue-100',
    icon_color VARCHAR(100) DEFAULT 'text-blue-600',
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_software_created_at ON software(created_at);
