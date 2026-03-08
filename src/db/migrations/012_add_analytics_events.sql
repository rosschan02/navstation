CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(32) NOT NULL CHECK (
        event_type IN (
            'nav_click',
            'software_download',
            'weather_query',
            'phonebook_query',
            'region_online_query',
            'admin_division_query'
        )
    ),
    target_type VARCHAR(16) CHECK (target_type IN ('site', 'software', 'tool')),
    target_id INTEGER,
    target_name VARCHAR(200) NOT NULL DEFAULT '',
    category_id INTEGER,
    category_label VARCHAR(100) NOT NULL DEFAULT '',
    page VARCHAR(32) NOT NULL DEFAULT 'direct',
    visitor_id VARCHAR(64) NOT NULL DEFAULT 'anon',
    client_ip VARCHAR(64) NOT NULL DEFAULT '',
    search_query VARCHAR(200) NOT NULL DEFAULT '',
    has_search BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
ON analytics_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created_at
ON analytics_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_target
ON analytics_events(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id
ON analytics_events(visitor_id);
