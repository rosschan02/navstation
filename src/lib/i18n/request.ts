import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  type Locale,
  detectLocaleFromAcceptLanguage,
  getLocaleFromPathname,
  normalizeLocale,
} from './config';
import { getConfiguredDefaultLocale } from './content';

export function getRequestLocale(request: NextRequest): Locale {
  const headerLocale = normalizeLocale(
    request.headers.get('X-NEXT-INTL-LOCALE') || request.headers.get('x-nav-locale'),
  );
  if (headerLocale) return headerLocale;

  const pathnameLocale = getLocaleFromPathname(request.nextUrl.pathname);
  if (pathnameLocale) return pathnameLocale;

  const cookieLocale = normalizeLocale(request.cookies.get(LOCALE_COOKIE)?.value);
  if (cookieLocale) return cookieLocale;

  return detectLocaleFromAcceptLanguage(request.headers.get('accept-language'));
}

export async function getServerLocale(): Promise<Locale> {
  try {
    const locale = normalizeLocale(await getLocale());
    if (locale) return locale;
  } catch {}

  const headerStore = await headers();
  const headerLocale = normalizeLocale(
    headerStore.get('X-NEXT-INTL-LOCALE') || headerStore.get('x-nav-locale'),
  );
  if (headerLocale) return headerLocale;

  const cookieStore = await cookies();
  const cookieLocale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  if (cookieLocale) return cookieLocale;

  return getConfiguredDefaultLocale();
}
