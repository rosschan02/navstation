import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { authenticate, createAuthErrorResponse, extractApiKey } from '@/lib/apiAuth';
import { parseAnalyticsSource } from '@/lib/analyticsSource';

export const dynamic = 'force-dynamic';

interface EventRow {
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

interface DailyBucket {
  clicks: number;
  siteClicks: number;
  softwareClicks: number;
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

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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

// GET /api/analytics?days=7
// Auth: Public access, or API Key (read permission)
export async function GET(request: NextRequest) {
  if (extractApiKey(request)) {
    const auth = await authenticate(request);
    if (!auth.authenticated) {
      return createAuthErrorResponse(auth);
    }
  }

  const days = clampDays(request.nextUrl.searchParams.get('days'));

  const [eventsRes, previousPeriodRes] = await Promise.all([
    pool.query<EventRow>(
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
       FROM click_events
       WHERE created_at >= NOW() - ($1::int * 2) * INTERVAL '1 day'
         AND created_at < NOW() - $1::int * INTERVAL '1 day'`,
      [days]
    ),
  ]);

  const events = eventsRes.rows;
  const previousPeriodTotal = Number.parseInt(previousPeriodRes.rows[0]?.total || '0', 10);
  const dayKeys = getDayKeys(days);
  const todayKey = dayKeys[dayKeys.length - 1];
  const yesterdayKey = dayKeys[dayKeys.length - 2] || todayKey;

  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, clicks: 0 }));
  const dailyMap = new Map<string, DailyBucket>();
  for (const key of dayKeys) {
    dailyMap.set(key, { clicks: 0, siteClicks: 0, softwareClicks: 0, visitors: new Set() });
  }

  const sourcePageMap = new Map<string, number>();
  const categoryMap = new Map<string, { category_id: number | null; label: string; clicks: number; site_clicks: number; software_clicks: number }>();
  const siteMap = new Map<number, TopItem>();
  const softwareMap = new Map<number, TopItem>();
  const uniqueVisitors = new Set<string>();
  const recent: Array<{
    id: number;
    created_at: string | Date;
    target_type: 'site' | 'software';
    target_id: number;
    target_name: string;
    page: string;
    has_search: boolean;
    category_label: string;
  }> = [];

  let siteClicks = 0;
  let softwareClicks = 0;
  let searchContextClicks = 0;

  for (const event of events) {
    const parsedSource = parseAnalyticsSource(event.source);
    const createdAt = new Date(event.created_at);
    const dayKey = toDayKey(createdAt);
    const bucket = dailyMap.get(dayKey);
    const hour = createdAt.getHours();
    const visitorId = parsedSource.visitorId;
    const hasValidVisitorId = visitorId !== 'legacy' && visitorId !== 'anon';

    if (bucket) {
      bucket.clicks += 1;
      if (event.target_type === 'site') bucket.siteClicks += 1;
      if (event.target_type === 'software') bucket.softwareClicks += 1;
      if (hasValidVisitorId) bucket.visitors.add(visitorId);
    }

    if (hour >= 0 && hour < 24) {
      hourly[hour].clicks += 1;
    }

    sourcePageMap.set(parsedSource.page, (sourcePageMap.get(parsedSource.page) || 0) + 1);

    if (hasValidVisitorId) {
      uniqueVisitors.add(visitorId);
    }

    if (parsedSource.hasSearch) {
      searchContextClicks += 1;
    }

    if (event.target_type === 'site') {
      siteClicks += 1;
      const existing = siteMap.get(event.target_id);
      if (existing) {
        existing.clicks += 1;
      } else {
        siteMap.set(event.target_id, {
          target_id: event.target_id,
          clicks: 1,
          name: event.site_name || `站点 #${event.target_id}`,
          url: event.site_url,
          logo: event.site_logo,
          icon: event.site_icon || 'link',
          icon_bg: event.site_icon_bg || 'bg-slate-100',
          icon_color: event.site_icon_color || 'text-slate-500',
        });
      }
    }

    if (event.target_type === 'software') {
      softwareClicks += 1;
      const existing = softwareMap.get(event.target_id);
      if (existing) {
        existing.clicks += 1;
      } else {
        softwareMap.set(event.target_id, {
          target_id: event.target_id,
          clicks: 1,
          name: event.software_name || `软件 #${event.target_id}`,
          url: null,
          logo: event.software_logo,
          icon: event.software_icon || 'download',
          icon_bg: event.software_icon_bg || 'bg-blue-100',
          icon_color: event.software_icon_color || 'text-blue-600',
        });
      }
    }

    const categoryId = event.target_type === 'site' ? event.site_category_id : event.software_category_id;
    const categoryLabel = event.target_type === 'site'
      ? (event.site_category_label || '未分类')
      : (event.software_category_label || '未分类');
    const categoryKey = categoryId === null ? `none:${event.target_type}` : `${categoryId}:${event.target_type}`;

    const existingCategory = categoryMap.get(categoryKey);
    if (existingCategory) {
      existingCategory.clicks += 1;
      if (event.target_type === 'site') existingCategory.site_clicks += 1;
      if (event.target_type === 'software') existingCategory.software_clicks += 1;
    } else {
      categoryMap.set(categoryKey, {
        category_id: categoryId,
        label: categoryLabel,
        clicks: 1,
        site_clicks: event.target_type === 'site' ? 1 : 0,
        software_clicks: event.target_type === 'software' ? 1 : 0,
      });
    }

    if (recent.length < 20) {
      recent.push({
        id: event.id,
        created_at: event.created_at,
        target_type: event.target_type,
        target_id: event.target_id,
        target_name: event.target_type === 'site'
          ? (event.site_name || `站点 #${event.target_id}`)
          : (event.software_name || `软件 #${event.target_id}`),
        page: parsedSource.page,
        has_search: parsedSource.hasSearch,
        category_label: categoryLabel,
      });
    }
  }

  const totalClicks = events.length;
  const searchContextRate = totalClicks === 0 ? 0 : Number(((searchContextClicks / totalClicks) * 100).toFixed(1));
  const avgDailyClicks = Number((totalClicks / days).toFixed(1));

  const daily = dayKeys.map((key) => {
    const bucket = dailyMap.get(key)!;
    return {
      day: key,
      clicks: bucket.clicks,
      site_clicks: bucket.siteClicks,
      software_clicks: bucket.softwareClicks,
      unique_visitors: bucket.visitors.size,
    };
  });

  const activeDays = daily.filter((item) => item.clicks > 0).length;
  const todayClicks = daily.find((item) => item.day === todayKey)?.clicks || 0;
  const yesterdayClicks = daily.find((item) => item.day === yesterdayKey)?.clicks || 0;

  const topSites = Array.from(siteMap.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  const topSoftware = Array.from(softwareMap.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  const sourcePages = Array.from(sourcePageMap.entries())
    .map(([page, clicks]) => ({
      page,
      clicks,
      ratio: totalClicks === 0 ? 0 : Number(((clicks / totalClicks) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 8);

  const categories = Array.from(categoryMap.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  return NextResponse.json({
    days,
    summary: {
      total_clicks: totalClicks,
      unique_visitors: uniqueVisitors.size,
      site_clicks: siteClicks,
      software_clicks: softwareClicks,
      search_context_clicks: searchContextClicks,
      search_context_rate: searchContextRate,
      avg_daily_clicks: avgDailyClicks,
      active_days: activeDays,
      today_clicks: todayClicks,
      yesterday_clicks: yesterdayClicks,
      day_over_day_change: calculatePercentChange(todayClicks, yesterdayClicks),
      period_change: calculatePercentChange(totalClicks, previousPeriodTotal),
    },
    daily,
    hourly,
    source_pages: sourcePages,
    categories,
    top_sites: topSites,
    top_software: topSoftware,
    recent,
  });
}
