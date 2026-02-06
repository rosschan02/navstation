'use client';

import { useEffect, useMemo, useState } from 'react';

interface DailyItem {
  day: string;
  clicks: number;
  site_clicks: number;
  software_clicks: number;
  unique_visitors: number;
}

interface HourlyItem {
  hour: number;
  clicks: number;
}

interface SourcePageItem {
  page: string;
  clicks: number;
  ratio: number;
}

interface CategoryItem {
  category_id: number | null;
  label: string;
  clicks: number;
  site_clicks: number;
  software_clicks: number;
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

interface RecentItem {
  id: number;
  created_at: string;
  target_type: 'site' | 'software';
  target_id: number;
  target_name: string;
  page: string;
  has_search: boolean;
  category_label: string;
}

interface AnalyticsData {
  days: number;
  summary: {
    total_clicks: number;
    unique_visitors: number;
    site_clicks: number;
    software_clicks: number;
    search_context_clicks: number;
    search_context_rate: number;
    avg_daily_clicks: number;
    active_days: number;
    today_clicks: number;
    yesterday_clicks: number;
    day_over_day_change: number;
    period_change: number;
  };
  daily: DailyItem[];
  hourly: HourlyItem[];
  source_pages: SourcePageItem[];
  categories: CategoryItem[];
  top_sites: TopItem[];
  top_software: TopItem[];
  recent: RecentItem[];
}

const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatRelativeTime(isoTime: string): string {
  const diffMs = Date.now() - new Date(isoTime).getTime();
  if (diffMs < 60 * 1000) return '刚刚';
  if (diffMs < 60 * 60 * 1000) return `${Math.floor(diffMs / (60 * 1000))} 分钟前`;
  if (diffMs < 24 * 60 * 60 * 1000) return `${Math.floor(diffMs / (60 * 60 * 1000))} 小时前`;
  return `${Math.floor(diffMs / (24 * 60 * 60 * 1000))} 天前`;
}

function sourcePageLabel(page: string): string {
  if (page === 'home') return '首页';
  if (page === 'software') return '软件下载页';
  if (page === 'direct') return '直达入口';
  if (page === 'legacy') return '旧版埋点';
  return page;
}

function parseLocalDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, (month || 1) - 1, date || 1);
}

function SourceBadge({ page }: { page: string }) {
  const label = sourcePageLabel(page);
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs">
      {label}
    </span>
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

export default function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?days=${days}`)
      .then(res => res.json())
      .then((payload: AnalyticsData) => {
        setData(payload);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days]);

  const bars = useMemo(() => {
    if (!data) return [];
    const maxClicks = Math.max(...data.daily.map(item => item.clicks), 1);
    return data.daily.map((item, index) => {
      const day = parseLocalDay(item.day);
      const label = days <= 7 ? dayNames[day.getDay()] : `${day.getMonth() + 1}/${day.getDate()}`;
      return {
        label,
        clicks: item.clicks,
        height: `${Math.round((item.clicks / maxClicks) * 100)}%`,
        active: index === data.daily.length - 1,
      };
    });
  }, [data, days]);

  const maxHourClicks = data ? Math.max(...data.hourly.map(item => item.clicks), 1) : 1;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12 bg-background-light">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">数据分析</h2>
            <p className="text-slate-500 mt-1">访问行为、内容热度与下载趋势</p>
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
                {option} 天
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">总点击量</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '--' : (data?.summary.total_clicks || 0).toLocaleString()}</p>
            <p className={`text-xs mt-2 ${(data?.summary.period_change || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              较上周期 {loading ? '--' : formatPercent(data?.summary.period_change || 0)}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">独立访客</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '--' : (data?.summary.unique_visitors || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-2">去重标识按浏览器设备</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">软件下载点击</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '--' : (data?.summary.software_clicks || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-2">
              站点点击 {loading ? '--' : (data?.summary.site_clicks || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">搜索上下文点击率</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '--' : `${data?.summary.search_context_rate || 0}%`}</p>
            <p className="text-xs text-slate-400 mt-2">
              今日 {loading ? '--' : data?.summary.today_clicks || 0} / 昨日 {loading ? '--' : data?.summary.yesterday_clicks || 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">点击趋势</h3>
              <span className="text-xs text-slate-400">活跃天数 {data?.summary.active_days || 0} / {days}</span>
            </div>
            <div className="flex-1 flex items-end justify-between gap-2 h-64 px-2">
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">加载中...</div>
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
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {bar.clicks}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{bar.label}</span>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400">暂无数据</div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 mb-4">24 小时分布</h3>
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">加载中...</div>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {(data?.hourly || []).map((item) => (
                  <div key={item.hour} className="flex flex-col items-center gap-1">
                    <div className="w-full h-16 bg-slate-100 rounded-md overflow-hidden flex items-end">
                      <div
                        className="w-full bg-primary/70 rounded-md"
                        style={{ height: `${Math.max(6, Math.round((item.clicks / maxHourClicks) * 100))}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">{item.hour.toString().padStart(2, '0')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <TopList title="热门站点 Top 10" items={data?.top_sites || []} emptyText="暂无站点点击数据" />
          <TopList title="热门软件 Top 10" items={data?.top_software || []} emptyText="暂无软件下载数据" />

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">来源页面</h3>
              {loading ? (
                <p className="text-slate-400 text-sm">加载中...</p>
              ) : (data?.source_pages.length || 0) > 0 ? (
                <div className="flex flex-col gap-2">
                  {(data?.source_pages || []).map((item) => (
                    <div key={item.page} className="flex items-center justify-between text-sm">
                      <SourceBadge page={item.page} />
                      <span className="text-slate-500">{item.clicks} ({item.ratio}%)</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">暂无来源数据</p>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">热门分类</h3>
              {loading ? (
                <p className="text-slate-400 text-sm">加载中...</p>
              ) : (data?.categories.length || 0) > 0 ? (
                <div className="flex flex-col gap-2">
                  {(data?.categories || []).slice(0, 6).map((category, index) => (
                    <div key={`${category.category_id}-${category.label}-${index}`} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 truncate">{category.label}</span>
                      <span className="text-slate-500 ml-2 shrink-0">{category.clicks}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">暂无分类数据</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">最近活动</h3>
            <span className="text-xs text-slate-400">最近 20 条</span>
          </div>
          {loading ? (
            <div className="text-slate-400 text-sm py-8 text-center">加载中...</div>
          ) : (data?.recent.length || 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-200">
                    <th className="py-2 pr-4 font-medium">时间</th>
                    <th className="py-2 pr-4 font-medium">目标</th>
                    <th className="py-2 pr-4 font-medium">类型</th>
                    <th className="py-2 pr-4 font-medium">来源</th>
                    <th className="py-2 pr-4 font-medium">分类</th>
                    <th className="py-2 font-medium">搜索上下文</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recent || []).map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 text-slate-600">
                      <td className="py-2 pr-4">{formatRelativeTime(item.created_at)}</td>
                      <td className="py-2 pr-4 truncate max-w-[220px]">{item.target_name}</td>
                      <td className="py-2 pr-4">{item.target_type === 'site' ? '站点' : '软件'}</td>
                      <td className="py-2 pr-4"><SourceBadge page={item.page} /></td>
                      <td className="py-2 pr-4">{item.category_label}</td>
                      <td className="py-2">{item.has_search ? '是' : '否'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-slate-400 text-sm py-8 text-center">暂无活动数据</div>
          )}
        </div>
      </div>
    </div>
  );
}
