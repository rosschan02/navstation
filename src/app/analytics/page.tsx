import pool from '@/db';

export default async function AnalyticsPage() {
  // Fetch real analytics from DB
  const totalRes = await pool.query(
    `SELECT count(*) as total FROM click_events WHERE created_at >= NOW() - INTERVAL '7 days'`
  );
  const total = parseInt(totalRes.rows[0].total);

  const dailyRes = await pool.query(
    `SELECT date_trunc('day', created_at)::date as day, count(*) as clicks
     FROM click_events
     WHERE created_at >= NOW() - INTERVAL '7 days'
     GROUP BY day ORDER BY day`
  );

  const sourceRes = await pool.query(
    `SELECT source, count(*) as clicks
     FROM click_events
     WHERE created_at >= NOW() - INTERVAL '7 days'
     GROUP BY source ORDER BY clicks DESC`
  );

  // Calculate source percentages
  const totalClicks = sourceRes.rows.reduce((sum: number, r: { clicks: string }) => sum + parseInt(r.clicks), 0) || 1;
  const sources = sourceRes.rows.map((r: { source: string; clicks: string }) => ({
    label: r.source === 'direct' ? 'Direct' : r.source === 'google' ? 'Google Search' : r.source === 'social' ? 'Social Media' : 'Referrals',
    percent: Math.round((parseInt(r.clicks) / totalClicks) * 100),
    color: r.source === 'direct' ? 'bg-primary' : r.source === 'google' ? 'bg-blue-400' : r.source === 'social' ? 'bg-purple-400' : 'bg-orange-400',
  }));

  // Build daily bar data (last 7 days)
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const maxClicks = Math.max(...dailyRes.rows.map((r: { clicks: string }) => parseInt(r.clicks)), 1);
  const bars = dailyRes.rows.map((r: { day: string; clicks: string }, i: number) => {
    const d = new Date(r.day);
    const pct = Math.round((parseInt(r.clicks) / maxClicks) * 100);
    return {
      label: dayNames[d.getDay()],
      height: `${pct}%`,
      active: i === dailyRes.rows.length - 1,
    };
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12 bg-background-light">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">数据分析</h2>
            <p className="text-slate-500 mt-1">最近 7 天的站点访问统计。</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button className="px-3 py-1 bg-slate-100 text-slate-900 rounded text-sm font-medium">7 天</button>
            <button className="px-3 py-1 text-slate-500 hover:bg-slate-50 rounded text-sm font-medium">30 天</button>
            <button className="px-3 py-1 text-slate-500 hover:bg-slate-50 rounded text-sm font-medium">12 月</button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnalyticsCard title="总访问量" value={total.toLocaleString()} trend="+12.5%" positive icon="bar_chart" color="text-primary" bg="bg-blue-50" />
          <AnalyticsCard title="平均停留时间" value="4m 32s" trend="+0.8%" positive icon="timer" color="text-orange-600" bg="bg-orange-50" />
          <AnalyticsCard title="跳出率" value="42.3%" trend="-2.1%" positive={true} icon="call_split" color="text-purple-600" bg="bg-purple-50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
          {/* Bar Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 mb-6">访问趋势</h3>
            <div className="flex-1 flex items-end justify-between gap-4 h-64 px-2">
              {bars.length > 0 ? bars.map((bar: { height: string; label: string; active: boolean }, i: number) => (
                <div key={i} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group cursor-pointer">
                  <div className="relative w-full max-w-[40px] bg-slate-100 rounded-t-lg overflow-hidden h-full flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${bar.active ? 'bg-primary' : 'bg-primary/60 group-hover:bg-primary/80'}`}
                      style={{ height: bar.height }}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {bar.height}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{bar.label}</span>
                </div>
              )) : (
                <div className="flex-1 flex items-center justify-center text-slate-400">暂无数据</div>
              )}
            </div>
          </div>

          {/* Sources */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 mb-4">流量来源</h3>
            <div className="flex flex-col gap-4">
              {sources.map((s: { label: string; percent: number; color: string }) => (
                <div key={s.label} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700 font-medium">{s.label}</span>
                    <span className="text-slate-500">{s.percent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className={`${s.color} h-full rounded-full`} style={{ width: `${s.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>移动端访问</span>
                <span className="font-semibold text-slate-900">68%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '68%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsCard({ title, value, trend, positive, icon, color, bg }: {
  title: string; value: string; trend: string; positive: boolean; icon: string; color: string; bg: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${bg} ${color}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {trend}
          <span className="material-symbols-outlined text-[14px] ml-1">
            {positive ? 'trending_up' : 'trending_down'}
          </span>
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-slate-500 text-sm font-medium">{title}</span>
        <span className="text-2xl font-bold text-slate-900">{value}</span>
      </div>
    </div>
  );
}
