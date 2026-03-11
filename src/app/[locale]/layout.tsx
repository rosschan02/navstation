import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { AppShell } from '@/components/AppShell';
import { type Locale, isSupportedLocale } from '@/lib/i18n/config';
import { getLocalizedSettings } from '@/lib/i18n/content';

export const dynamic = 'force-dynamic';

async function resolveSettings(locale: Locale) {
  try {
    return await getLocalizedSettings(locale);
  } catch {
    return {
      site_name: 'NavStation',
      site_description: 'Navigation portal',
      site_version: '',
      footer_text: '',
      logo_url: '',
      site_icon_url: '',
      default_locale: 'en',
      translations: {},
    };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    return {};
  }

  const settings = await resolveSettings(locale);
  return {
    title: `${settings.site_name} - NavStation`,
    description: settings.site_description,
    icons: {
      icon: settings.site_icon_url || '/favicon.ico',
      shortcut: settings.site_icon_url || '/favicon.ico',
      apple: settings.site_icon_url || '/favicon.ico',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AppShell>{children}</AppShell>
    </NextIntlClientProvider>
  );
}
