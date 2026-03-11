'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface LocalAdministrativeDivisionQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DivisionListItem {
  level: number;
  code: string;
  name_zh: string;
  name_en: string;
  full_name_zh: string;
  has_children: boolean;
  parent_level: number | null;
  parent_code: string | null;
}

interface DivisionNode extends DivisionListItem {
  province_code: string;
  city_code: string | null;
  county_code: string | null;
  town_code: string | null;
  full_name_en: string;
}

interface SearchResponse {
  total: number;
  items: DivisionListItem[];
}

interface DetailResponse {
  node: DivisionNode;
  ancestors: DivisionListItem[];
  children: DivisionListItem[];
}

const LEVEL_OPTIONS = [
  { value: 4, labelKey: 'level4' },
  { value: 3, labelKey: 'level3' },
  { value: 2, labelKey: 'level2' },
  { value: 1, labelKey: 'level1' },
] as const;

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-blue-100 text-blue-700',
  4: 'bg-green-100 text-green-700',
};

function buildSearchUrl(keyword: string, level: number): string {
  const params = new URLSearchParams();
  params.set('keyword', keyword.trim());
  params.set('level', String(level));
  params.set('limit', '80');
  return `/api/admin-divisions?${params.toString()}`;
}

function buildDetailUrl(level: number, code: string): string {
  const params = new URLSearchParams();
  params.set('detail_level', String(level));
  params.set('detail_code', code);
  return `/api/admin-divisions?${params.toString()}`;
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

export function LocalAdministrativeDivisionQuickSearchModal({
  isOpen,
  onClose,
}: LocalAdministrativeDivisionQuickSearchModalProps) {
  const t = useTranslations('regionSearch');
  const [keyword, setKeyword] = useState('');
  const [level, setLevel] = useState(4);
  const [items, setItems] = useState<DivisionListItem[]>([]);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) return;
    setKeyword('');
    setLevel(4);
    setItems([]);
    setDetail(null);
    setIsLoading(false);
    setError('');
    setHasSearched(false);
    setCopiedCode('');
  }, [isOpen]);

  const handleCopy = async (code: string) => {
    try {
      await copyText(code);
      setCopiedCode(code);
      setTimeout(() => {
        setCopiedCode((prev) => (prev === code ? '' : prev));
      }, 1500);
    } catch {
      // ignore
    }
  };

  const handleSearch = async () => {
    const trimmed = keyword.trim();
    setHasSearched(true);

    if (!trimmed) {
      setError(t('enterKeyword'));
      setItems([]);
      return;
    }

    setIsLoading(true);
    setError('');
    setDetail(null);

    try {
      const res = await fetch(buildSearchUrl(trimmed, level), { cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as Partial<SearchResponse> & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || t('searchFailed'));
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setItems([]);
      setError((err as Error).message || t('searchFailedRetry'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = async (nextLevel: number, code: string) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(buildDetailUrl(nextLevel, code), { cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as Partial<DetailResponse> & { error?: string };
      if (!res.ok || !data.node) {
        throw new Error(data.error || t('detailFailed'));
      }
      setDetail({
        node: data.node,
        ancestors: Array.isArray(data.ancestors) ? data.ancestors : [],
        children: Array.isArray(data.children) ? data.children : [],
      });
    } catch (err) {
      setError((err as Error).message || t('detailFailedRetry'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderDetail = () => {
    if (!detail) return null;

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setDetail(null)}
          className="inline-flex items-center gap-1.5 text-base text-primary hover:opacity-80"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          {t('backToList')}
        </button>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${LEVEL_COLORS[detail.node.level] || 'bg-slate-100 text-slate-700'}`}>
              {t(`level${detail.node.level}`)}
            </span>
            <h4 className="text-lg font-semibold text-slate-900 break-words">{detail.node.name_zh}</h4>
          </div>
          <p className="mt-2 text-sm text-slate-600 break-words">{detail.node.full_name_zh || '-'}</p>
          <button
            type="button"
            onClick={() => handleCopy(detail.node.code)}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:text-primary hover:border-primary/40 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">content_copy</span>
            {copiedCode === detail.node.code ? t('copied') : t('codeValue', { code: detail.node.code })}
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[18px] text-slate-400">account_tree</span>
            <p className="text-sm text-slate-500 font-medium">{t('ancestorChain')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {detail.ancestors.map((item, index) => (
              <React.Fragment key={`${item.level}-${item.code}`}>
                {index > 0 && <span className="text-slate-300 text-base">›</span>}
                <button
                  type="button"
                  onClick={() => handleOpenDetail(item.level, item.code)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors"
                >
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${LEVEL_COLORS[item.level] || 'bg-slate-100 text-slate-700'}`}>
                    {t(`level${item.level}`)}
                  </span>
                  <span className="text-sm text-slate-800">{item.name_zh}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[18px] text-slate-400">nearby</span>
            <p className="text-sm text-slate-500 font-medium">{t('childrenRegions')}</p>
          </div>

          {detail.children.length === 0 ? (
            <p className="text-sm text-slate-400">{t('noChildren')}</p>
          ) : (
            <div className="space-y-2">
              {detail.children.map((child) => (
                <div
                  key={`${child.level}-${child.code}`}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 hover:border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 break-words">{child.name_zh}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{child.code}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(child.level, child.code)}
                      className="shrink-0 px-3 h-8 rounded-lg border border-slate-200 text-xs text-slate-700 hover:text-primary hover:border-primary/40 transition-colors"
                    >
                      {t('viewDetail')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderList = () => {
    if (!hasSearched) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[48px] mb-3 text-slate-300">account_tree</span>
          <p className="text-sm">{t('localInitialPrompt')}</p>
          <p className="text-xs mt-1 text-slate-300">{t('localInitialExample')}</p>
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
          <p className="text-xs mt-1 text-slate-300">{t('localEmptySubtitle')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500 px-1">{t('resultsFound', { count: items.length })}</p>
        {items.map((item) => (
          <div
            key={`${item.level}-${item.code}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${LEVEL_COLORS[item.level] || 'bg-slate-100 text-slate-700'}`}>
                    {t(`level${item.level}`)}
                  </span>
                  <p className="text-sm font-semibold text-slate-900 break-words">{item.name_zh}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500 break-words">{item.full_name_zh || '-'}</p>
                <p className="mt-1 text-xs font-mono text-slate-400">{item.code}</p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenDetail(item.level, item.code)}
                className="shrink-0 px-3 h-8 rounded-lg border border-slate-200 text-xs text-slate-700 hover:text-primary hover:border-primary/40 transition-colors"
              >
                {t('viewDetail')}
              </button>
            </div>
          </div>
        ))}
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
              <h3 className="text-base font-semibold text-slate-900">{t('localTitle')}</h3>
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
                value={level}
                onChange={(event) => setLevel(Number(event.target.value))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-colors"
              >
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>

              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                  type="text"
                  autoFocus={!detail}
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder={t('localPlaceholder')}
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
            {detail ? renderDetail() : renderList()}
          </div>
        </div>
      </div>
    </div>
  );
}
