'use client';

import React from 'react';
import type { SoftwareItem } from '@/types';

interface SoftwareClientProps {
  items: SoftwareItem[];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function SoftwareClient({ items }: SoftwareClientProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12 bg-background-light">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">软件下载</h2>
              <p className="text-slate-500 text-base mt-2">常用软件资源，点击下载</p>
            </div>
          </div>

          <div className="relative w-full max-w-lg mt-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400">search</span>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              placeholder="搜索软件..."
            />
          </div>
        </div>

        {/* Software List */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="material-symbols-outlined text-[48px] mb-4">folder_open</span>
            <p className="text-lg font-medium">暂无可下载的软件</p>
            <p className="text-sm mt-1">管理员可在后台上传软件</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
            {items.map((item) => (
              <div
                key={item.id}
                className="group flex items-center gap-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 p-4"
              >
                {/* Left: Icon */}
                <div className={`size-14 rounded-lg ${item.icon_bg || 'bg-blue-100'} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined ${item.icon_color || 'text-blue-600'} text-[28px]`}>{item.icon || 'download'}</span>
                </div>

                {/* Middle: Info */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900 truncate">{item.name}</h3>
                    {item.version && (
                      <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">v{item.version}</span>
                    )}
                  </div>
                  <p className="text-slate-500 text-sm line-clamp-1 mt-0.5">{item.description || item.file_name}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">hard_drive</span>
                      {formatFileSize(item.file_size)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">download</span>
                      {item.download_count} 次下载
                    </span>
                  </div>
                </div>

                {/* Right: Download Button */}
                <a
                  href={`/api/software/${item.id}/download`}
                  className="shrink-0 flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                  title="下载"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
