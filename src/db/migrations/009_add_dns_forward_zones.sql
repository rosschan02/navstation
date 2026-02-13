-- DNS Forward Zones for BIND9 conditional forwarding
-- These zones forward queries to designated DNS servers instead of resolving locally

CREATE TABLE IF NOT EXISTS dns_forward_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    forwarders TEXT NOT NULL,
    forward_policy VARCHAR(10) NOT NULL DEFAULT 'only'
        CHECK (forward_policy IN ('only', 'first')),
    description TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sync_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (last_sync_status IN ('pending', 'success', 'failed', 'skipped')),
    last_sync_message TEXT DEFAULT '',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dns_forward_zones_active ON dns_forward_zones(is_active);
