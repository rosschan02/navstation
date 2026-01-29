'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { Category } from '@/types';

const AVATAR_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuC3104b5kXiw4PZePiO9fBovMiepftLrdVAtMSVBV8aUn1EI-W_F6OCUtrCdMAl0oEKjHg_WTszK1_2e4vOO3VLVe5J7oyGUBntqK2fCcO4gQ6zMLxgE6hSW5_Se69QiyotWXogd7-N_e2PjSXO1Kg_JClrFKPBTRiAeEPlwhe3lC1cS1pngM-Y4jPPoki36CSAvA7MWo_-7KrkYPyUNEPfTwAz0RSVw31BPvw5t7hWjlMuNT-9ZoKWv0NM-nKbirlPPNVsIp5s1wg";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  requiresAuth?: boolean;
}


const ADMIN_ITEMS: NavItem[] = [
  { href: '/admin', icon: 'folder_shared', label: '站点管理', requiresAuth: true },
  { href: '/admin/categories', icon: 'category', label: '分类管理', requiresAuth: true },
  { href: '/admin/software', icon: 'cloud_upload', label: '软件管理', requiresAuth: true },
  { href: '/analytics', icon: 'analytics', label: '数据分析', requiresAuth: true },
];

interface SidebarProps {
  onLoginClick: () => void;
}

export function Sidebar({ onLoginClick }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLoggedIn, logout } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);

  const selectedCategory = searchParams.get('category') || 'all';

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        const filtered = data.filter((c: Category) => c.type === 'site' || c.type === 'qrcode');
        setCategories(filtered);
      })
      .catch(console.error);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const getLinkClass = (href: string) => {
    const active = isActive(href);
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group cursor-pointer ${
      active
        ? 'bg-primary/10 text-primary font-semibold'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
    }`;
  };

  const getIconClass = (href: string) => {
    const active = isActive(href);
    return `material-symbols-outlined text-[20px] ${
      active ? 'filled text-primary' : 'group-hover:text-primary'
    }`;
  };

  return (
    <aside className="flex flex-col w-64 h-full bg-white border-r border-slate-200 shrink-0 z-20">
      <div className="flex flex-col h-full p-4">
        {/* Header */}
        <div className="flex items-center gap-3 px-2 py-4 mb-2">
          <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>rocket_launch</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 text-base font-bold leading-tight">导航站</h1>
            <p className="text-slate-500 text-xs font-normal">v2.0 中文版</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto py-2 no-scrollbar">
          {/* 首页（全部） */}
          <Link href="/" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group cursor-pointer ${
            pathname === '/' && selectedCategory === 'all'
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
          }`}>
            <span className={`material-symbols-outlined text-[20px] ${
              pathname === '/' && selectedCategory === 'all' ? 'filled text-primary' : 'group-hover:text-primary'
            }`}>home</span>
            <span className="text-sm">首页</span>
          </Link>

          {/* 分类列表 */}
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/?category=${category.id}`}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group cursor-pointer ${
                pathname === '/' && selectedCategory === category.id.toString()
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${
                pathname === '/' && selectedCategory === category.id.toString() ? 'text-primary' : category.icon_color + ' group-hover:text-primary'
              }`}>{category.icon}</span>
              <span className="text-sm">{category.label}</span>
            </Link>
          ))}

          {/* 软件下载 */}
          <Link href="/software" className={getLinkClass('/software')}>
            <span className={getIconClass('/software')}>download</span>
            <span className="text-sm">软件下载</span>
          </Link>

          <div className="my-2 border-t border-slate-200 mx-2" />

          {isLoggedIn ? (
            <>
              <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">工作区</p>
              {ADMIN_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} className={getLinkClass(item.href)}>
                  <span className={getIconClass(item.href)}>{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                </Link>
              ))}
            </>
          ) : (
            <div onClick={onLoginClick} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group cursor-pointer text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium">
              <span className="material-symbols-outlined text-[20px] group-hover:text-primary">lock</span>
              <span className="text-sm">管理员登录</span>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="mt-auto pt-4">
          <div className="flex items-center gap-3 px-2 py-2 cursor-pointer rounded-lg hover:bg-slate-100 transition-colors group relative">
            <div
              className="size-8 rounded-full bg-slate-200 bg-cover bg-center"
              style={{ backgroundImage: `url('${AVATAR_URL}')` }}
            />
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-slate-900 truncate">{isLoggedIn ? '管理员' : '访客用户'}</span>
              <span className="text-xs text-slate-500 truncate">{isLoggedIn ? '已登录' : '只读模式'}</span>
            </div>

            {isLoggedIn && (
              <button
                onClick={(e) => { e.stopPropagation(); logout(); }}
                className="ml-auto p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                title="退出登录"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
