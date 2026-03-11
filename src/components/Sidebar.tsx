'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from '@/i18n/navigation';
import type { Category, SiteSettings } from '@/types';
import { LocaleSwitcher } from './LocaleSwitcher';

interface NavItem {
  href: string;
  icon: string;
  labelKey:
    | 'siteManagement'
    | 'categoryManagement'
    | 'softwareManagement'
    | 'phonebookManagement'
    | 'dnsManagement'
    | 'analytics'
    | 'apiManagement'
    | 'accountSettings'
    | 'adminTools'
    | 'siteSettings';
  requiresAuth?: boolean;
}

const ADMIN_ITEMS: NavItem[] = [
  { href: '/admin', icon: 'folder_shared', labelKey: 'siteManagement', requiresAuth: true },
  { href: '/admin/categories', icon: 'category', labelKey: 'categoryManagement', requiresAuth: true },
  { href: '/admin/software', icon: 'cloud_upload', labelKey: 'softwareManagement', requiresAuth: true },
  { href: '/admin/phonebook', icon: 'dialpad', labelKey: 'phonebookManagement', requiresAuth: true },
  { href: '/admin/dns', icon: 'dns', labelKey: 'dnsManagement', requiresAuth: true },
  { href: '/analytics', icon: 'analytics', labelKey: 'analytics', requiresAuth: true },
  { href: '/admin/keys', icon: 'key', labelKey: 'apiManagement', requiresAuth: true },
  { href: '/admin/profile', icon: 'person', labelKey: 'accountSettings', requiresAuth: true },
  { href: '/admin/tools', icon: 'terminal', labelKey: 'adminTools', requiresAuth: true },
  { href: '/admin/settings', icon: 'tune', labelKey: 'siteSettings', requiresAuth: true },
];

interface SidebarProps {
  onLoginClick: () => void;
}

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: '导航站',
  site_description: '综合导航门户与站点管理仪表板',
  site_version: 'v2.0 中文版',
  footer_text: '© 2024 通用站点导航。保留所有权利。',
  logo_url: '',
  site_icon_url: '',
  default_locale: 'en',
};

const COLLAPSE_BREAKPOINT = 1024;

function stripLocale(pathname: string) {
  return pathname.replace(/^\/(en|zh-CN|ko|ja)(?=\/|$)/, '') || '/';
}

export function Sidebar({ onLoginClick }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, logout } = useAuth();
  const nav = useTranslations('nav');
  const auth = useTranslations('auth');
  const common = useTranslations('common');
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [collapsed, setCollapsed] = useState(false);
  const internalPathname = stripLocale(pathname);

  const handleResize = useCallback(() => {
    if (typeof window !== 'undefined') {
      setCollapsed(window.innerWidth < COLLAPSE_BREAKPOINT);
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const selectedCategory = searchParams.get('category') || 'all';

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter((c: Category) => c.type === 'site' || c.type === 'qrcode');
        setCategories(filtered);
      })
      .catch(console.error);

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch(console.error);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') {
      return internalPathname === href;
    }
    return internalPathname === href || internalPathname.startsWith(`${href}/`);
  };

  const getLinkClass = (href: string) => {
    const active = isActive(href);
    return `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg transition-colors group cursor-pointer ${
      active
        ? 'bg-primary/10 text-primary font-semibold'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
    }`;
  };

  const getIconClass = (href: string) => {
    const active = isActive(href);
    return `material-symbols-outlined text-[20px] ${active ? 'filled text-primary' : 'group-hover:text-primary'}`;
  };

  return (
    <aside className={`flex flex-col h-full bg-white border-r border-slate-200 shrink-0 z-20 transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-64'}`}>
      <div className="flex flex-col h-full p-4">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-2 py-4 mb-2`}>
          <div className={`flex items-center justify-center size-10 rounded-xl overflow-hidden shrink-0 ${settings.logo_url ? '' : 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-primary/20'}`}>
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={settings.site_name} className="size-10 object-contain" />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>rocket_launch</span>
            )}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <h1 className="text-slate-900 text-base font-bold leading-tight truncate">{settings.site_name}</h1>
              <p className="text-slate-500 text-xs font-normal">{settings.site_version}</p>
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto py-2 no-scrollbar">
          <Link
            href="/"
            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg transition-colors group cursor-pointer ${
              internalPathname === '/' && selectedCategory === 'all'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
            }`}
            title={collapsed ? nav('home') : undefined}
          >
            <span className={`material-symbols-outlined text-[20px] shrink-0 ${internalPathname === '/' && selectedCategory === 'all' ? 'filled text-primary' : 'group-hover:text-primary'}`}>home</span>
            {!collapsed && <span className="text-sm">{nav('home')}</span>}
          </Link>

          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/?category=${category.id}`}
              className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg transition-colors group cursor-pointer ${
                internalPathname === '/' && selectedCategory === category.id.toString()
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
              title={collapsed ? category.label : undefined}
            >
              <span className={`material-symbols-outlined text-[20px] shrink-0 ${internalPathname === '/' && selectedCategory === category.id.toString() ? 'text-primary' : `${category.icon_color} group-hover:text-primary`}`}>{category.icon}</span>
              {!collapsed && <span className="text-sm">{category.label}</span>}
            </Link>
          ))}

          <Link href="/software" className={getLinkClass('/software')} title={collapsed ? nav('softwareDownload') : undefined}>
            <span className={`${getIconClass('/software')} shrink-0`}>download</span>
            {!collapsed && <span className="text-sm">{nav('softwareDownload')}</span>}
          </Link>

          <div className="my-2 border-t border-slate-200 mx-2" />

          {isLoggedIn ? (
            <>
              {!collapsed && <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{nav('workspace')}</p>}
              {ADMIN_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} className={getLinkClass(item.href)} title={collapsed ? nav(item.labelKey) : undefined}>
                  <span className={`${getIconClass(item.href)} shrink-0`}>{item.icon}</span>
                  {!collapsed && <span className="text-sm">{nav(item.labelKey)}</span>}
                </Link>
              ))}
            </>
          ) : (
            <div
              onClick={onLoginClick}
              className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg transition-colors group cursor-pointer text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium`}
              title={collapsed ? auth('adminLogin') : undefined}
            >
              <span className="material-symbols-outlined text-[20px] group-hover:text-primary shrink-0">lock</span>
              {!collapsed && <span className="text-sm">{auth('adminLogin')}</span>}
            </div>
          )}
        </nav>

        <div className="mt-auto pt-4 space-y-2">
          {!collapsed && <LocaleSwitcher />}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} w-full px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors`}
            title={collapsed ? nav('expandSidebar') : nav('collapseSidebar')}
          >
            <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}>
              chevron_left
            </span>
            {!collapsed && <span className="text-sm">{common('collapse')}</span>}
          </button>

          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-2 py-2 cursor-pointer rounded-lg hover:bg-slate-100 transition-colors group relative`}>
            <div className="size-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="size-8 object-cover" />
              ) : (
                <span className="material-symbols-outlined text-slate-400 text-[20px]">person</span>
              )}
            </div>
            {!collapsed && (
              <>
                <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                  <span className="text-sm font-medium text-slate-900 truncate">{isLoggedIn ? (user?.username || auth('administrator')) : auth('guestUser')}</span>
                  <span className="text-xs text-slate-500 truncate">{isLoggedIn ? auth('signedIn') : auth('readOnlyMode')}</span>
                </div>

                {isLoggedIn && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      logout();
                    }}
                    className="ml-auto p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors shrink-0"
                    title={auth('signOut')}
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
