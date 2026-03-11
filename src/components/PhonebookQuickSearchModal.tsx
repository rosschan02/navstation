'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PhonebookEntry } from '@/types';
import { useMessage } from '@/contexts/MessageContext';

interface PhonebookQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitorId: string;
}

function buildQueryUrl(keyword: string, visitorId: string): string {
  const search = keyword.trim();
  const params = new URLSearchParams();
  params.set('limit', '30');
  params.set('sid', visitorId);
  params.set('page', 'home');
  if (search) params.set('search', search);
  return `/api/phonebook?${params.toString()}`;
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function PhonebookQuickSearchModal({ isOpen, onClose, visitorId }: PhonebookQuickSearchModalProps) {
  const t = useTranslations('phonebookQuickSearch');
  const message = useMessage();
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<PhonebookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

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
    setItems([]);
    setError('');
    setCopiedKey('');
    setHasSearched(false);
    setIsLoading(false);
  }, [isOpen]);

  const handleSearch = async () => {
    const trimmed = keyword.trim();
    setHasSearched(true);

    if (!trimmed) {
      setItems([]);
      setError(t('enterKeyword'));
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(buildQueryUrl(trimmed, visitorId), { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t('searchFailed'));
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setItems([]);
      setError((err as Error).message || t('searchFailedRetry'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (value: string, key: string) => {
    try {
      await copyText(value);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? '' : prev));
      }, 1500);
    } catch {
      message.error(t('copyFailed'));
    }
  };

  if (!isOpen) return null;

  const renderContent = () => {
    if (!hasSearched) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[48px] mb-3 text-slate-300">search</span>
          <p className="text-base">{t('initialPrompt')}</p>
          <p className="text-sm mt-1 text-slate-300">{t('initialSubtitle')}</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[36px] mb-3 animate-spin">progress_activity</span>
          <p className="text-base">{t('searching')}</p>
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
          <p className="text-base">{t('emptyTitle')}</p>
          <p className="text-sm mt-1 text-slate-300">{t('emptySubtitle')}</p>
        </div>
      );
    }

    return (
      <div>
        <p className="text-sm text-slate-500 px-1 mb-2">{t('resultsFound', { count: items.length })}</p>
        <div className="flex items-center px-4 py-2 text-sm text-slate-500 font-medium border-b border-slate-100">
          <span className="flex-1 min-w-0">{t('department')}</span>
          <span className="w-24 text-center shrink-0">{t('shortCode')}</span>
          <span className="w-36 text-center shrink-0">{t('longCode')}</span>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((item) => {
            const shortCopied = copiedKey === `${item.id}-short`;
            const longCopied = copiedKey === `${item.id}-long`;

            return (
              <div
                key={item.id}
                className="flex items-center px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                {/* Department */}
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-base text-slate-900 truncate">{item.department_name}</p>
                  {item.remark && <p className="text-sm text-slate-500 truncate">{item.remark}</p>}
                </div>

                {/* Short code */}
                <div className="w-24 text-center shrink-0">
                  {item.short_code ? (
                    <button
                      onClick={() => handleCopy(item.short_code, `${item.id}-short`)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-primary/10 transition-colors group"
                      title={t('copy')}
                    >
                      {shortCopied ? (
                        <span className="text-sm text-green-600 font-medium">{t('copied')}</span>
                      ) : (
                        <>
                          <span className="text-xl font-mono font-semibold text-slate-800">{item.short_code}</span>
                          <span className="material-symbols-outlined text-[15px] text-slate-300 group-hover:text-primary transition-colors">content_copy</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-sm text-slate-300">-</span>
                  )}
                </div>

                {/* Long code */}
                <div className="w-36 text-center shrink-0">
                  {item.long_code ? (
                    <button
                      onClick={() => handleCopy(item.long_code, `${item.id}-long`)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-primary/10 transition-colors group"
                      title={t('copy')}
                    >
                      {longCopied ? (
                        <span className="text-sm text-green-600 font-medium">{t('copied')}</span>
                      ) : (
                        <>
                          <span className="text-base font-mono font-semibold text-slate-800">{item.long_code}</span>
                          <span className="material-symbols-outlined text-[15px] text-slate-300 group-hover:text-primary transition-colors">content_copy</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-sm text-slate-300">-</span>
                  )}
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
        <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">{t('title')}</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label={t('close')}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="relative mt-3">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                type="text"
                autoFocus
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSearch();
                  }
                }}
                placeholder={t('placeholder')}
                className="w-full pl-10 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 px-3 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
              >
                {isLoading ? t('searchingShort') : t('search')}
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
