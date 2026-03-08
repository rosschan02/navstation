import { Suspense } from 'react';
import { HomeClient } from './HomeClient';
import { getClientIpFromServerHeaders } from '@/lib/clientIp';
import { getWeatherDefaults } from '@/lib/weatherDefaults';
import { getLocalizedCategories, getLocalizedSettings, getLocalizedSites } from '@/lib/i18n/content';
import { getServerLocale } from '@/lib/i18n/request';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const locale = await getServerLocale();
  const [categories, sites, settings] = await Promise.all([
    getLocalizedCategories(locale),
    getLocalizedSites(locale),
    getLocalizedSettings(locale),
  ]);

  const filteredCategories = categories.filter((category) => category.type === 'site' || category.type === 'qrcode');
  const filteredSites = sites.filter((site) => site.category_type === 'site' || site.category_type === 'qrcode');
  const clientIP = await getClientIpFromServerHeaders();
  const weatherDefaults = getWeatherDefaults();

  return (
    <Suspense fallback={<div className="flex-1 bg-background-light" />}>
      <HomeClient
        categories={filteredCategories}
        sites={filteredSites}
        footerText={settings.footer_text}
        clientIP={clientIP}
        defaultWeatherDistrictId={weatherDefaults.defaultDistrictId}
        defaultWeatherLabel={weatherDefaults.defaultDistrictName}
      />
    </Suspense>
  );
}
