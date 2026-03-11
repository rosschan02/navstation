'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { SoftwareItem, Category } from '@/types';
import { getOrCreateVisitorId } from '@/lib/visitorId';

interface SoftwareClientProps {
  items: SoftwareItem[];
  categories: Category[];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function SoftwareClient({ items, categories }: SoftwareClientProps) {
  const t = useTranslations('software');
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [visitorId, setVisitorId] = useState('anon');

  useEffect(() => {
    setVisitorId(getOrCreateVisitorId());
  }, []);

  const formatUploadTime = useCallback((value: string): string => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Shanghai',
    }).format(date);
  }, [locale]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) =>
      item.name.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.file_name.toLowerCase().includes(query),
    );
  }, [items, searchQuery]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, { category: Category; items: SoftwareItem[] }> = {};

    filteredItems.forEach((item) => {
      const categoryId = item.category_id?.toString() || 'uncategorized';
      if (!groups[categoryId]) {
        const category = categories.find((c) => c.id.toString() === categoryId);
        groups[categoryId] = {
          category: category || {
            id: 0,
            name: 'uncategorized',
            label: t('uncategorized'),
            type: 'software',
            css_class: '',
            icon: 'folder',
            icon_bg: 'bg-slate-100',
            icon_color: 'text-slate-600',
            sort_order: 999,
          },
          items: [],
        };
      }
      groups[categoryId].items.push(item);
    });

    return Object.values(groups).sort((a, b) => a.category.sort_order - b.category.sort_order);
  }, [filteredItems, categories, t]);

  const buildDownloadUrl = useCallback((item: SoftwareItem) => {
    const params = new URLSearchParams({
      sid: visitorId,
      cat: item.category_id?.toString() || 'none',
      q: searchQuery.trim() ? '1' : '0',
    });
    return `/api/software/${item.id}/download?${params.toString()}`;
  }, [searchQuery, visitorId]);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12 bg-background-light">
      <div className="max-w-[2200px] mr-auto w-full flex flex-col gap-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{t('title')}</h2>
              <p className="text-slate-500 text-base mt-2">{t('subtitle')}</p>
            </div>
          </div>

          <div className="relative w-full max-w-lg mt-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400">search</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              placeholder={t('searchPlaceholder')}
            />
          </div>
        </div>

        {searchQuery && (
          <div className="text-sm text-slate-500">
            {t('resultsFound', { count: filteredItems.length })}
          </div>
        )}

        {groupedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="material-symbols-outlined text-[48px] mb-4">folder_open</span>
            <p className="text-lg font-medium">{searchQuery ? t('noMatchingSoftware') : t('noSoftwareAvailable')}</p>
            <p className="text-sm mt-1">{searchQuery ? t('tryOtherKeywords') : t('adminCanUpload')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8 pb-12">
            {groupedItems.map(({ category, items: categoryItems }) => (
              <section key={category.id} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className={`size-8 rounded-lg ${category.icon_bg} flex items-center justify-center`}>
                    <span className={`material-symbols-outlined ${category.icon_color} text-[18px]`}>{category.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{category.label}</h3>
                  <span className="text-sm text-slate-400">({categoryItems.length})</span>
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,340px))] justify-start gap-4">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center gap-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 p-4"
                    >
                      {item.logo ? (
                        <div className="size-14 rounded-lg overflow-hidden shrink-0 bg-white border border-slate-100">
                          <img src={item.logo} alt={item.name} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className={`size-14 rounded-lg ${item.icon_bg || 'bg-blue-100'} flex items-center justify-center shrink-0`}>
                          <span className={`material-symbols-outlined ${item.icon_color || 'text-blue-600'} text-[28px]`}>{item.icon || 'download'}</span>
                        </div>
                      )}

                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900 truncate">{item.name}</h3>
                          {item.version && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">v{item.version}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {t('updatedAt', { time: formatUploadTime(item.created_at) })}
                        </p>
                        <p className="text-slate-500 text-sm line-clamp-1 mt-0.5">{item.description || item.file_name}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">hard_drive</span>
                            {formatFileSize(item.file_size)}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">download</span>
                            {t('downloads', { count: item.download_count })}
                          </span>
                        </div>
                      </div>

                      <a
                        href={buildDownloadUrl(item)}
                        className="shrink-0 flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                        title={t('download')}
                      >
                        <span className="material-symbols-outlined text-[20px]">download</span>
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
