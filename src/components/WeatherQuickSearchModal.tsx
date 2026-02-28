'use client';

import React, { useCallback, useEffect, useState } from 'react';

interface WeatherQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WeatherLocation {
  country?: string;
  province?: string;
  city?: string;
  name?: string;
  id?: string;
}

interface WeatherNow {
  text?: string;
  temp?: number;
  feels_like?: number;
  rh?: number;
  wind_class?: string;
  wind_dir?: string;
  prec_1h?: number;
  vis?: number;
  aqi?: number;
  pm25?: number;
  pm10?: number;
  pressure?: number;
  uvi?: number;
  uptime?: string;
}

interface WeatherIndex {
  name?: string;
  brief?: string;
  detail?: string;
}

interface WeatherForecast {
  date?: string;
  week?: string;
  text_day?: string;
  text_night?: string;
  high?: number;
  low?: number;
  wd_day?: string;
  wc_day?: string;
}

interface WeatherAlert {
  title?: string;
  type?: string;
  level?: string;
  desc?: string;
}

interface WeatherResult {
  location?: WeatherLocation;
  now?: WeatherNow;
  indexes?: WeatherIndex[];
  alerts?: WeatherAlert[];
  forecasts?: WeatherForecast[];
}

interface WeatherResponse {
  status?: number;
  message?: string;
  error?: string;
  result?: WeatherResult;
}

const DEFAULT_DISTRICT_ID = '441881';
const DEFAULT_DISTRICT_NAME = '英德市';
const DISTRICT_ID_PATTERN = /^\d{6,12}$/;

function formatUpdateTime(value?: string): string {
  if (!value) return '-';
  if (/^\d{14}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)} ${value.slice(8, 10)}:${value.slice(10, 12)}`;
  }
  return value;
}

function toText(value: unknown, suffix = ''): string {
  if (typeof value === 'number' && Number.isFinite(value)) return `${value}${suffix}`;
  if (typeof value === 'string' && value.trim()) return `${value}${suffix}`;
  return '-';
}

function getWeatherIndexVisual(indexName?: string): {
  icon: string;
  badgeClass: string;
  iconClass: string;
  briefClass: string;
} {
  const name = indexName || '';
  if (name.includes('紫外线')) {
    return {
      icon: 'wb_sunny',
      badgeClass: 'bg-amber-100',
      iconClass: 'text-amber-700',
      briefClass: 'text-amber-700',
    };
  }
  if (name.includes('感冒')) {
    return {
      icon: 'masks',
      badgeClass: 'bg-cyan-100',
      iconClass: 'text-cyan-700',
      briefClass: 'text-cyan-700',
    };
  }
  if (name.includes('洗车')) {
    return {
      icon: 'directions_car',
      badgeClass: 'bg-emerald-100',
      iconClass: 'text-emerald-700',
      briefClass: 'text-emerald-700',
    };
  }
  if (name.includes('穿衣')) {
    return {
      icon: 'checkroom',
      badgeClass: 'bg-rose-100',
      iconClass: 'text-rose-700',
      briefClass: 'text-rose-700',
    };
  }
  if (name.includes('晨练') || name.includes('运动')) {
    return {
      icon: 'fitness_center',
      badgeClass: 'bg-orange-100',
      iconClass: 'text-orange-700',
      briefClass: 'text-orange-700',
    };
  }
  if (name.includes('雨') || name.includes('降水')) {
    return {
      icon: 'umbrella',
      badgeClass: 'bg-indigo-100',
      iconClass: 'text-indigo-700',
      briefClass: 'text-indigo-700',
    };
  }
  return {
    icon: 'monitoring',
    badgeClass: 'bg-blue-100',
    iconClass: 'text-blue-700',
    briefClass: 'text-blue-700',
  };
}

export function WeatherQuickSearchModal({ isOpen, onClose }: WeatherQuickSearchModalProps) {
  const [keyword, setKeyword] = useState(DEFAULT_DISTRICT_NAME);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const queryWeather = useCallback(async (targetKeyword: string, forceRefresh = false) => {
    const normalized = targetKeyword.trim();
    const params = new URLSearchParams();
    if (normalized) {
      if (DISTRICT_ID_PATTERN.test(normalized)) {
        params.set('district_id', normalized);
      } else {
        params.set('district', normalized);
      }
    }
    if (forceRefresh) {
      params.set('force', '1');
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/api/weather?${queryString}` : '/api/weather';
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(endpoint, {
        cache: 'no-store',
      });
      const data = (await res.json().catch(() => ({}))) as WeatherResponse;
      if (!res.ok) {
        throw new Error(data.error || '天气查询失败');
      }
      if (!data.result) {
        throw new Error('天气数据为空');
      }
      setWeather(data.result);
    } catch (err) {
      setWeather(null);
      setError((err as Error).message || '天气查询失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setKeyword(DEFAULT_DISTRICT_NAME);
      setWeather(null);
      setIsLoading(false);
      setError('');
      return;
    }
    void queryWeather('');
  }, [isOpen, queryWeather]);

  if (!isOpen) return null;

  const location = weather?.location;
  const now = weather?.now;
  const forecasts = weather?.forecasts || [];
  const indexes = weather?.indexes || [];
  const alerts = weather?.alerts || [];

  const renderContent = () => {
    if (isLoading && !weather) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[40px] mb-3 animate-spin text-[#137fec]">progress_activity</span>
          <p className="text-sm">查询中...</p>
        </div>
      );
    }

    if (error && !weather) {
      return (
        <div className="py-16 flex flex-col items-center text-red-400">
          <span className="material-symbols-outlined text-[40px] mb-3">error</span>
          <p className="text-sm font-medium">{error}</p>
        </div>
      );
    }

    if (!weather) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[48px] mb-3 text-slate-300">partly_cloudy_day</span>
          <p className="text-sm">输入中文地区名或 district_id 后点击查询</p>
        </div>
      );
    }

    return (
      <div>
        {/* Metrics strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100">
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

        <div className="space-y-5 p-5">
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

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">7日预报</p>
            <div className="rounded-xl border border-slate-100 overflow-x-auto">
              {forecasts.length > 0 ? (
                forecasts.slice(0, 7).map((item, idx) => (
                  <div
                    key={`${item.date || idx}-${item.week || ''}`}
                    className="grid grid-cols-[170px_minmax(240px,1fr)_120px] items-center gap-3 px-4 py-2.5 min-w-[560px] hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <p className="text-sm text-slate-500 whitespace-nowrap">{item.date || '-'} {item.week || ''}</p>
                    <p className="text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">{toText(item.text_day)} 转 {toText(item.text_night)}</p>
                    <p className="text-sm font-semibold text-slate-800 whitespace-nowrap text-right">
                      {toText(item.low)}~{toText(item.high)}°C
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 px-4 py-3">暂无预报数据</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">生活指数</p>
            {indexes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {indexes.map((item, idx) => {
                  const visual = getWeatherIndexVisual(item.name);
                  return (
                    <div key={`${item.name || 'index'}-${idx}`} className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center size-7 rounded-lg ${visual.badgeClass}`}>
                          <span className={`material-symbols-outlined text-[18px] ${visual.iconClass}`}>{visual.icon}</span>
                        </span>
                        <p className="text-sm font-semibold text-slate-800">{item.name || '指数'}</p>
                      </div>
                      <p className={`text-xs mt-1 font-medium ${visual.briefClass}`}>{item.brief || '-'}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.detail || '-'}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">暂无生活指数数据</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label="天气速查">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden">
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
                className="p-1.5 rounded-lg bg-white/20 text-white/70 hover:text-white hover:bg-white/30 shrink-0"
                aria-label="关闭"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Row 2+3: temperature + condition + secondary metrics (only when data loaded) */}
            {weather && now ? (
              <>
                <div className="flex items-end gap-3 mb-1">
                  <p className="text-6xl font-bold text-white leading-none">{toText(now.temp, '°C')}</p>
                  <p className="text-2xl text-white/80 mb-1">{toText(now.text)}</p>
                </div>
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
                  aria-label="地区名或 district_id"
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

          <div className="max-h-[60vh] overflow-y-auto bg-white">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
