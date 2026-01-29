'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SiteData } from '@/types';
import { AddSiteModal } from '@/components/AddSiteModal';

// Category display mapping
const CATEGORY_LABELS: Record<string, string> = {
  'Search Engines': '搜索引擎',
  'Developer Tools': '开发工具',
  'Design Resources': '设计资源',
  'Social Media': '社交媒体',
  'Shopping': '在线购物',
  'Entertainment': '娱乐媒体',
};

export function AdminClient({ initialSites }: { initialSites: SiteData[] }) {
  const router = useRouter();
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);

  const handleDelete = async (id: number) => {
    await fetch(`/api/sites/${id}`, { method: 'DELETE' });
    router.refresh();
  };

  const handleSiteSaved = () => {
    router.refresh();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
      <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex mb-6">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <a href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary">
                <span className="material-symbols-outlined text-[18px] mr-2">home</span>
                仪表盘
              </a>
            </li>
            <li>
              <div className="flex items-center">
                <span className="material-symbols-outlined text-slate-400 text-sm mx-1">chevron_right</span>
                <span className="ml-1 text-sm font-medium text-slate-900 md:ml-2">站点管理</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">站点管理</h1>
            <p className="text-slate-500 mt-1">管理、编辑和组织常用导航链接。</p>
          </div>
          <button
            onClick={() => setIsAddSiteModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>添加站点</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="站点总数" value={initialSites.length.toString()} change="+12%" icon="language" iconColor="text-primary" bg="bg-blue-50" />
          <StatCard title="月点击量" value="45.2k" change="+5.4%" icon="ads_click" iconColor="text-purple-600" bg="bg-purple-50" />
          <StatCard title="活跃用户" value="320" change="+1.2%" icon="group" iconColor="text-amber-600" bg="bg-amber-50" />
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          {/* Toolbar */}
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex gap-4 flex-1">
              <div className="relative w-full max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400">search</span>
                </div>
                <input
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                  placeholder="按名称或链接搜索..."
                  type="text"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white">
                <span className="material-symbols-outlined text-[20px]">filter_list</span>
              </button>
              <button className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white">
                <span className="material-symbols-outlined text-[20px]">download</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left" scope="col">
                    <input className="h-4 w-4 text-primary border-slate-300 rounded focus:ring-primary" type="checkbox" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">站点名称</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">分类</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">链接</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {initialSites.map((site) => (
                  <tr key={site.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input className="h-4 w-4 text-primary border-slate-300 rounded focus:ring-primary" type="checkbox" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 relative">
                          {site.icon ? (
                            <img className="h-10 w-10 rounded-full object-cover p-1 bg-slate-50 border border-slate-100" src={site.icon} alt={site.name} />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                              <span className="material-symbols-outlined text-slate-400">language</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{site.name}</div>
                          <div className="text-xs text-slate-500">
                            添加于 {new Date(site.created_at).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${site.category_class || 'bg-slate-100 text-slate-800'}`}>
                        {site.category_label || CATEGORY_LABELS[site.category_name || ''] || site.category_name || '未分类'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-slate-500 max-w-[200px] truncate group-hover:text-primary cursor-pointer">
                        <span className="material-symbols-outlined text-[14px]">link</span>
                        <a href={site.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{site.url}</a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${site.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-sm text-slate-700">{site.status === 'active' ? '活跃' : '停用'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-slate-400 hover:text-primary p-2 hover:bg-slate-100 rounded-full transition-colors">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(site.id)}
                          className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              显示 <span className="font-medium text-slate-900">1</span> 到 <span className="font-medium text-slate-900">{Math.min(initialSites.length, 10)}</span> 条，共 <span className="font-medium text-slate-900">{initialSites.length}</span> 条
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors" disabled>上一页</button>
              <button className="px-3 py-1 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">下一页</button>
            </div>
          </div>
        </div>
      </div>

      <AddSiteModal
        isOpen={isAddSiteModalOpen}
        onClose={() => setIsAddSiteModalOpen(false)}
        onSaved={handleSiteSaved}
      />
    </div>
  );
}

function StatCard({ title, value, change, icon, iconColor, bg }: { title: string; value: string; change: string; icon: string; iconColor: string; bg: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 ${bg} rounded-lg ${iconColor}`}>
          <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </div>
        <span className="flex items-center text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">
          {change}
          <span className="material-symbols-outlined text-[14px] ml-1">trending_up</span>
        </span>
      </div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
    </div>
  );
}
