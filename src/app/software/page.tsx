import { SoftwareClient } from './SoftwareClient';
import { getLocalizedCategories, getLocalizedSoftware } from '@/lib/i18n/content';
import { getServerLocale } from '@/lib/i18n/request';

export const dynamic = 'force-dynamic';

export default async function SoftwarePage() {
  const locale = await getServerLocale();
  const [software, categories] = await Promise.all([
    getLocalizedSoftware(locale),
    getLocalizedCategories(locale),
  ]);

  return <SoftwareClient items={software} categories={categories.filter((category) => category.type === 'software')} />;
}
