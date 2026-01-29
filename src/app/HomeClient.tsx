'use client';

import React, { useState, useMemo } from 'react';
import type { Category, SiteData } from '@/types';

interface HomeClientProps {
  categories: Category[];
  sites: SiteData[];
}

export function HomeClient({ categories, sites }: HomeClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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

  // Get regular site categories and qrcode categories
  const siteCategories = categories.filter(c => c.type === 'site');
  const qrCategories = categories.filter(c => c.type === 'qrcode');

  return (
    <div className="flex-1 overflow-y-auto w-full bg-background-light">
      <div className="max-w-[1400px] mx-auto w-full px-6 py-8 flex flex-col gap-6">

        {/* Search Bar */}
        <section className="flex justify-center w-full">
          <div className="w-full max-w-2xl relative">
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
        </section>

        {/* Category Filter Tabs */}
        <section className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-primary text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            全部
          </button>
          {siteCategories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id.toString())}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === category.id.toString()
                  ? 'bg-primary text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${
                selectedCategory === category.id.toString() ? '' : category.icon_color
              }`}>{category.icon}</span>
              {category.label}
            </button>
          ))}
          {qrCategories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id.toString())}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === category.id.toString()
                  ? 'bg-primary text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${
                selectedCategory === category.id.toString() ? '' : category.icon_color
              }`}>{category.icon}</span>
              {category.label}
            </button>
          ))}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categorySites.map((site) => (
                    <a
                      key={site.id}
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
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
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900 group-hover:text-primary transition-colors truncate">{site.name}</h3>
                          <span className="material-symbols-outlined text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all text-[18px] shrink-0">arrow_forward</span>
                        </div>
                        <p className="text-slate-500 text-sm line-clamp-1 mt-0.5">{site.description}</p>
                        {site.tags && site.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {site.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-500 border border-slate-100">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
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
          <p>&copy; 2024 通用站点导航。保留所有权利。</p>
        </div>
      </div>
    </div>
  );
}
