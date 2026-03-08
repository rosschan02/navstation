import { SettingsClient } from './SettingsClient';
import { getLocalizedSettings } from '@/lib/i18n/content';
import { getServerLocale } from '@/lib/i18n/request';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const locale = await getServerLocale();
  const settings = await getLocalizedSettings(locale);

  return <SettingsClient initialSettings={settings} />;
}
