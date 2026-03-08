'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { type Locale, getLocaleDisplayName, withLocale } from '@/lib/i18n/config';
import { localizeUiText } from '@/lib/i18n/translate';

interface LocaleContextValue {
  locale: Locale;
  localeLabel: string;
  t: (text: string) => string;
  withLocalePath: (href: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    localeLabel: getLocaleDisplayName(locale),
    t: (text: string) => localizeUiText(locale, text),
    withLocalePath: (href: string) => withLocale(locale, href),
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocaleContext() {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error('useLocaleContext must be used within LocaleProvider');
  }
  return value;
}
