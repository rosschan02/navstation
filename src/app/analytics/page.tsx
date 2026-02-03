'use client';

import { useState, useEffect } from 'react';

interface TopSite {
  target_id: number;
  clicks: string;
  name: string | null;
  url: string | null;
  logo: string | null;
  icon: string | null;
  icon_bg: string | null;
  icon_color: string | null;
}

interface DailyData {
  day: string;
  clicks: string;
}

interface AnalyticsData {
  total: number;
  daily: DailyData[];
  top: TopSite[];
}

const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export default function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?days=${days}`)
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  const maxClicks = data ? Math.max(...data.daily.map(r => parseInt(r.clicks)), 1) : 1;
  const bars = data?.daily.map((r, i) => {
    const d = new Date(r.day);
    const clicks = parseInt(r.clicks);
    const pct = Math.round((clicks / maxClicks) * 100);
    return {
      label: days <= 7 ? dayNames[d.getDay()] : `${d.getMonth() + 1}/${d.getDate()}`,
      height: `${pct}%`,
      clicks,
      active: i === data.daily.length - 1,
    };
  }) || [];

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12 bg-background-light">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">数据分析</h2>
            <p className="text-slate-500 mt-1">站点访问点击统计</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            {[7, 30].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${days === d ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {d} 天
              </button>
            ))}
          </div>
        </div>

        {/* Total Clicks Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-blue-50 text-primary">
                <span className="material-symbols-outlined">ads_click</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-sm font-medium">总点击量</span>
              <span className="text-2xl font-bold text-slate-900">
                {loading ? '--' : (data?.total ?? 0).toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 mt-1">最近 {days} 天</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
          {/* Bar Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 mb-6">点击趋势</h3>
            <div className="flex-1 flex items-end justify-between gap-3 h-64 px-2">
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">加载中...</div>
              ) : bars.length > 0 ? bars.map((bar, i) => (
                <div key={i} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group cursor-pointer">
                  <div className="relative w-full max-w-[40px] bg-slate-100 rounded-t-lg overflow-hidden h-full flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${bar.active ? 'bg-primary' : 'bg-primary/60 group-hover:bg-primary/80'}`}
                      style={{ height: bar.height }}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {bar.clicks} 次
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{bar.label}</span>
                </div>
              )) : (
                <div className="flex-1 flex items-center justify-center text-slate-400">暂无数据</div>
              )}
            </div>
          </div>

          {/* Top 10 Sites Ranking */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 mb-4">热门站点 Top 10</h3>
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">加载中...</div>
            ) : data && data.top.length > 0 ? (
              <div className="flex flex-col gap-3">
                {data.top.map((site, i) => {
                  const clicks = parseInt(site.clicks);
                  const maxTopClicks = parseInt(data.top[0].clicks);
                  const pct = Math.round((clicks / maxTopClicks) * 100);
                  return (
                    <div key={site.target_id} className="flex items-center gap-3">
                      {/* Rank */}
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i < 3 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {i + 1}
                      </span>
                      {/* Icon */}
                      <div className={`size-8 rounded-lg ${site.icon_bg || 'bg-slate-100'} flex items-center justify-center shrink-0 overflow-hidden`}>
                        {site.logo ? (
                          <img src={site.logo} alt={site.name || ''} className="size-5 object-contain" />
                        ) : (
                          <span className={`material-symbols-outlined ${site.icon_color || 'text-slate-500'} text-[16px]`}>{site.icon || 'link'}</span>
                        )}
                      </div>
                      {/* Name + bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700 truncate">{site.name || `站点 #${site.target_id}`}</span>
                          <span className="text-xs text-slate-500 shrink-0 ml-2">{clicks}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full ${i < 3 ? 'bg-primary' : 'bg-primary/50'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8">
                <span className="material-symbols-outlined text-[36px] mb-2">equalizer</span>
                <p className="text-sm">暂无点击数据</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
