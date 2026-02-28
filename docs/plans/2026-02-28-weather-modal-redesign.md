# Weather Modal Redesign — Design Document

**Date**: 2026-02-28
**File**: `src/components/WeatherQuickSearchModal.tsx`
**Reference**: Stitch project "Weather Dashboard - Yingde" (projects/12153382509293657976)

## Overview

Redesign the existing `WeatherQuickSearchModal` from a flat border-card layout to a hero-section + frosted-glass card aesthetic, referencing the Stitch design. Modal form is preserved; light mode only.

---

## Modal Container

- Size: `max-w-2xl` (672px), `max-h-[85vh]` scrollable body
- Shape: `rounded-2xl overflow-hidden shadow-2xl`
- No border (shadow provides depth separation)
- Backdrop overlay: `bg-slate-900/50 backdrop-blur-sm`

---

## Hero Section (fixed, non-scrolling)

Blue gradient header that shows location, current conditions, and search input.

**Background**: `bg-gradient-to-br from-[#137fec] to-[#0d5cb8]`

### Row 1 — Location + Close
- Left: `pin_drop` icon + full location string (省 市 区)
- Right: close button `bg-white/20 hover:bg-white/30 rounded-lg p-1.5`

### Row 2 — Temperature + Condition
- Temperature: `text-6xl font-bold text-white`
- Weather text (e.g. "多云"): `text-2xl text-white/80`

### Row 3 — Secondary metrics + Refresh
- Body feel, humidity, update time in `text-sm text-white/70`
- Refresh button: `bg-white/20 hover:bg-white/30` icon-only on right

### Row 4 — Search bar
- Input: `bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder:text-white/50`
- Search button: `bg-white text-[#137fec] font-medium rounded-xl`

---

## Content Area (scrollable)

White background `bg-white`, internal padding `p-4`, vertical `space-y-4`.

### Metrics Row

4-column grid immediately below hero section.

| Wind | AQI | PM2.5/PM10 | Visibility/Precip |
|------|-----|------------|-------------------|

- Each cell: `bg-slate-50 rounded-xl p-3 text-center`
- Label: `text-xs text-slate-400 mb-1`
- Value: `text-sm font-semibold text-slate-800`

### Alert Banner (conditional)

Only rendered when `alerts.length > 0`.

- Container: `bg-amber-50 border-l-4 border-amber-400 rounded-xl px-4 py-3`
- Title row: amber icon + bold alert type/level
- Description: `text-xs text-amber-700 mt-1`

### 7-Day Forecast

- Section header: `text-sm font-semibold text-slate-700 mb-2`
- Each row: `flex items-center justify-between py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-lg px-2`
- Columns: date+weekday (fixed width) | weather icon name | low~high°C (right-aligned bold)
- Wind info hidden on small screens

### Life Indices

- Section header: `text-sm font-semibold text-slate-700 mb-2`
- Grid: `grid-cols-2 gap-3`
- Each card: `bg-slate-50 rounded-xl p-3`
  - Name: `text-sm font-semibold text-slate-800`
  - Brief: `text-xs text-[#137fec] mt-0.5`
  - Detail: `text-xs text-slate-500 mt-1 leading-relaxed`

---

## States

| State | Rendering |
|-------|-----------|
| Loading (initial) | Hero area shows spinner overlay; content area empty |
| Loading (refresh) | Hero area shows data + loading spinner in refresh button |
| Error | Full-height error card with `error` icon + message |
| Empty (no query yet) | Full-height idle card with `partly_cloudy_day` icon |
| Data loaded | Full layout as described above |

---

## Implementation Scope

- **File changed**: `src/components/WeatherQuickSearchModal.tsx` (rewrite JSX/styles only)
- **No logic changes**: API calls, state management, data interfaces remain identical
- **No new dependencies**: uses existing Tailwind + Material Symbols
