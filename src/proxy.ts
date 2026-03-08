import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  buildLocalePath,
  detectLocaleFromAcceptLanguage,
  getLocaleFromPathname,
  normalizeLocale,
  type Locale,
} from '@/lib/i18n/config';

let cachedDefaultLocale: { value: Locale; expiresAt: number } = {
  value: DEFAULT_LOCALE,
  expiresAt: 0,
};

const INTERNAL_PROXY_ORIGIN = process.env.NAVSTATION_INTERNAL_ORIGIN || 'http://127.0.0.1:3000';

async function getProxyDefaultLocale(request: NextRequest): Promise<Locale> {
  if (Date.now() < cachedDefaultLocale.expiresAt) {
    return cachedDefaultLocale.value;
  }

  try {
    const response = await fetch(`${INTERNAL_PROXY_ORIGIN}/api/settings/default-locale`, {
      headers: { 'x-nav-proxy-prefetch': '1' },
      cache: 'no-store',
    });
    if (response.ok) {
      const data = await response.json() as { default_locale?: string };
      const locale = normalizeLocale(data.default_locale) || DEFAULT_LOCALE;
      cachedDefaultLocale = {
        value: locale,
        expiresAt: Date.now() + 60_000,
      };
      return locale;
    }
  } catch {}

  return DEFAULT_LOCALE;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  const isProxyPrefetch = request.headers.get('x-nav-proxy-prefetch') === '1';
  const isStaticAsset = /\.[a-z0-9]+$/i.test(pathname);
  const shouldSkip =
    isProxyPrefetch
    || pathname.startsWith('/api')
    || pathname.startsWith('/_next')
    || pathname.startsWith('/uploads')
    || pathname.startsWith('/public')
    || pathname.startsWith('/fonts')
    || pathname === '/favicon.ico'
    || isStaticAsset;

  if (shouldSkip) {
    return NextResponse.next();
  }

  const localeFromPath = getLocaleFromPathname(pathname);
  const cookieLocale = normalizeLocale(request.cookies.get(LOCALE_COOKIE)?.value);
  const configuredDefaultLocale = await getProxyDefaultLocale(request);
  const preferredLocale = localeFromPath
    || cookieLocale
    || detectLocaleFromAcceptLanguage(request.headers.get('accept-language'))
    || configuredDefaultLocale;

  if (localeFromPath) {
    const headers = new Headers(request.headers);
    headers.set('x-nav-locale', localeFromPath);
    const response = NextResponse.next({
      request: {
        headers,
      },
    });
    response.cookies.set(LOCALE_COOKIE, localeFromPath, { path: '/', sameSite: 'lax' });
    return response;
  }

  // 检测 IE 8/9/10/11
  const isIE = /MSIE [89]\.0|MSIE 10\.0|Trident\/7\.0/.test(userAgent);

  if (isIE && pathname === '/') {
    return NextResponse.redirect(new URL('/legacy', request.url));
  }

  if (pathname === '/' || pathname === '') {
    return NextResponse.redirect(new URL(buildLocalePath(preferredLocale, '/', search), request.url));
  }

  if (!pathname.startsWith('/legacy')) {
    return NextResponse.redirect(new URL(buildLocalePath(preferredLocale, pathname, search), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
