'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AnalyticsEventType } from '@/types';

interface DailyItem {
  day: string;
  events: number;
  clicks: number;
  queries: number;
  unique_visitors: number;
}

interface HourlyItem {
  hour: number;
  events: number;
}

interface SourcePageItem {
  page: string;
  events: number;
  ratio: number;
}

interface CategoryItem {
  category_id: number | null;
  label: string;
  clicks: number;
  nav_clicks: number;
  software_downloads: number;
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

interface RecentItem {
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
}

interface AnalyticsData {
  days: number;
  summary: {
    total_events: number;
    total_clicks: number;
    total_queries: number;
    unique_visitors: number;
    nav_clicks: number;
    site_clicks: number;
    software_downloads: number;
    software_clicks: number;
    weather_queries: number;
    phonebook_queries: number;
    region_online_queries: number;
    admin_division_queries: number;
    region_queries: number;
    search_context_events: number;
    search_context_rate: number;
    avg_daily_events: number;
    active_days: number;
    today_events: number;
    yesterday_events: number;
    day_over_day_change: number;
    period_change: number;
  };
  daily: DailyItem[];
  hourly: HourlyItem[];
  source_pages: SourcePageItem[];
  categories: CategoryItem[];
  top_sites: TopItem[];
  top_software: TopItem[];
  top_searches: {
    weather: SearchItem[];
    phonebook: SearchItem[];
    regions: SearchItem[];
  };
  recent: RecentItem[];
}

function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatRelativeTime(isoTime: string, t: ReturnType<typeof useTranslations<'analytics'>>): string {
  const diffMs = Date.now() - new Date(isoTime).getTime();
  if (diffMs < 60 * 1000) return t('justNow');
  if (diffMs < 60 * 60 * 1000) return t('minutesAgo', { count: Math.floor(diffMs / (60 * 1000)) });
  if (diffMs < 24 * 60 * 60 * 1000) return t('hoursAgo', { count: Math.floor(diffMs / (60 * 60 * 1000)) });
  return t('daysAgo', { count: Math.floor(diffMs / (24 * 60 * 60 * 1000)) });
}

function sourcePageLabel(page: string, t: ReturnType<typeof useTranslations<'analytics'>>): string {
  if (page === 'home') return t('sourceHome');
  if (page === 'software') return t('sourceSoftware');
  if (page === 'direct') return t('sourceDirect');
  if (page === 'legacy') return t('sourceLegacy');
  return page;
}

function parseLocalDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, (month || 1) - 1, date || 1);
}

function eventTypeLabel(type: AnalyticsEventType, t: ReturnType<typeof useTranslations<'analytics'>>): string {
  switch (type) {
    case 'nav_click':
      return t('eventNavClick');
    case 'software_download':
      return t('eventSoftwareDownload');
    case 'weather_query':
      return t('eventWeatherQuery');
    case 'phonebook_query':
      return t('eventPhonebookQuery');
    case 'region_online_query':
      return t('eventRegionOnlineQuery');
    case 'admin_division_query':
      return t('eventAdminDivisionQuery');
    default:
      return type;
  }
}

function eventTypeClass(type: AnalyticsEventType): string {
  switch (type) {
    case 'nav_click':
      return 'bg-blue-100 text-blue-700';
    case 'software_download':
      return 'bg-teal-100 text-teal-700';
    case 'weather_query':
      return 'bg-cyan-100 text-cyan-700';
    case 'phonebook_query':
      return 'bg-amber-100 text-amber-700';
    case 'region_online_query':
      return 'bg-violet-100 text-violet-700';
    case 'admin_division_query':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function EventBadge({ type, t }: { type: AnalyticsEventType; t: ReturnType<typeof useTranslations<'analytics'>> }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${eventTypeClass(type)}`}>
      {eventTypeLabel(type, t)}
    </span>
  );
}

function SourceBadge({ page, t }: { page: string; t: ReturnType<typeof useTranslations<'analytics'>> }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs">
      {sourcePageLabel(page, t)}
    </span>
  );
}

function SummaryCard({ title, value, hint, tone = 'neutral' }: { title: string; value: string; hint: string; tone?: 'neutral' | 'positive' | 'warning' }) {
  const hintClass = tone === 'positive'
    ? 'text-emerald-600'
    : tone === 'warning'
      ? 'text-amber-600'
      : 'text-slate-400';

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      <p className={`text-xs mt-2 ${hintClass}`}>{hint}</p>
    </div>
  );
}

function TopList({ title, items, emptyText }: { title: string; items: TopItem[]; emptyText: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
      <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>
      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm py-10">{emptyText}</div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item, index) => {
            const max = items[0]?.clicks || 1;
            const pct = Math.round((item.clicks / max) * 100);
            return (
              <div key={`${item.target_id}-${item.name}`} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  index < 3 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {index + 1}
                </span>
                <div className={`size-8 rounded-lg ${item.icon_bg || 'bg-slate-100'} flex items-center justify-center shrink-0 overflow-hidden`}>
                  {item.logo ? (
                    <img src={item.logo} alt={item.name} className="size-5 object-contain" />
                  ) : (
                    <span className={`material-symbols-outlined ${item.icon_color || 'text-slate-500'} text-[16px]`}>
                      {item.icon || 'link'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 truncate">{item.name}</span>
                    <span className="text-xs text-slate-500 shrink-0 ml-2">{item.clicks}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${index < 3 ? 'bg-primary' : 'bg-primary/50'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SearchList({ title, items, emptyText }: { title: string; items: SearchItem[]; emptyText: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${item.query}-${index}`} className="flex items-start justify-between gap-3">
              <span className="text-sm text-slate-700 break-all">{item.query}</span>
              <span className="shrink-0 text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const t = useTranslations('analytics');
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?days=${days}`)
      .then((res) => res.json())
      .then((payload: AnalyticsData) => {
        setData(payload);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days]);

  const bars = useMemo(() => {
    if (!data) return [];
    const maxEvents = Math.max(...data.daily.map((item) => item.events), 1);
    return data.daily.map((item, index) => {
      const day = parseLocalDay(item.day);
      const dayNames = [
        t('daySun'),
        t('dayMon'),
        t('dayTue'),
        t('dayWed'),
        t('dayThu'),
        t('dayFri'),
        t('daySat'),
      ];
      const label = days <= 7 ? dayNames[day.getDay()] : `${day.getMonth() + 1}/${day.getDate()}`;
      return {
        label,
        events: item.events,
        clicks: item.clicks,
        queries: item.queries,
        height: `${Math.round((item.events / maxEvents) * 100)}%`,
        active: index === data.daily.length - 1,
      };
    });
  }, [data, days, t]);

  const maxHourEvents = data ? Math.max(...data.hourly.map((item) => item.events), 1) : 1;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12 bg-background-light">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{t('title')}</h2>
            <p className="text-slate-500 mt-1">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            {[7, 30].map((option) => (
              <button
                key={option}
                onClick={() => setDays(option)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  days === option ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {t('daysOption', { count: option })}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <SummaryCard
            title={t('summaryTotalEvents')}
            value={loading ? '--' : (data?.summary.total_events || 0).toLocaleString()}
            hint={t('summaryPeriodChange', { value: loading ? '--' : formatPercent(data?.summary.period_change || 0) })}
            tone={(data?.summary.period_change || 0) >= 0 ? 'positive' : 'warning'}
          />
          <SummaryCard
            title={t('summaryTotalQueries')}
            value={loading ? '--' : (data?.summary.total_queries || 0).toLocaleString()}
            hint={t('summaryQueryBreakdown', {
              weather: data?.summary.weather_queries || 0,
              phonebook: data?.summary.phonebook_queries || 0,
            })}
          />
          <SummaryCard
            title={t('summaryNavClicks')}
            value={loading ? '--' : (data?.summary.total_clicks || 0).toLocaleString()}
            hint={t('summaryClickBreakdown', {
              site: data?.summary.nav_clicks || 0,
              software: data?.summary.software_downloads || 0,
            })}
          />
          <SummaryCard
            title={t('summaryUniqueVisitors')}
            value={loading ? '--' : (data?.summary.unique_visitors || 0).toLocaleString()}
            hint={t('summarySearchRate', {
              value: loading ? '--' : `${data?.summary.search_context_rate || 0}%`,
            })}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <TopList title={t('topSites')} items={data?.top_sites || []} emptyText={t('emptyTopSites')} />
          <TopList title={t('topSoftware')} items={data?.top_software || []} emptyText={t('emptyTopSoftware')} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <SearchList title={t('topWeatherSearches')} items={data?.top_searches.weather || []} emptyText={t('emptyWeatherSearches')} />
          <SearchList title={t('topPhonebookSearches')} items={data?.top_searches.phonebook || []} emptyText={t('emptyPhonebookSearches')} />
          <SearchList title={t('topRegionSearches')} items={data?.top_searches.regions || []} emptyText={t('emptyRegionSearches')} />
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">{t('recentActivity')}</h3>
            <span className="text-xs text-slate-400">{t('recentCount')}</span>
          </div>
          {loading ? (
            <div className="text-slate-400 text-sm py-8 text-center">{t('loading')}</div>
          ) : (data?.recent.length || 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-200">
                    <th className="py-2 pr-4 font-medium">{t('tableTime')}</th>
                    <th className="py-2 pr-4 font-medium">{t('tableEvent')}</th>
                    <th className="py-2 pr-4 font-medium">{t('tableTarget')}</th>
                    <th className="py-2 pr-4 font-medium">{t('tableSource')}</th>
                    <th className="py-2 pr-4 font-medium">{t('tableCategory')}</th>
                    <th className="py-2 pr-4 font-medium">{t('tableClientIp')}</th>
                    <th className="py-2 font-medium">{t('tableHasSearch')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recent || []).map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 text-slate-600 align-top">
                      <td className="py-3 pr-4 whitespace-nowrap">{formatRelativeTime(item.created_at, t)}</td>
                      <td className="py-3 pr-4"><EventBadge type={item.event_type} t={t} /></td>
                      <td className="py-3 pr-4 min-w-[240px] max-w-[360px]">
                        <p className="font-medium text-slate-800 break-words">{item.target_name}</p>
                        {item.search_query && <p className="text-xs text-slate-500 mt-1 break-all">{t('keywordLabel', { value: item.search_query })}</p>}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap"><SourceBadge page={item.page} t={t} /></td>
                      <td className="py-3 pr-4 whitespace-nowrap">{item.category_label || '-'}</td>
                      <td className="py-3 pr-4 whitespace-nowrap font-mono text-xs">{item.client_ip || '-'}</td>
                      <td className="py-3 whitespace-nowrap">{item.has_search ? t('yes') : t('no')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-slate-400 text-sm py-8 text-center">{t('emptyRecent')}</div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">{t('trendTitle')}</h3>
              <span className="text-xs text-slate-400">{t('activeDays', { active: data?.summary.active_days || 0, total: days })}</span>
            </div>
            <div className="flex-1 flex items-end justify-between gap-2 h-64 px-2">
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">{t('loading')}</div>
              ) : bars.length > 0 ? (
                bars.map((bar, index) => (
                  <div key={`${bar.label}-${index}`} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group">
                    <div className="relative w-full max-w-[30px] bg-slate-100 rounded-t-lg overflow-hidden h-full flex items-end">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          bar.active ? 'bg-primary' : 'bg-primary/60 group-hover:bg-primary/80'
                        }`}
                        style={{ height: bar.height }}
                      />
                      <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 text-center">
                        {t('trendTooltip', { events: bar.events, clicks: bar.clicks, queries: bar.queries })}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{bar.label}</span>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400">{t('emptyData')}</div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">{t('hourlyTitle')}</h3>
              {loading ? (
                <p className="text-slate-400 text-sm">{t('loading')}</p>
              ) : (
                <div className="grid grid-cols-6 gap-2">
                  {(data?.hourly || []).map((item) => (
                    <div key={item.hour} className="flex flex-col items-center gap-1">
                      <div className="w-full h-16 bg-slate-100 rounded-md overflow-hidden flex items-end">
                        <div
                          className="w-full bg-primary/70 rounded-md"
                          style={{ height: `${Math.max(6, Math.round((item.events / maxHourEvents) * 100))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">{item.hour.toString().padStart(2, '0')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">{t('sourceTitle')}</h3>
              {loading ? (
                <p className="text-slate-400 text-sm">{t('loading')}</p>
              ) : (data?.source_pages.length || 0) > 0 ? (
                <div className="flex flex-col gap-2">
                  {(data?.source_pages || []).map((item) => (
                    <div key={item.page} className="flex items-center justify-between text-sm gap-3">
                      <SourceBadge page={item.page} t={t} />
                      <span className="text-slate-500 shrink-0">{item.events} ({item.ratio}%)</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">{t('emptySources')}</p>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">{t('categoryTitle')}</h3>
              {loading ? (
                <p className="text-slate-400 text-sm">{t('loading')}</p>
              ) : (data?.categories.length || 0) > 0 ? (
                <div className="flex flex-col gap-2">
                  {(data?.categories || []).slice(0, 6).map((category, index) => (
                    <div key={`${category.category_id}-${category.label}-${index}`} className="flex items-center justify-between text-sm gap-3">
                      <span className="text-slate-700 truncate">{category.label}</span>
                      <span className="text-slate-500 shrink-0">{category.clicks}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">{t('emptyCategories')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
