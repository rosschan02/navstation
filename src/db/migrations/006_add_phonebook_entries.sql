-- Migration: Add phonebook entries table
-- Version: 006
-- Description: Add phonebook_entries table for quick department phone lookup

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

CREATE INDEX IF NOT EXISTS idx_phonebook_department ON phonebook_entries(department_name);
CREATE INDEX IF NOT EXISTS idx_phonebook_status ON phonebook_entries(status);
