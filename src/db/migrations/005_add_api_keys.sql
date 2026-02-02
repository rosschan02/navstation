-- Migration: Add API Keys table
-- Version: 005
-- Description: Add api_keys table for external API authentication

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

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
