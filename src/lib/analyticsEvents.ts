import pool from '@/db';

export type AnalyticsEventType =
  | 'nav_click'
  | 'software_download'
  | 'weather_query'
  | 'phonebook_query'
  | 'region_online_query'
  | 'admin_division_query';

export type AnalyticsTargetType = 'site' | 'software' | 'tool';

export interface AnalyticsEventInput {
  eventType: AnalyticsEventType;
  targetType?: AnalyticsTargetType | null;
  targetId?: number | null;
  targetName?: string | null;
  categoryId?: number | null;
  categoryLabel?: string | null;
  page?: string | null;
  visitorId?: string | null;
  clientIp?: string | null;
  searchQuery?: string | null;
  hasSearch?: boolean;
  metadata?: Record<string, unknown>;
}

let ensureTablePromise: Promise<void> | null = null;

function normalizeText(value: string | null | undefined, maxLength: number): string {
  if (!value) return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function normalizeSearchQuery(value: string | null | undefined): string {
  if (!value) return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, 200);
}

function normalizeVisitorId(value: string | null | undefined): string {
  return normalizeText(value, 64) || 'anon';
}

function normalizePage(value: string | null | undefined): string {
  return normalizeText(value, 32) || 'direct';
}

function sanitizeMetadata(value: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  );
}

export async function ensureAnalyticsEventsTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await pool.query(`
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
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
        ON analytics_events(created_at DESC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created_at
        ON analytics_events(event_type, created_at DESC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_analytics_events_target
        ON analytics_events(target_type, target_id)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id
        ON analytics_events(visitor_id)
      `);
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
}

export async function recordAnalyticsEvent(input: AnalyticsEventInput): Promise<void> {
  await ensureAnalyticsEventsTable();

  await pool.query(
    `INSERT INTO analytics_events (
      event_type,
      target_type,
      target_id,
      target_name,
      category_id,
      category_label,
      page,
      visitor_id,
      client_ip,
      search_query,
      has_search,
      metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)`,
    [
      input.eventType,
      input.targetType || null,
      input.targetId ?? null,
      normalizeText(input.targetName, 200),
      input.categoryId ?? null,
      normalizeText(input.categoryLabel, 100),
      normalizePage(input.page),
      normalizeVisitorId(input.visitorId),
      normalizeText(input.clientIp, 64),
      normalizeSearchQuery(input.searchQuery),
      Boolean(input.hasSearch),
      JSON.stringify(sanitizeMetadata(input.metadata)),
    ]
  );
}
