'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getLocaleDisplayName } from '@/lib/i18n/config';

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const href = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ''}`;

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {routing.locales.map((value) => {
        const active = value === locale;
        return (
          <Link
            key={value}
            href={href}
            locale={value}
            replace
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
