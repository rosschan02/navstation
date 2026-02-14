'use client';

import React, { useEffect, useState } from 'react';
import type { PhonebookEntry } from '@/types';
import { useMessage } from '@/contexts/MessageContext';

interface PhonebookQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function buildQueryUrl(keyword: string): string {
  const search = keyword.trim();
  const params = new URLSearchParams();
  params.set('limit', '30');
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

export function PhonebookQuickSearchModal({ isOpen, onClose }: PhonebookQuickSearchModalProps) {
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
    if (!isOpen) {
      setKeyword('');
      setItems([]);
      setError('');
      setCopiedKey('');
      setHasSearched(false);
      return;
    }

    const trimmed = keyword.trim();
    if (!trimmed) {
      setItems([]);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch(buildQueryUrl(trimmed), { signal: controller.signal });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || '查询失败');
        }
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setItems([]);
        setError('查询失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [isOpen, keyword]);

  const handleCopy = async (value: string, key: string) => {
    try {
      await copyText(value);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? '' : prev));
      }, 1500);
    } catch {
      message.error('复制失败，请手动复制');
    }
  };

  if (!isOpen) return null;

  const renderContent = () => {
    if (!hasSearched) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[48px] mb-3 text-slate-300">search</span>
          <p className="text-sm">输入关键词开始搜索</p>
          <p className="text-xs mt-1 text-slate-300">支持科室名称、短码、长码</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[36px] mb-3 animate-spin">progress_activity</span>
          <p className="text-sm">查询中...</p>
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
          <p className="text-sm">没有找到匹配结果</p>
          <p className="text-xs mt-1 text-slate-300">试试其他关键词</p>
        </div>
      );
    }

    return (
      <div>
        <p className="text-xs text-slate-400 px-1 mb-2">找到 {items.length} 条结果</p>
        {/* Table header */}
        <div className="flex items-center px-4 py-2 text-xs text-slate-400 font-medium border-b border-slate-100">
          <span className="flex-1 min-w-0">科室</span>
          <span className="w-20 text-center shrink-0">短码</span>
          <span className="w-32 text-center shrink-0">长码</span>
        </div>
        {/* Rows */}
        <div className="divide-y divide-slate-100">
          {items.map((item) => {
            const shortCopied = copiedKey === `${item.id}-short`;
            const longCopied = copiedKey === `${item.id}-long`;

            return (
              <div
                key={item.id}
                className="flex items-center px-4 py-2.5 hover:bg-slate-50 transition-colors"
              >
                {/* Department */}
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-sm text-slate-900 truncate">{item.department_name}</p>
                  {item.remark && <p className="text-xs text-slate-400 truncate">{item.remark}</p>}
                </div>

                {/* Short code */}
                <div className="w-20 text-center shrink-0">
                  {item.short_code ? (
                    <button
                      onClick={() => handleCopy(item.short_code, `${item.id}-short`)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary/10 transition-colors group"
                      title="点击复制"
                    >
                      {shortCopied ? (
                        <span className="text-xs text-green-600 font-medium">已复制</span>
                      ) : (
                        <>
                          <span className="text-sm font-mono font-semibold text-slate-800">{item.short_code}</span>
                          <span className="material-symbols-outlined text-[13px] text-slate-300 group-hover:text-primary transition-colors">content_copy</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-300">-</span>
                  )}
                </div>

                {/* Long code */}
                <div className="w-32 text-center shrink-0">
                  {item.long_code ? (
                    <button
                      onClick={() => handleCopy(item.long_code, `${item.id}-long`)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary/10 transition-colors group"
                      title="点击复制"
                    >
                      {longCopied ? (
                        <span className="text-xs text-green-600 font-medium">已复制</span>
                      ) : (
                        <>
                          <span className="text-sm font-mono font-semibold text-slate-800">{item.long_code}</span>
                          <span className="material-symbols-outlined text-[13px] text-slate-300 group-hover:text-primary transition-colors">content_copy</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-300">-</span>
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
              <h3 className="text-base font-semibold text-slate-900">电话本速查</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="关闭"
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
                placeholder="搜索科室名称、短码或长码..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-colors"
              />
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
