'use client';

import React from 'react';
import type { ResourceItem } from '@/types';

interface ResourcesClientProps {
  items: ResourceItem[];
  config: { title: string; description: string };
}

export function ResourcesClient({ items, config }: ResourcesClientProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12 bg-background-light">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{config.title}</h2>
              <p className="text-slate-500 text-base mt-2">{config.description}</p>
            </div>
            <div className="hidden sm:flex bg-slate-100 p-1 rounded-lg">
              <button className="px-3 py-1.5 bg-white text-slate-900 shadow-sm rounded-md text-sm font-medium transition-all">全部</button>
              <button className="px-3 py-1.5 text-slate-500 hover:text-slate-900 rounded-md text-sm font-medium transition-all">最新</button>
              <button className="px-3 py-1.5 text-slate-500 hover:text-slate-900 rounded-md text-sm font-medium transition-all">最热</button>
            </div>
          </div>

          <div className="relative w-full max-w-lg mt-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400">search</span>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              placeholder={`在 ${config.title} 中搜索...`}
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 p-4"
            >
              {/* Left: Logo */}
              <div className={`size-12 rounded-lg ${item.icon_bg || 'bg-slate-100'} flex items-center justify-center shrink-0`}>
                {item.img ? (
                  <img src={item.img} alt={item.title} className="size-7 object-contain" />
                ) : (
                  <span className={`material-symbols-outlined ${item.icon_color || 'text-slate-500'} text-[24px]`}>{item.icon}</span>
                )}
              </div>

              {/* Right: Name and Description */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900 group-hover:text-primary transition-colors truncate">{item.title}</h3>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all text-[18px] shrink-0">arrow_forward</span>
                </div>
                <p className="text-slate-500 text-sm line-clamp-1 mt-0.5">{item.description}</p>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.slice(0, 3).map((tag: string) => (
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
      </div>
    </div>
  );
}
