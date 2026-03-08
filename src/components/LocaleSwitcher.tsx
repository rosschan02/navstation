'use client';

import React from 'react';
import Link from 'next/link';
import { SUPPORTED_LOCALES, getLocaleDisplayName } from '@/lib/i18n/config';
import { useLocaleContext } from '@/contexts/LocaleContext';

export function LocaleSwitcher() {
  const { locale, withLocalePath } = useLocaleContext();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {SUPPORTED_LOCALES.map((value) => {
        const active = value === locale;
        return (
          <Link
            key={value}
            href={withLocalePath('/')}
            locale={false}
            replace
            onClick={(event) => {
              event.preventDefault();
              const path = window.location.pathname + window.location.search;
              const withoutLocale = path.replace(/^\/(en|zh-CN|ko|ja)(?=\/|$)/, '') || '/';
              window.location.href = `/${value}${withoutLocale === '/' ? '' : withoutLocale}`;
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {getLocaleDisplayName(value)}
          </Link>
        );
      })}
    </div>
  );
}
