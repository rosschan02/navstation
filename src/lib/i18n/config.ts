export const SUPPORTED_LOCALES = ['en', 'zh-CN', 'ko', 'ja'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'navstation_locale';

const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

export function isSupportedLocale(value: string): value is Locale {
  return SUPPORTED_LOCALE_SET.has(value);
}

export function normalizeLocale(value?: string | null): Locale | null {
  if (!value) return null;
  if (isSupportedLocale(value)) return value;

  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith('zh')) return 'zh-CN';
  if (normalized.startsWith('ko')) return 'ko';
  if (normalized.startsWith('ja')) return 'ja';
  if (normalized.startsWith('en')) return 'en';
  return null;
}

export function resolvePreferredLocale(input: readonly string[]): Locale {
  for (const entry of input) {
    const normalized = normalizeLocale(entry);
    if (normalized) return normalized;
  }
  return DEFAULT_LOCALE;
}

export function detectLocaleFromAcceptLanguage(headerValue?: string | null): Locale {
  if (!headerValue) return DEFAULT_LOCALE;

  const ranked = headerValue
    .split(',')
    .map((part) => {
      const [tag, qPart] = part.trim().split(';');
      const q = qPart?.startsWith('q=') ? Number(qPart.slice(2)) : 1;
      return { tag, q: Number.isFinite(q) ? q : 1 };
    })
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag);

  return resolvePreferredLocale(ranked);
}

export function getLocaleFromPathname(pathname: string): Locale | null {
  const [, maybeLocale] = pathname.split('/');
  return normalizeLocale(maybeLocale);
}

export function stripLocaleFromPathname(pathname: string): string {
  const locale = getLocaleFromPathname(pathname);
  if (!locale) return pathname || '/';
  const stripped = pathname.slice(`/${locale}`.length);
  return stripped || '/';
}

export function buildLocalePath(locale: Locale, pathname = '/', search = ''): string {
  const normalizedPath = pathname === '/' ? '' : pathname;
  return `/${locale}${normalizedPath}${search}`;
}

export function withLocale(locale: Locale, href: string): string {
  if (!href.startsWith('/')) return href;
  const localeFromHref = getLocaleFromPathname(href);
  if (localeFromHref) {
    const stripped = stripLocaleFromPathname(href);
    return buildLocalePath(locale, stripped);
  }
  return buildLocalePath(locale, href);
}

export function getLocaleDisplayName(locale: Locale): string {
  if (locale === 'zh-CN') return '简体中文';
  if (locale === 'ko') return '한국어';
  if (locale === 'ja') return '日本語';
  return 'English';
}
