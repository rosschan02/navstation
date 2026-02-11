'use client';

import React, { useEffect, useState } from 'react';
import type { PhonebookEntry } from '@/types';

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
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<PhonebookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

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
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch(buildQueryUrl(keyword), { signal: controller.signal });
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
      alert('复制失败，请手动复制');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">电话本速查</h3>
                <p className="text-xs text-slate-500 mt-1">支持按科室名称、短码或长码搜索</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="关闭"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="relative mt-4">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                type="text"
                autoFocus
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="输入科室名或电话号码..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-4">
            {isLoading ? (
              <div className="py-10 text-center text-slate-400 text-sm">查询中...</div>
            ) : error ? (
              <div className="py-10 text-center text-red-500 text-sm">{error}</div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                {keyword.trim() ? '没有找到匹配结果' : '暂无电话本数据'}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const shortCopied = copiedKey === `${item.id}-short`;
                  const longCopied = copiedKey === `${item.id}-long`;

                  return (
                    <div key={item.id} className="border border-slate-200 rounded-xl p-4 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{item.department_name}</p>
                          {item.remark && <p className="text-xs text-slate-500 mt-1">{item.remark}</p>}
                        </div>
                        <a
                          href={`tel:${item.long_code}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 shrink-0"
                          title="拨打长码"
                        >
                          <span className="material-symbols-outlined text-[16px]">call</span>
                          拨号
                        </a>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        <button
                          onClick={() => handleCopy(item.short_code, `${item.id}-short`)}
                          className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
                        >
                          <span className="text-xs text-slate-500">短码</span>
                          <span className="text-sm font-mono text-slate-900">{shortCopied ? '已复制' : item.short_code}</span>
                        </button>

                        <button
                          onClick={() => handleCopy(item.long_code, `${item.id}-long`)}
                          className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
                        >
                          <span className="text-xs text-slate-500">长码</span>
                          <span className="text-sm font-mono text-slate-900">{longCopied ? '已复制' : item.long_code}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
