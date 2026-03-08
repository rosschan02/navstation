'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Category, SiteData } from '@/types';
import { buildAnalyticsSource } from '@/lib/analyticsSource';
import { getOrCreateVisitorId } from '@/lib/visitorId';
import { PhonebookQuickSearchModal } from '@/components/PhonebookQuickSearchModal';
import { AdministrativeDivisionModal } from '@/components/AdministrativeDivisionModal';
import { WeatherQuickSearchModal } from '@/components/WeatherQuickSearchModal';

const DEFAULT_HOME_WEATHER_DISTRICT_ID = '441881';
const DEFAULT_HOME_WEATHER_LABEL = '英德市';

interface HomeWeatherLocation {
  province?: string;
  city?: string;
  name?: string;
}

interface HomeWeatherNow {
  text?: string;
  temp?: number;
  uptime?: string;
}

interface HomeWeatherResult {
  location?: HomeWeatherLocation;
  now?: HomeWeatherNow;
}

interface HomeWeatherResponse {
  error?: string;
  result?: HomeWeatherResult;
}

function formatWeatherUpdateTime(value?: string): string {
  if (!value) return '';
  if (/^\d{14}$/.test(value)) {
    return `${value.slice(8, 10)}:${value.slice(10, 12)}`;
  }
  const match = value.match(/(\d{2}:\d{2})/);
  return match?.[1] || value;
}

function getWeatherIcon(text?: string): string {
  const value = (text || '').toLowerCase();
  if (!value) return 'partly_cloudy_day';
  if (value.includes('雷')) return 'thunderstorm';
  if (value.includes('雪')) return 'weather_snowy';
  if (value.includes('雨')) return 'rainy';
  if (value.includes('雾') || value.includes('霾')) return 'foggy';
  if (value.includes('风')) return 'air';
  if (value.includes('晴')) return 'wb_sunny';
  if (value.includes('阴')) return 'cloud';
  if (value.includes('云')) return 'partly_cloudy_day';
  return 'partly_cloudy_day';
}

interface HomeClientProps {
  categories: Category[];
  sites: SiteData[];
  footerText?: string;
  clientIP?: string;
}

export function HomeClient({ categories, sites, footerText, clientIP }: HomeClientProps) {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [visitorId, setVisitorId] = useState('anon');
  const [isPhonebookModalOpen, setIsPhonebookModalOpen] = useState(false);
  const [isAdminDivisionModalOpen, setIsAdminDivisionModalOpen] = useState(false);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [weatherSummary, setWeatherSummary] = useState<HomeWeatherResult | null>(null);
  const [isWeatherSummaryLoading, setIsWeatherSummaryLoading] = useState(true);
  const [weatherSummaryError, setWeatherSummaryError] = useState('');
  const selectedCategory = searchParams.get('category') || 'all';

  useEffect(() => {
    setVisitorId(getOrCreateVisitorId());
  }, []);

  const loadWeatherSummary = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('district_id', DEFAULT_HOME_WEATHER_DISTRICT_ID);
    params.set('track', '0');

    setIsWeatherSummaryLoading(true);
    setWeatherSummaryError('');

    try {
      const res = await fetch(`/api/weather?${params.toString()}`, { cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as HomeWeatherResponse;
      if (!res.ok || !data.result) {
        throw new Error(data.error || '天气加载失败');
      }
      setWeatherSummary(data.result);
    } catch (error) {
      setWeatherSummary(null);
      setWeatherSummaryError((error as Error).message || '天气加载失败');
    } finally {
      setIsWeatherSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWeatherSummary();
  }, [loadWeatherSummary]);

  // Filter sites based on search and category
  const filteredSites = useMemo(() => {
    return sites.filter(site => {
      // Category filter
      if (selectedCategory !== 'all' && site.category_id?.toString() !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          site.name.toLowerCase().includes(query) ||
          site.description?.toLowerCase().includes(query) ||
          site.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [sites, selectedCategory, searchQuery]);

  // Group sites by category
  const groupedSites = useMemo(() => {
    const groups: Record<string, { category: Category; sites: SiteData[] }> = {};

    filteredSites.forEach(site => {
      const categoryId = site.category_id?.toString() || 'uncategorized';
      if (!groups[categoryId]) {
        const category = categories.find(c => c.id.toString() === categoryId);
        groups[categoryId] = {
          category: category || {
            id: 0,
            name: 'uncategorized',
            label: '未分类',
            type: 'site',
            css_class: '',
            icon: 'folder',
            icon_bg: 'bg-slate-100',
            icon_color: 'text-slate-600',
            sort_order: 999,
          },
          sites: [],
        };
      }
      groups[categoryId].sites.push(site);
    });

    // Sort by category sort_order
    return Object.values(groups).sort((a, b) => a.category.sort_order - b.category.sort_order);
  }, [filteredSites, categories]);

  const trackClick = useCallback((siteId: number) => {
    const body = JSON.stringify({
      target_type: 'site',
      target_id: siteId,
      source: buildAnalyticsSource({
        page: 'home',
        visitorId,
        category: selectedCategory,
        hasSearch: !!searchQuery.trim(),
      }),
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/click', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/analytics/click', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      });
    }
  }, [searchQuery, selectedCategory, visitorId]);

  const weatherLocationLabel = useMemo(() => {
    const location = weatherSummary?.location;
    return location?.name || location?.city || location?.province || DEFAULT_HOME_WEATHER_LABEL;
  }, [weatherSummary]);

  const weatherTempLabel = useMemo(() => {
    const temp = weatherSummary?.now?.temp;
    return typeof temp === 'number' && Number.isFinite(temp) ? `${temp}°C` : '--';
  }, [weatherSummary]);

  const weatherTextLabel = weatherSummary?.now?.text || (weatherSummaryError ? '加载失败' : '天气摘要');
  const weatherUpdateLabel = formatWeatherUpdateTime(weatherSummary?.now?.uptime);

  return (
    <div className="flex-1 overflow-y-auto w-full bg-background-light">
      <div className="max-w-[2200px] mr-auto w-full px-6 py-8 flex flex-col gap-6">

        {/* Search Bar */}
        <section className="flex flex-wrap items-center gap-3 w-full">
          {/* Client IP Badge */}
          {clientIP && (
            <div className="hidden sm:flex items-center shrink-0">
              <span className="text-lg font-bold text-slate-900">您的IP：</span>
              <span className="text-lg font-mono text-slate-600">{clientIP}</span>
            </div>
          )}
          <div className="flex-1 min-w-[260px] max-w-2xl relative">
            <label className="flex flex-col w-full group relative z-10">
              <div className="flex w-full items-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 h-14 overflow-hidden focus-within:ring-2 focus-within:ring-primary transition-shadow">
                <div className="flex items-center justify-center pl-5 pr-3 text-slate-400">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input
                  className="w-full h-full bg-transparent border-none focus:ring-0 text-base text-slate-900 placeholder:text-slate-400 font-normal focus:outline-none"
                  placeholder="搜索站点..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="pr-4 text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                )}
              </div>
            </label>
          </div>
          <button
            type="button"
            onClick={() => setIsWeatherModalOpen(true)}
            className="shrink-0 w-full sm:w-[220px] md:w-[240px] h-12 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 via-cyan-50 to-white shadow-sm overflow-hidden flex items-center gap-3 px-4 text-left hover:bg-white/40 transition-colors"
            aria-label="英德市天气详情"
          >
            <span className={`material-symbols-outlined text-[22px] shrink-0 ${weatherSummaryError ? 'text-rose-500' : 'text-sky-600'}`}>
              {weatherSummaryError ? 'cloud_off' : getWeatherIcon(weatherSummary?.now?.text)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 min-w-0">
                <span className="truncate text-sm font-semibold text-slate-900">{weatherLocationLabel}</span>
                <span className="shrink-0 text-sm font-bold text-sky-700">{weatherTempLabel}</span>
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                {isWeatherSummaryLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                    <span>天气加载中</span>
                  </>
                ) : weatherSummaryError ? (
                  <span className="truncate">天气加载失败</span>
                ) : (
                  <span className="truncate">
                    {weatherTextLabel}
                    {weatherUpdateLabel ? ` · ${weatherUpdateLabel} 更新` : ''}
                  </span>
                )}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsAdminDivisionModalOpen(true)}
            className="shrink-0 h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-primary hover:border-primary/30 hover:bg-primary/5 shadow-sm transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">location_city</span>
            <span className="hidden md:inline text-sm font-medium">行政区域查询</span>
          </button>
          <button
            type="button"
            onClick={() => setIsPhonebookModalOpen(true)}
            className="shrink-0 h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-primary hover:border-primary/30 hover:bg-primary/5 shadow-sm transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">dialpad</span>
            <span className="hidden md:inline text-sm font-medium">院内电话速查</span>
          </button>
        </section>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="text-sm text-slate-500">
            找到 <span className="font-medium text-slate-900">{filteredSites.length}</span> 个结果
          </div>
        )}

        {/* Sites by Category */}
        {groupedSites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="material-symbols-outlined text-[48px] mb-4">search_off</span>
            <p className="text-lg font-medium">没有找到匹配的站点</p>
            <p className="text-sm mt-1">尝试其他关键词或分类</p>
          </div>
        ) : (
          groupedSites.map(({ category, sites: categorySites }) => (
            <section key={category.id} className="flex flex-col gap-4">
              {/* Category Header */}
              <div className="flex items-center gap-3">
                <div className={`size-8 rounded-lg ${category.icon_bg} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined ${category.icon_color} text-[18px]`}>{category.icon}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">{category.label}</h2>
                <span className="text-sm text-slate-400">({categorySites.length})</span>
              </div>

              {/* Sites Grid */}
              {category.type === 'qrcode' ? (
                // QR Code Grid
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {categorySites.map((site) => (
                    <div
                      key={site.id}
                      className="group flex flex-col items-center bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-primary/30 transition-all"
                    >
                      {/* QR Image */}
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-slate-50 mb-3">
                        {site.qr_image ? (
                          <img src={site.qr_image} alt={site.name} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-300 text-[48px]">qr_code_2</span>
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 text-center truncate w-full">{site.name}</h3>
                      {site.description && (
                        <p className="text-xs text-slate-500 text-center truncate w-full mt-0.5">{site.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // Regular Sites Grid
                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,320px))] justify-start gap-4">
                  {categorySites.map((site) => (
                    <a
                      key={site.id}
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackClick(site.id)}
                      className="group flex items-center gap-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 p-4"
                    >
                      {/* Icon/Logo */}
                      <div className={`size-12 rounded-lg ${site.icon_bg || 'bg-slate-100'} flex items-center justify-center shrink-0 overflow-hidden`}>
                        {site.logo ? (
                          <img src={site.logo} alt={site.name} className="size-8 object-contain" />
                        ) : (
                          <span className={`material-symbols-outlined ${site.icon_color || 'text-slate-500'} text-[24px]`}>{site.icon || 'link'}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900 group-hover:text-primary transition-colors truncate">{site.name}</h3>
                        </div>
                        <p className="text-slate-500 text-sm line-clamp-1 mt-0.5">{site.description}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>
          ))
        )}

        {/* Footer */}
        <div className="w-full py-6 text-center text-slate-400 text-xs border-t border-slate-200 mt-8">
          <p>{footerText || '© 2024 通用站点导航。保留所有权利。'}</p>
        </div>
      </div>

      <PhonebookQuickSearchModal
        isOpen={isPhonebookModalOpen}
        onClose={() => setIsPhonebookModalOpen(false)}
        visitorId={visitorId}
      />
      <AdministrativeDivisionModal
        isOpen={isAdminDivisionModalOpen}
        onClose={() => setIsAdminDivisionModalOpen(false)}
        visitorId={visitorId}
      />
      <WeatherQuickSearchModal
        isOpen={isWeatherModalOpen}
        onClose={() => setIsWeatherModalOpen(false)}
        visitorId={visitorId}
      />
    </div>
  );
}
