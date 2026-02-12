-- DNS management tables for BIND9 integration

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

CREATE INDEX IF NOT EXISTS idx_dns_zones_active ON dns_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_dns_records_zone_id ON dns_records(zone_id);
CREATE INDEX IF NOT EXISTS idx_dns_records_status ON dns_records(status);
CREATE INDEX IF NOT EXISTS idx_dns_records_type ON dns_records(type);
CREATE INDEX IF NOT EXISTS idx_dns_change_logs_zone_created ON dns_change_logs(zone_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dns_change_logs_record_created ON dns_change_logs(record_id, created_at DESC);
