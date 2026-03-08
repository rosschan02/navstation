import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { authenticate, createAuthErrorResponse, extractApiKey } from '@/lib/apiAuth';
import { parseAnalyticsSource } from '@/lib/analyticsSource';
import { ensureAnalyticsEventsTable } from '@/lib/analyticsEvents';
import type { AnalyticsEventType } from '@/types';

export const dynamic = 'force-dynamic';

interface NewEventRow {
  id: string;
  event_type: AnalyticsEventType;
  target_type: 'site' | 'software' | 'tool' | null;
  target_id: number | null;
  target_name: string;
  category_id: number | null;
  category_label: string;
  page: string;
  visitor_id: string;
  client_ip: string;
  search_query: string;
  has_search: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string | Date;
  site_name: string | null;
  site_url: string | null;
  site_logo: string | null;
  site_icon: string | null;
  site_icon_bg: string | null;
  site_icon_color: string | null;
  site_category_id: number | null;
  site_category_label: string | null;
  software_name: string | null;
  software_logo: string | null;
  software_icon: string | null;
  software_icon_bg: string | null;
  software_icon_color: string | null;
  software_category_id: number | null;
  software_category_label: string | null;
}

interface LegacyEventRow {
  id: number;
  target_type: 'site' | 'software';
  target_id: number;
  source: string | null;
  created_at: string | Date;
  site_name: string | null;
  site_url: string | null;
  site_logo: string | null;
  site_icon: string | null;
  site_icon_bg: string | null;
  site_icon_color: string | null;
  site_category_id: number | null;
  site_category_label: string | null;
  software_name: string | null;
  software_logo: string | null;
  software_icon: string | null;
  software_icon_bg: string | null;
  software_icon_color: string | null;
  software_category_id: number | null;
  software_category_label: string | null;
}

interface UnifiedEvent {
  id: string;
  eventType: AnalyticsEventType;
  targetType: 'site' | 'software' | 'tool' | null;
  targetId: number | null;
  targetName: string;
  categoryId: number | null;
  categoryLabel: string;
  page: string;
  visitorId: string;
  clientIp: string;
  searchQuery: string;
  hasSearch: boolean;
  createdAt: Date;
  siteUrl: string | null;
  logo: string | null;
  icon: string | null;
  iconBg: string | null;
  iconColor: string | null;
}

interface DailyBucket {
  events: number;
  clicks: number;
  queries: number;
  visitors: Set<string>;
}

interface TopItem {
  target_id: number;
  clicks: number;
  name: string;
  url: string | null;
  logo: string | null;
  icon: string | null;
  icon_bg: string | null;
  icon_color: string | null;
}

interface SearchItem {
  query: string;
  count: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const QUERY_EVENT_TYPES = new Set<AnalyticsEventType>([
  'weather_query',
  'phonebook_query',
  'region_online_query',
  'admin_division_query',
]);

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDayKeys(days: number): string[] {
  const keys: string[] = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset--) {
    keys.push(toDayKey(new Date(today.getTime() - offset * ONE_DAY_MS)));
  }
  return keys;
}

function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function clampDays(value: string | null): number {
  const parsed = Number.parseInt(value || '7', 10);
  if (!Number.isFinite(parsed)) return 7;
  return Math.min(90, Math.max(1, parsed));
}

function isQueryEvent(eventType: AnalyticsEventType): boolean {
  return QUERY_EVENT_TYPES.has(eventType);
}

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 200);
}

function buildTopSearches(map: Map<string, number>): SearchItem[] {
  return Array.from(map.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function normalizeNewEvent(row: NewEventRow): UnifiedEvent {
  const isSite = row.target_type === 'site';
  const isSoftware = row.target_type === 'software';
  const targetName = row.target_name
    || (isSite ? row.site_name : row.software_name)
    || (row.target_type === 'tool' ? '工具查询' : `${row.target_type || 'event'} #${row.target_id || '-'}`);
  const categoryId = row.category_id ?? (isSite ? row.site_category_id : row.software_category_id);
  const categoryLabel = row.category_label || (isSite ? row.site_category_label : row.software_category_label) || '';

  return {
    id: row.id,
    eventType: row.event_type,
    targetType: row.target_type,
    targetId: row.target_id,
    targetName,
    categoryId,
    categoryLabel,
    page: row.page || 'direct',
    visitorId: row.visitor_id || 'anon',
    clientIp: row.client_ip || '',
    searchQuery: row.search_query || '',
    hasSearch: row.has_search,
    createdAt: new Date(row.created_at),
    siteUrl: isSite ? row.site_url : null,
    logo: isSite ? row.site_logo : row.software_logo,
    icon: isSite ? (row.site_icon || 'link') : (row.software_icon || 'download'),
    iconBg: isSite ? (row.site_icon_bg || 'bg-slate-100') : (row.software_icon_bg || 'bg-blue-100'),
    iconColor: isSite ? (row.site_icon_color || 'text-slate-500') : (row.software_icon_color || 'text-blue-600'),
  };
}

function normalizeLegacyEvent(row: LegacyEventRow): UnifiedEvent {
  const parsedSource = parseAnalyticsSource(row.source);
  const isSite = row.target_type === 'site';

  return {
    id: `legacy-${row.id}`,
    eventType: isSite ? 'nav_click' : 'software_download',
    targetType: row.target_type,
    targetId: row.target_id,
    targetName: isSite
      ? (row.site_name || `站点 #${row.target_id}`)
      : (row.software_name || `软件 #${row.target_id}`),
    categoryId: isSite ? row.site_category_id : row.software_category_id,
    categoryLabel: isSite ? (row.site_category_label || '未分类') : (row.software_category_label || '未分类'),
    page: parsedSource.page,
    visitorId: parsedSource.visitorId,
    clientIp: '',
    searchQuery: '',
    hasSearch: parsedSource.hasSearch,
    createdAt: new Date(row.created_at),
    siteUrl: isSite ? row.site_url : null,
    logo: isSite ? row.site_logo : row.software_logo,
    icon: isSite ? (row.site_icon || 'link') : (row.software_icon || 'download'),
    iconBg: isSite ? (row.site_icon_bg || 'bg-slate-100') : (row.software_icon_bg || 'bg-blue-100'),
    iconColor: isSite ? (row.site_icon_color || 'text-slate-500') : (row.software_icon_color || 'text-blue-600'),
  };
}

// GET /api/analytics?days=7
// Auth: Public access, or API Key (read permission)
export async function GET(request: NextRequest) {
  if (extractApiKey(request)) {
    const auth = await authenticate(request);
    if (!auth.authenticated) {
      return createAuthErrorResponse(auth);
    }
  }

  await ensureAnalyticsEventsTable();
  const days = clampDays(request.nextUrl.searchParams.get('days'));

  const [newEventsRes, legacyEventsRes, newPreviousRes, legacyPreviousRes] = await Promise.all([
    pool.query<NewEventRow>(
      `SELECT ae.id::text as id, ae.event_type, ae.target_type, ae.target_id, ae.target_name,
              ae.category_id, ae.category_label, ae.page, ae.visitor_id, ae.client_ip,
              ae.search_query, ae.has_search, ae.metadata, ae.created_at,
              s.name as site_name, s.url as site_url, s.logo as site_logo, s.icon as site_icon,
              s.icon_bg as site_icon_bg, s.icon_color as site_icon_color,
              s.category_id as site_category_id, c_site.label as site_category_label,
              sw.name as software_name, sw.logo as software_logo, sw.icon as software_icon,
              sw.icon_bg as software_icon_bg, sw.icon_color as software_icon_color,
              sw.category_id as software_category_id, c_software.label as software_category_label
       FROM analytics_events ae
       LEFT JOIN sites s ON ae.target_type = 'site' AND ae.target_id = s.id
       LEFT JOIN categories c_site ON s.category_id = c_site.id
       LEFT JOIN software sw ON ae.target_type = 'software' AND ae.target_id = sw.id
       LEFT JOIN categories c_software ON sw.category_id = c_software.id
       WHERE ae.created_at >= NOW() - $1::int * INTERVAL '1 day'
       ORDER BY ae.created_at DESC`,
      [days]
    ),
    pool.query<LegacyEventRow>(
      `SELECT ce.id, ce.target_type, ce.target_id, ce.source, ce.created_at,
              s.name as site_name, s.url as site_url, s.logo as site_logo, s.icon as site_icon,
              s.icon_bg as site_icon_bg, s.icon_color as site_icon_color,
              s.category_id as site_category_id, c_site.label as site_category_label,
              sw.name as software_name, sw.logo as software_logo, sw.icon as software_icon,
              sw.icon_bg as software_icon_bg, sw.icon_color as software_icon_color,
              sw.category_id as software_category_id, c_software.label as software_category_label
       FROM click_events ce
       LEFT JOIN sites s ON ce.target_type = 'site' AND ce.target_id = s.id
       LEFT JOIN categories c_site ON s.category_id = c_site.id
       LEFT JOIN software sw ON ce.target_type = 'software' AND ce.target_id = sw.id
       LEFT JOIN categories c_software ON sw.category_id = c_software.id
       WHERE ce.created_at >= NOW() - $1::int * INTERVAL '1 day'
       ORDER BY ce.created_at DESC`,
      [days]
    ),
    pool.query<{ total: string }>(
      `SELECT count(*) as total
       FROM analytics_events
       WHERE created_at >= NOW() - ($1::int * 2) * INTERVAL '1 day'
         AND created_at < NOW() - $1::int * INTERVAL '1 day'`,
      [days]
    ),
    pool.query<{ total: string }>(
      `SELECT count(*) as total
       FROM click_events
       WHERE created_at >= NOW() - ($1::int * 2) * INTERVAL '1 day'
         AND created_at < NOW() - $1::int * INTERVAL '1 day'`,
      [days]
    ),
  ]);

  const events = [
    ...newEventsRes.rows.map(normalizeNewEvent),
    ...legacyEventsRes.rows.map(normalizeLegacyEvent),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const previousPeriodTotal =
    Number.parseInt(newPreviousRes.rows[0]?.total || '0', 10)
    + Number.parseInt(legacyPreviousRes.rows[0]?.total || '0', 10);

  const dayKeys = getDayKeys(days);
  const todayKey = dayKeys[dayKeys.length - 1];
  const yesterdayKey = dayKeys[dayKeys.length - 2] || todayKey;

  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, events: 0 }));
  const dailyMap = new Map<string, DailyBucket>();
  for (const key of dayKeys) {
    dailyMap.set(key, { events: 0, clicks: 0, queries: 0, visitors: new Set() });
  }

  const sourcePageMap = new Map<string, number>();
  const categoryMap = new Map<string, { category_id: number | null; label: string; clicks: number; nav_clicks: number; software_downloads: number }>();
  const siteMap = new Map<number, TopItem>();
  const softwareMap = new Map<number, TopItem>();
  const weatherSearchMap = new Map<string, number>();
  const phonebookSearchMap = new Map<string, number>();
  const regionSearchMap = new Map<string, number>();
  const uniqueVisitors = new Set<string>();
  const recent: Array<{
    id: string;
    created_at: string;
    event_type: AnalyticsEventType;
    target_type: 'site' | 'software' | 'tool' | null;
    target_id: number | null;
    target_name: string;
    page: string;
    has_search: boolean;
    category_label: string;
    search_query: string;
    client_ip: string;
  }> = [];

  let navClicks = 0;
  let softwareDownloads = 0;
  let weatherQueries = 0;
  let phonebookQueries = 0;
  let regionOnlineQueries = 0;
  let adminDivisionQueries = 0;
  let searchContextEvents = 0;

  for (const event of events) {
    const dayKey = toDayKey(event.createdAt);
    const bucket = dailyMap.get(dayKey);
    const hour = event.createdAt.getHours();
    const hasValidVisitorId = event.visitorId !== 'legacy' && event.visitorId !== 'anon';
    const queryText = normalizeQuery(event.searchQuery);
    const queryEvent = isQueryEvent(event.eventType);
    const clickEvent = event.eventType === 'nav_click' || event.eventType === 'software_download';

    if (bucket) {
      bucket.events += 1;
      if (clickEvent) bucket.clicks += 1;
      if (queryEvent) bucket.queries += 1;
      if (hasValidVisitorId) bucket.visitors.add(event.visitorId);
    }

    if (hour >= 0 && hour < 24) {
      hourly[hour].events += 1;
    }

    sourcePageMap.set(event.page, (sourcePageMap.get(event.page) || 0) + 1);

    if (hasValidVisitorId) {
      uniqueVisitors.add(event.visitorId);
    }

    if (event.hasSearch) {
      searchContextEvents += 1;
    }

    if (event.eventType === 'nav_click') {
      navClicks += 1;
      if (event.targetId !== null) {
        const existing = siteMap.get(event.targetId);
        if (existing) {
          existing.clicks += 1;
        } else {
          siteMap.set(event.targetId, {
            target_id: event.targetId,
            clicks: 1,
            name: event.targetName,
            url: event.siteUrl,
            logo: event.logo,
            icon: event.icon,
            icon_bg: event.iconBg,
            icon_color: event.iconColor,
          });
        }
      }
    }

    if (event.eventType === 'software_download') {
      softwareDownloads += 1;
      if (event.targetId !== null) {
        const existing = softwareMap.get(event.targetId);
        if (existing) {
          existing.clicks += 1;
        } else {
          softwareMap.set(event.targetId, {
            target_id: event.targetId,
            clicks: 1,
            name: event.targetName,
            url: null,
            logo: event.logo,
            icon: event.icon,
            icon_bg: event.iconBg,
            icon_color: event.iconColor,
          });
        }
      }
    }

    if (event.eventType === 'weather_query') {
      weatherQueries += 1;
      if (queryText) weatherSearchMap.set(queryText, (weatherSearchMap.get(queryText) || 0) + 1);
    }

    if (event.eventType === 'phonebook_query') {
      phonebookQueries += 1;
      if (queryText) phonebookSearchMap.set(queryText, (phonebookSearchMap.get(queryText) || 0) + 1);
    }

    if (event.eventType === 'region_online_query') {
      regionOnlineQueries += 1;
      if (queryText) regionSearchMap.set(queryText, (regionSearchMap.get(queryText) || 0) + 1);
    }

    if (event.eventType === 'admin_division_query') {
      adminDivisionQueries += 1;
      if (queryText) regionSearchMap.set(queryText, (regionSearchMap.get(queryText) || 0) + 1);
    }

    if (clickEvent) {
      const categoryKey = event.categoryId === null
        ? `none:${event.targetType || 'unknown'}`
        : `${event.categoryId}:${event.targetType || 'unknown'}`;
      const existingCategory = categoryMap.get(categoryKey);
      if (existingCategory) {
        existingCategory.clicks += 1;
        if (event.eventType === 'nav_click') existingCategory.nav_clicks += 1;
        if (event.eventType === 'software_download') existingCategory.software_downloads += 1;
      } else {
        categoryMap.set(categoryKey, {
          category_id: event.categoryId,
          label: event.categoryLabel || '未分类',
          clicks: 1,
          nav_clicks: event.eventType === 'nav_click' ? 1 : 0,
          software_downloads: event.eventType === 'software_download' ? 1 : 0,
        });
      }
    }

    if (recent.length < 30) {
      recent.push({
        id: event.id,
        created_at: event.createdAt.toISOString(),
        event_type: event.eventType,
        target_type: event.targetType,
        target_id: event.targetId,
        target_name: event.targetName,
        page: event.page,
        has_search: event.hasSearch,
        category_label: clickEvent ? (event.categoryLabel || '未分类') : '',
        search_query: queryText,
        client_ip: event.clientIp,
      });
    }
  }

  const totalEvents = events.length;
  const totalClicks = navClicks + softwareDownloads;
  const totalQueries = weatherQueries + phonebookQueries + regionOnlineQueries + adminDivisionQueries;
  const searchContextRate = totalEvents === 0 ? 0 : Number(((searchContextEvents / totalEvents) * 100).toFixed(1));
  const avgDailyEvents = Number((totalEvents / days).toFixed(1));

  const daily = dayKeys.map((key) => {
    const bucket = dailyMap.get(key)!;
    return {
      day: key,
      events: bucket.events,
      clicks: bucket.clicks,
      queries: bucket.queries,
      unique_visitors: bucket.visitors.size,
    };
  });

  const activeDays = daily.filter((item) => item.events > 0).length;
  const todayEvents = daily.find((item) => item.day === todayKey)?.events || 0;
  const yesterdayEvents = daily.find((item) => item.day === yesterdayKey)?.events || 0;

  const topSites = Array.from(siteMap.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  const topSoftware = Array.from(softwareMap.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  const sourcePages = Array.from(sourcePageMap.entries())
    .map(([page, eventsCount]) => ({
      page,
      events: eventsCount,
      ratio: totalEvents === 0 ? 0 : Number(((eventsCount / totalEvents) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.events - a.events)
    .slice(0, 8);

  const categories = Array.from(categoryMap.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  return NextResponse.json({
    days,
    summary: {
      total_events: totalEvents,
      total_clicks: totalClicks,
      total_queries: totalQueries,
      unique_visitors: uniqueVisitors.size,
      nav_clicks: navClicks,
      site_clicks: navClicks,
      software_downloads: softwareDownloads,
      software_clicks: softwareDownloads,
      weather_queries: weatherQueries,
      phonebook_queries: phonebookQueries,
      region_online_queries: regionOnlineQueries,
      admin_division_queries: adminDivisionQueries,
      region_queries: regionOnlineQueries + adminDivisionQueries,
      search_context_events: searchContextEvents,
      search_context_rate: searchContextRate,
      avg_daily_events: avgDailyEvents,
      active_days: activeDays,
      today_events: todayEvents,
      yesterday_events: yesterdayEvents,
      day_over_day_change: calculatePercentChange(todayEvents, yesterdayEvents),
      period_change: calculatePercentChange(totalEvents, previousPeriodTotal),
    },
    daily,
    hourly,
    source_pages: sourcePages,
    categories,
    top_sites: topSites,
    top_software: topSoftware,
    top_searches: {
      weather: buildTopSearches(weatherSearchMap),
      phonebook: buildTopSearches(phonebookSearchMap),
      regions: buildTopSearches(regionSearchMap),
    },
    recent,
  });
}
