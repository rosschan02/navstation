# Weather Modal Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign `WeatherQuickSearchModal` from a flat border-card layout to a hero gradient + frosted-glass card aesthetic, based on the Stitch "Weather Dashboard - Yingde" design.

**Architecture:** Single-file JSX/styles rewrite of `src/components/WeatherQuickSearchModal.tsx`. All data interfaces, state, API logic, and prop signatures remain unchanged — only the rendered markup and Tailwind classes change. No new dependencies needed.

**Tech Stack:** React, Tailwind CSS v4 (`@import "tailwindcss"`), Material Symbols Outlined icons, TypeScript

---

### Task 1: Rewrite the modal shell and hero section

**Files:**
- Modify: `src/components/WeatherQuickSearchModal.tsx`

**Design spec (from `docs/plans/2026-02-28-weather-modal-redesign.md`):**

The outer modal wrapper shrinks to `max-w-2xl` and loses its border. The header area becomes a blue gradient "hero" with location, temperature, secondary metrics, refresh, and the search bar — all on a `from-[#137fec] to-[#0d5cb8]` gradient background.

**Step 1: Replace the outer modal shell**

Find the return statement's top-level wrapper div and replace:

```tsx
// OLD
<div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">

// NEW
<div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
```

**Step 2: Replace the header section with the gradient hero**

Replace the entire `<div className="px-5 py-4 border-b border-slate-200">` block with:

```tsx
<div className="bg-gradient-to-br from-[#137fec] to-[#0d5cb8] px-5 pt-4 pb-5">
  {/* Row 1: location + close */}
  <div className="flex items-center justify-between gap-3 mb-4">
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="material-symbols-outlined text-white/80 text-[18px]">pin_drop</span>
      <span className="text-sm font-medium text-white truncate">
        {weather
          ? [location?.province, location?.city, location?.name].filter(Boolean).join(' ') || '天气速查'
          : '天气速查'}
      </span>
    </div>
    <button
      onClick={onClose}
      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 shrink-0"
      aria-label="关闭"
    >
      <span className="material-symbols-outlined text-[20px]">close</span>
    </button>
  </div>

  {/* Row 2: temperature + condition (only when data loaded) */}
  {weather && now ? (
    <>
      <div className="flex items-end gap-3 mb-1">
        <p className="text-6xl font-bold text-white leading-none">{toText(now.temp, '°C')}</p>
        <p className="text-2xl text-white/80 mb-1">{toText(now.text)}</p>
      </div>
      {/* Row 3: secondary metrics + refresh */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <p className="text-sm text-white/70">
          体感 {toText(now.feels_like, '°C')} · 湿度 {toText(now.rh, '%')} · 更新 {formatUpdateTime(now.uptime)}
        </p>
        <button
          type="button"
          onClick={() => void queryWeather(keyword, true)}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 disabled:opacity-40"
          aria-label="刷新"
        >
          <span className={`material-symbols-outlined text-[20px] ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </div>
    </>
  ) : (
    <div className="mb-4" />
  )}

  {/* Row 4: search bar */}
  <div className="flex gap-2">
    <div className="relative flex-1">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/60 text-[18px]">search</span>
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void queryWeather(keyword);
          }
        }}
        placeholder="输入地区名或 district_id"
        className="w-full pl-9 pr-4 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-sm text-white placeholder:text-white/50 focus:outline-none focus:bg-white/30 transition-colors"
      />
    </div>
    <button
      type="button"
      onClick={() => void queryWeather(keyword)}
      disabled={isLoading}
      className="px-4 py-2.5 rounded-xl bg-white text-[#137fec] text-sm font-semibold hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity shrink-0"
    >
      查询
    </button>
  </div>

  {error && weather && (
    <p className="mt-2 text-xs text-red-200">{error}</p>
  )}
</div>
```

**Step 3: Verify TypeScript compiles**

```bash
cd /root/navstation && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors).

---

### Task 2: Rewrite the content area — metrics row + states

**Files:**
- Modify: `src/components/WeatherQuickSearchModal.tsx`

The scrollable body div gets a plain white background. The old "current conditions" card is removed and replaced with a 4-column metrics strip. Loading/error/empty states get updated styling.

**Step 1: Replace the scrollable body wrapper**

```tsx
// OLD
<div className="max-h-[65vh] overflow-y-auto p-4">

// NEW
<div className="max-h-[60vh] overflow-y-auto bg-white">
```

**Step 2: Replace loading/error/empty state renders**

Inside `renderContent()`, replace all three early-return state renders:

```tsx
// Loading state
if (isLoading && !weather) {
  return (
    <div className="py-16 flex flex-col items-center text-slate-400">
      <span className="material-symbols-outlined text-[40px] mb-3 animate-spin text-[#137fec]">progress_activity</span>
      <p className="text-sm">查询中...</p>
    </div>
  );
}

// Error state
if (error && !weather) {
  return (
    <div className="py-16 flex flex-col items-center text-red-400">
      <span className="material-symbols-outlined text-[40px] mb-3">error</span>
      <p className="text-sm font-medium">{error}</p>
    </div>
  );
}

// Empty/idle state
if (!weather) {
  return (
    <div className="py-16 flex flex-col items-center text-slate-400">
      <span className="material-symbols-outlined text-[48px] mb-3 text-slate-300">partly_cloudy_day</span>
      <p className="text-sm">输入中文地区名或 district_id 后点击查询</p>
    </div>
  );
}
```

**Step 3: Add the 4-column metrics strip at the top of the data render**

Replace the existing `<div className="rounded-xl border border-slate-200 p-4">` current conditions card. The new metrics strip goes at the very top of the `return (...)` inside `renderContent`, before the `<div className="space-y-4">`:

```tsx
return (
  <div>
    {/* Metrics strip */}
    <div className="grid grid-cols-4 gap-px bg-slate-100">
      {[
        { label: '风向风力', value: `${toText(now?.wind_dir)} ${toText(now?.wind_class)}` },
        { label: 'AQI', value: toText(now?.aqi) },
        { label: 'PM2.5 / PM10', value: `${toText(now?.pm25)} / ${toText(now?.pm10)}` },
        { label: '1h降水 / 能见度', value: `${toText(now?.prec_1h, 'mm')} / ${toText(now?.vis, 'm')}` },
      ].map((item) => (
        <div key={item.label} className="bg-white px-3 py-3 text-center">
          <p className="text-xs text-slate-400 mb-1">{item.label}</p>
          <p className="text-sm font-semibold text-slate-800 truncate">{item.value}</p>
        </div>
      ))}
    </div>

    {/* Rest of content */}
    <div className="space-y-4 p-4">
      {/* ... alerts, forecasts, indexes go here — Task 3 */}
    </div>
  </div>
);
```

**Step 4: Verify TypeScript compiles**

```bash
cd /root/navstation && npx tsc --noEmit 2>&1 | head -30
```

---

### Task 3: Rewrite alerts, 7-day forecast, and life indices sections

**Files:**
- Modify: `src/components/WeatherQuickSearchModal.tsx`

Fill in the `{/* ... alerts, forecasts, indexes go here */}` placeholder with redesigned sections.

**Step 1: Replace the alerts section**

```tsx
{alerts.length > 0 && (
  <div className="rounded-xl bg-amber-50 border-l-4 border-amber-400 px-4 py-3">
    <div className="flex items-center gap-2 mb-1">
      <span className="material-symbols-outlined text-amber-500 text-[18px]">warning</span>
      <p className="text-sm font-semibold text-amber-800">天气预警</p>
    </div>
    <div className="space-y-2">
      {alerts.map((alert, idx) => (
        <div key={`${alert.title || alert.type || 'alert'}-${idx}`}>
          <p className="text-sm font-medium text-amber-700">
            {[alert.type, alert.level, alert.title].filter(Boolean).join(' ') || '预警信息'}
          </p>
          {alert.desc && <p className="text-xs text-amber-600 mt-0.5">{alert.desc}</p>}
        </div>
      ))}
    </div>
  </div>
)}
```

**Step 2: Replace the 7-day forecast section**

```tsx
<div>
  <p className="text-sm font-semibold text-slate-700 mb-2">7日预报</p>
  <div className="rounded-xl overflow-hidden border border-slate-100">
    {forecasts.length > 0 ? (
      forecasts.slice(0, 7).map((item, idx) => (
        <div
          key={`${item.date || idx}-${item.week || ''}`}
          className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
        >
          <p className="text-sm text-slate-500 w-28 shrink-0">{item.date || '-'} {item.week || ''}</p>
          <p className="text-sm text-slate-600 flex-1 truncate">{toText(item.text_day)} 转 {toText(item.text_night)}</p>
          <p className="text-sm font-semibold text-slate-800 shrink-0 ml-2">
            {toText(item.low)}~{toText(item.high)}°C
          </p>
        </div>
      ))
    ) : (
      <p className="text-sm text-slate-400 px-4 py-3">暂无预报数据</p>
    )}
  </div>
</div>
```

**Step 3: Replace the life indices section**

```tsx
<div>
  <p className="text-sm font-semibold text-slate-700 mb-2">生活指数</p>
  {indexes.length > 0 ? (
    <div className="grid grid-cols-2 gap-3">
      {indexes.map((item, idx) => (
        <div key={`${item.name || 'index'}-${idx}`} className="bg-slate-50 rounded-xl p-3">
          <p className="text-sm font-semibold text-slate-800">{item.name || '指数'}</p>
          <p className="text-xs text-[#137fec] mt-0.5 font-medium">{item.brief || '-'}</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.detail || '-'}</p>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-sm text-slate-400">暂无生活指数数据</p>
  )}
</div>
```

**Step 4: Verify TypeScript compiles**

```bash
cd /root/navstation && npx tsc --noEmit 2>&1 | head -30
```

**Step 5: Commit**

```bash
cd /root/navstation
git add src/components/WeatherQuickSearchModal.tsx
git commit -m "feat(ui): redesign weather modal with gradient hero and glass cards"
```

---

## Verification Checklist

After all tasks:

- [ ] `npx tsc --noEmit` passes with no new errors
- [ ] Modal opens and shows gradient hero with temperature/condition
- [ ] Search input has frosted-glass styling on blue background
- [ ] 4-column metrics strip shows below hero
- [ ] 7-day forecast rows have hover highlight
- [ ] Life indices show 2-column grid with blue brief text
- [ ] Loading spinner shows on initial load
- [ ] Error state renders with red icon
- [ ] Close button (×) and refresh icon button work
