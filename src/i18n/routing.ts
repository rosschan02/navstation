import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh-CN', 'ko', 'ja'],
  defaultLocale: 'en',
  localePrefix: 'always',
  localeCookie: {
    name: 'navstation_locale',
    sameSite: 'lax',
  },
});
