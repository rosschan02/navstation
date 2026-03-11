'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface WeatherQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitorId: string;
  defaultKeyword?: string;
  autoLoadKeyword?: string;
  autoLoadTrack?: boolean;
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
  no2?: number;
  so2?: number;
  o3?: number;
  co?: number;
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

interface WeatherForecastHour {
  text?: string;
  temp_fc?: number;
  wind_class?: string;
  wind_dir?: string;
  rh?: number;
  prec_1h?: number;
  pop?: number;
  data_time?: string;
}

interface WeatherResult {
  location?: WeatherLocation;
  now?: WeatherNow;
  indexes?: WeatherIndex[];
  alerts?: WeatherAlert[];
  forecasts?: WeatherForecast[];
  forecast_hours?: WeatherForecastHour[];
}

interface WeatherResponse {
  status?: number;
  message?: string;
  error?: string;
  result?: WeatherResult;
}

const FALLBACK_DEFAULT_DISTRICT_NAME = '英德市';
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

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getHourFromDataTime(value?: string): number | null {
  if (!value) return null;
  if (/^\d{12}$/.test(value)) {
    const hour = Number(value.slice(8, 10));
    return Number.isFinite(hour) ? hour : null;
  }
  if (/^\d{14}$/.test(value)) {
    const hour = Number(value.slice(8, 10));
    return Number.isFinite(hour) ? hour : null;
  }
  return null;
}

function formatHourLabel(value?: string, idx = 0, nowLabel = 'Now'): string {
  if (idx === 0) return nowLabel;
  const hour = getHourFromDataTime(value);
  if (hour === null || hour < 0 || hour > 23) return `+${idx}h`;
  return `${hour.toString().padStart(2, '0')}:00`;
}

function getWeatherIcon(text?: string, isNight = false): string {
  const value = (text || '').toLowerCase();
  if (!value) return isNight ? 'nights_stay' : 'partly_cloudy_day';
  if (value.includes('雷')) return 'thunderstorm';
  if (value.includes('雪')) return 'weather_snowy';
  if (value.includes('雨')) return 'rainy';
  if (value.includes('雾') || value.includes('霾')) return 'foggy';
  if (value.includes('风')) return 'air';
  if (value.includes('晴')) return isNight ? 'nights_stay' : 'wb_sunny';
  if (value.includes('阴')) return 'cloud';
  if (value.includes('云')) return isNight ? 'partly_cloudy_night' : 'partly_cloudy_day';
  return isNight ? 'partly_cloudy_night' : 'partly_cloudy_day';
}

function getAqiVisual(aqiValue: number | null): {
  labelKey: string;
  ringClass: string;
  textClass: string;
  dotClass: string;
} {
  if (aqiValue === null) {
    return {
      labelKey: 'aqiNoData',
      ringClass: 'border-slate-300',
      textClass: 'text-slate-600',
      dotClass: 'bg-slate-400',
    };
  }
  if (aqiValue <= 50) {
    return {
      labelKey: 'aqiExcellent',
      ringClass: 'border-emerald-500',
      textClass: 'text-emerald-700',
      dotClass: 'bg-emerald-500',
    };
  }
  if (aqiValue <= 100) {
    return {
      labelKey: 'aqiGood',
      ringClass: 'border-lime-500',
      textClass: 'text-lime-700',
      dotClass: 'bg-lime-500',
    };
  }
  if (aqiValue <= 150) {
    return {
      labelKey: 'aqiLightPollution',
      ringClass: 'border-amber-500',
      textClass: 'text-amber-700',
      dotClass: 'bg-amber-500',
    };
  }
  if (aqiValue <= 200) {
    return {
      labelKey: 'aqiModeratePollution',
      ringClass: 'border-orange-500',
      textClass: 'text-orange-700',
      dotClass: 'bg-orange-500',
    };
  }
  if (aqiValue <= 300) {
    return {
      labelKey: 'aqiHeavyPollution',
      ringClass: 'border-red-500',
      textClass: 'text-red-700',
      dotClass: 'bg-red-500',
    };
  }
  return {
    labelKey: 'aqiSeverePollution',
    ringClass: 'border-purple-600',
    textClass: 'text-purple-700',
    dotClass: 'bg-purple-600',
  };
}

function metricPercent(value: number | null, max: number): number {
  if (value === null || max <= 0) return 0;
  const ratio = Math.max(0, Math.min(value / max, 1));
  return Math.round(ratio * 100);
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

export function WeatherQuickSearchModal({
  isOpen,
  onClose,
  visitorId,
  defaultKeyword = FALLBACK_DEFAULT_DISTRICT_NAME,
  autoLoadKeyword,
  autoLoadTrack = true,
}: WeatherQuickSearchModalProps) {
  const t = useTranslations('weatherQuickSearch');
  const [keyword, setKeyword] = useState(defaultKeyword);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const queryWeather = useCallback(async (targetKeyword: string, forceRefresh = false, track = true) => {
    const normalized = targetKeyword.trim();
    const params = new URLSearchParams();
    params.set('sid', visitorId);
    params.set('page', 'home');
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
    if (!track) {
      params.set('track', '0');
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
        throw new Error(data.error || t('searchFailed'));
      }
      if (!data.result) {
        throw new Error(t('emptyWeather'));
      }
      setWeather(data.result);
    } catch (err) {
      setWeather(null);
      setError((err as Error).message || t('searchFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [visitorId, t]);

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
      setKeyword(defaultKeyword);
      setWeather(null);
      setIsLoading(false);
      setError('');
    }
  }, [isOpen, defaultKeyword]);

  useEffect(() => {
    if (!isOpen || !autoLoadKeyword) return;
    setKeyword(autoLoadKeyword);
    void queryWeather(autoLoadKeyword, false, autoLoadTrack);
  }, [isOpen, autoLoadKeyword, autoLoadTrack, queryWeather]);

  if (!isOpen) return null;

  const location = weather?.location;
  const now = weather?.now;
  const forecasts = weather?.forecasts || [];
  const forecastHours = weather?.forecast_hours || [];
  const indexes = weather?.indexes || [];
  const alerts = weather?.alerts || [];

  const aqiValue = toNumber(now?.aqi);
  const aqiVisual = getAqiVisual(aqiValue);
  const airMetrics = [
    { label: 'PM2.5', value: toNumber(now?.pm25), unit: 'μg/m³', max: 150 },
    { label: 'PM10', value: toNumber(now?.pm10), unit: 'μg/m³', max: 200 },
    { label: 'NO2', value: toNumber(now?.no2), unit: 'μg/m³', max: 200 },
    { label: 'SO2', value: toNumber(now?.so2), unit: 'μg/m³', max: 150 },
    { label: 'O3', value: toNumber(now?.o3), unit: 'μg/m³', max: 300 },
    { label: 'CO', value: toNumber(now?.co), unit: 'mg/m³', max: 10 },
  ];

  const renderContent = () => {
    if (isLoading && !weather) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[40px] mb-3 animate-spin text-[#137fec]">progress_activity</span>
          <p className="text-sm">{t('searching')}</p>
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
          <p className="text-sm">{t('emptyPrompt')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('wind'), value: `${toText(now?.wind_dir)} ${toText(now?.wind_class)}` },
            { label: t('humidity'), value: toText(now?.rh, '%') },
            { label: t('precipitation1h'), value: toText(now?.prec_1h, 'mm') },
            { label: t('visibility'), value: toText(now?.vis, 'm') },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3">
              <p className="text-xs text-slate-400 mb-1">{item.label}</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{item.value}</p>
            </div>
          ))}
        </div>

        {alerts.length > 0 && (
          <div className="rounded-xl bg-amber-50 border-l-4 border-amber-400 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-amber-500 text-[18px]">warning</span>
              <p className="text-sm font-semibold text-amber-800">{t('alertsTitle')}</p>
            </div>
            <div className="space-y-2">
              {alerts.map((alert, idx) => (
                <div key={`${alert.title || alert.type || 'alert'}-${idx}`}>
                  <p className="text-sm font-medium text-amber-700">
                    {[alert.type, alert.level, alert.title].filter(Boolean).join(' ') || t('alertFallback')}
                  </p>
                  {alert.desc && <p className="text-xs text-amber-600 mt-0.5">{alert.desc}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-800">{t('hourlyForecast')}</p>
            <span className="text-[11px] uppercase tracking-wide font-semibold text-[#137fec]">{t('next24Hours')}</span>
          </div>
          {forecastHours.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {forecastHours.slice(0, 24).map((item, idx) => {
                const hour = getHourFromDataTime(item.data_time);
                const isNight = hour !== null ? hour < 6 || hour >= 18 : idx > 7;
                return (
                  <div
                    key={`${item.data_time || idx}-${item.text || ''}`}
                    className={`min-w-[92px] rounded-xl border px-3 py-3 text-center shrink-0 ${
                      idx === 0 ? 'bg-[#137fec]/10 border-[#137fec]/30' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <p className={`text-xs mb-2 ${idx === 0 ? 'text-[#137fec] font-semibold' : 'text-slate-500'}`}>
                      {formatHourLabel(item.data_time, idx, t('now'))}
                    </p>
                    <span className={`material-symbols-outlined text-[24px] ${idx === 0 ? 'text-[#137fec]' : 'text-slate-500'}`}>
                      {getWeatherIcon(item.text, isNight)}
                    </span>
                    <p className="mt-2 text-base font-semibold text-slate-900">{toText(item.temp_fc, '°')}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t('precipitationLabel', { value: toText(item.pop, '%') })}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t('emptyHourlyForecast')}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700 mb-2">{t('sevenDayForecast')}</p>
            <div className="overflow-x-auto">
              {forecasts.length > 0 ? (
                forecasts.slice(0, 7).map((item, idx) => (
                  <div
                    key={`${item.date || idx}-${item.week || ''}`}
                    className="grid grid-cols-[154px_minmax(200px,1fr)_88px] items-center gap-3 px-3 py-2.5 min-w-[490px] rounded-xl hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <p className="text-sm text-slate-500 whitespace-nowrap">{item.date || '-'} {item.week || ''}</p>
                    <p className="text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">{t('dayToNight', { day: toText(item.text_day), night: toText(item.text_night) })}</p>
                    <p className="text-sm font-semibold text-slate-800 whitespace-nowrap text-right">
                      {toText(item.low)}~{toText(item.high)}°
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 px-4 py-3">{t('emptyForecast')}</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">{t('airQualityTitle')}</p>
            <div className="flex items-center gap-4 mb-4">
              <div className={`h-[72px] w-[72px] rounded-full border-[6px] ${aqiVisual.ringClass} flex flex-col items-center justify-center`}>
                <p className="text-xl font-bold text-slate-900">{aqiValue === null ? '-' : aqiValue}</p>
                <p className={`text-[10px] font-semibold ${aqiVisual.textClass}`}>{t(aqiVisual.labelKey)}</p>
              </div>
              <div className="text-xs text-slate-500 leading-5">
                <p className="font-medium text-slate-700">{t('airQualityLevel')}</p>
                <p>{t('airQualityHint')}</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {airMetrics.map((metric) => {
                const percent = metricPercent(metric.value, metric.max);
                return (
                  <div key={metric.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-600">{metric.label}</span>
                      <span className="font-semibold text-slate-800">
                        {metric.value === null ? '-' : metric.value} {metric.value === null ? '' : metric.unit}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full ${aqiVisual.dotClass}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">{t('lifeIndexTitle')}</p>
          {indexes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {indexes.map((item, idx) => {
                const visual = getWeatherIndexVisual(item.name);
                return (
                  <div key={`${item.name || 'index'}-${idx}`} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center size-7 rounded-lg ${visual.badgeClass}`}>
                        <span className={`material-symbols-outlined text-[18px] ${visual.iconClass}`}>{visual.icon}</span>
                      </span>
                      <p className="text-sm font-semibold text-slate-800">{item.name || t('indexFallback')}</p>
                    </div>
                    <p className={`text-xs mt-1 font-medium ${visual.briefClass}`}>{item.brief || '-'}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.detail || '-'}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t('emptyLifeIndexes')}</p>
          )}
        </div>
      </div>
    );
  };

  const locationLabel = weather
    ? [location?.province, location?.city, location?.name].filter(Boolean).join(' ') || t('title')
    : t('title');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label={t('title')}>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#137fec] to-[#0d5cb8] px-5 pt-4 pb-5">
            {/* Row 1: location + close */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-white/80 text-[18px]">pin_drop</span>
                <span className="text-sm font-medium text-white truncate">{locationLabel}</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/20 text-white/70 hover:text-white hover:bg-white/30 shrink-0"
                aria-label={t('close')}
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
                    {t('currentSummary', {
                      feelsLike: toText(now.feels_like, '°C'),
                      humidity: toText(now.rh, '%'),
                      updatedAt: formatUpdateTime(now.uptime),
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => void queryWeather(keyword, true)}
                    disabled={isLoading}
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 disabled:opacity-40"
                    aria-label={t('refresh')}
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
                  aria-label={t('searchAria')}
                  placeholder={t('placeholder')}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-sm text-white placeholder:text-white/50 focus:outline-none focus:bg-white/30 transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={() => void queryWeather(keyword)}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl bg-white text-[#137fec] text-sm font-semibold hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity shrink-0"
              >
                {t('search')}
              </button>
            </div>

            {error && weather && (
              <p className="mt-2 text-xs text-red-200">{error}</p>
            )}
          </div>

          <div className="max-h-[68vh] overflow-y-auto bg-white">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
