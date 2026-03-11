'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface AdministrativeRegionQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RegionSearchItem {
  uid: string;
  name: string;
  location: {
    lat: number | null;
    lng: number | null;
  };
  street_id: string;
  detail: number;
  province: string;
  city: string;
  area: string;
  town: string;
  town_code: string;
  address: string;
}

interface RegionSearchResponse {
  status: number;
  message: string;
  resultType: string;
  queryType: string;
  total: number;
  items: RegionSearchItem[];
}

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-blue-100 text-blue-700',
  4: 'bg-green-100 text-green-700',
};

const PROVINCES = [
  '北京市',
  '天津市',
  '上海市',
  '重庆市',
  '河北省',
  '山西省',
  '辽宁省',
  '吉林省',
  '黑龙江省',
  '江苏省',
  '浙江省',
  '安徽省',
  '福建省',
  '江西省',
  '山东省',
  '河南省',
  '湖北省',
  '湖南省',
  '广东省',
  '海南省',
  '四川省',
  '贵州省',
  '云南省',
  '陕西省',
  '甘肃省',
  '青海省',
  '台湾省',
  '内蒙古自治区',
  '广西壮族自治区',
  '西藏自治区',
  '宁夏回族自治区',
  '新疆维吾尔自治区',
  '香港特别行政区',
  '澳门特别行政区',
];

function buildSearchUrl(query: string, region: string): string {
  const params = new URLSearchParams();
  params.set('query', query.trim());
  params.set('region', region.trim());
  return `/api/regions/search?${params.toString()}`;
}

export function AdministrativeRegionQuickSearchModal({
  isOpen,
  onClose,
}: AdministrativeRegionQuickSearchModalProps) {
  const t = useTranslations('regionSearch');
  const [keyword, setKeyword] = useState('');
  const [province, setProvince] = useState('');
  const [items, setItems] = useState<RegionSearchItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<RegionSearchItem | null>(null);
  const [responseMeta, setResponseMeta] = useState<Omit<RegionSearchResponse, 'items'>>({
    status: 0,
    message: '',
    resultType: '',
    queryType: '',
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((p) => (p === code ? '' : p)), 1500);
    } catch { /* ignore */ }
  };

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
      setKeyword('');
      setProvince('');
      setItems([]);
      setSelectedItem(null);
      setResponseMeta({
        status: 0,
        message: '',
        resultType: '',
        queryType: '',
        total: 0,
      });
      setError('');
      setHasSearched(false);
      setIsLoading(false);
      setCopiedCode('');
    }
  }, [isOpen]);

  const handleSearch = async () => {
    const query = keyword.trim();
    const region = province.trim();

    setHasSearched(true);
    if (!region) {
      setError(t('selectProvinceFirst'));
      setItems([]);
      return;
    }
    if (!query) {
      setError(t('enterKeyword'));
      setItems([]);
      return;
    }

    setIsLoading(true);
    setError('');
    setSelectedItem(null);
    try {
      const res = await fetch(buildSearchUrl(query, region), { cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as Partial<RegionSearchResponse> & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || t('searchFailed'));
      }
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems(nextItems);
      setResponseMeta({
        status: Number(data.status) || 0,
        message: data.message || '',
        resultType: data.resultType || '',
        queryType: data.queryType || '',
        total: Number(data.total) || nextItems.length,
      });
    } catch (err) {
      setItems([]);
      setResponseMeta({
        status: 0,
        message: '',
        resultType: '',
        queryType: '',
        total: 0,
      });
      setError((err as Error).message || t('searchFailedRetry'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderDetailView = () => {
    if (!selectedItem) return null;

    // Derive division codes from town_code (9-digit street code from Baidu v3)
    const tc = selectedItem.town_code;
    const divisionChain = tc
      ? [
          { level: 1, name: selectedItem.province, code: tc.slice(0, 2) },
          { level: 2, name: selectedItem.city,     code: tc.slice(0, 4) },
          { level: 3, name: selectedItem.area,     code: tc.slice(0, 6) },
          { level: 4, name: selectedItem.town,     code: tc },
        ].filter((d) => d.name)
      : [];

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedItem(null)}
          className="inline-flex items-center gap-1.5 text-base text-primary hover:opacity-80"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          {t('backToList')}
        </button>

        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <h4 className="text-xl font-semibold text-slate-900 break-words">{selectedItem.name || '-'}</h4>
          <p className="mt-2 text-base text-slate-700 break-words">
            <span className="font-medium text-slate-800">{t('detailAddress')}</span>
            {selectedItem.address || '-'}
          </p>
        </div>

        {divisionChain.length > 0 && (
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[18px] text-slate-400">account_tree</span>
              <p className="text-sm text-slate-500 font-medium">{t('divisionCodes')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {divisionChain.map((div, idx) => (
                <React.Fragment key={div.code}>
                  {idx > 0 && <span className="text-slate-300 text-base">›</span>}
                  <button
                    onClick={() => handleCopyCode(div.code)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors group"
                    title={t('copyCode')}
                  >
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${LEVEL_COLORS[div.level] || 'bg-gray-100 text-gray-700'}`}>
                      {t(`level${div.level}`)}
                    </span>
                    <span className="text-base font-medium text-slate-800">{div.name}</span>
                    {copiedCode === div.code ? (
                      <span className="text-sm text-green-600 font-semibold">{t('copiedCode', { code: div.code })}</span>
                    ) : (
                      <span className="text-sm font-mono text-slate-500 group-hover:text-primary">{div.code}</span>
                    )}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-sm text-slate-500">{t('latitude')}</p>
            <p className="mt-1 text-lg font-mono text-slate-800">{selectedItem.location.lat ?? '-'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-sm text-slate-500">{t('longitude')}</p>
            <p className="mt-1 text-lg font-mono text-slate-800">{selectedItem.location.lng ?? '-'}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (selectedItem) {
      return renderDetailView();
    }

    if (!hasSearched) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[48px] mb-3 text-slate-300">location_city</span>
          <p className="text-sm">{t('initialPrompt')}</p>
          <p className="text-xs mt-1 text-slate-300">{t('initialExample')}</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[36px] mb-3 animate-spin">progress_activity</span>
          <p className="text-sm">{t('searching')}</p>
        </div>
      );
    }

    if (error) {
      return <div className="py-16 text-center text-red-500 text-sm">{error}</div>;
    }

    if (items.length === 0) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[48px] mb-3 text-slate-300">search_off</span>
          <p className="text-sm">{t('emptyTitle')}</p>
          <p className="text-xs mt-1 text-slate-300">{t('emptySubtitle')}</p>
        </div>
      );
    }

    return (
      <div>
        <div className="px-1 mb-3 flex flex-wrap items-center gap-2">
          <p className="text-xs text-slate-500">{t('resultsFound', { count: items.length })}</p>
          {responseMeta.queryType && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
              query_type: {responseMeta.queryType}
            </span>
          )}
          {responseMeta.resultType && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
              result_type: {responseMeta.resultType}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const regionText = [item.province, item.city, item.area, item.town].filter(Boolean).join(' / ') || '-';
            return (
              <div
                key={`${item.uid || item.name}-${index}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-primary/30 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 break-words">{item.name || '-'}</p>
                    <p className="mt-1 text-xs text-slate-500 break-words">{t('regionLabel', { value: regionText })}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="shrink-0 px-3 h-8 rounded-lg border border-slate-200 text-xs text-slate-700 hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    {t('viewDetail')}
                  </button>
                </div>

                <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-400">{t('address')}</p>
                  <p className="text-sm text-slate-700 break-words">{item.address || '-'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">{t('quickTitle')}</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label={t('close')}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)_auto] gap-3 mt-3">
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-colors"
              >
                <option value="">{t('selectProvince')}</option>
                {PROVINCES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                  type="text"
                  autoFocus={!selectedItem}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder={t('locationPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={handleSearch}
                disabled={isLoading}
                className="h-[42px] px-4 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
              >
                {isLoading ? t('searching') : t('search')}
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-4">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
