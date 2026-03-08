import { SoftwareAdminClient } from './SoftwareAdminClient';
import { getLocalizedCategories, getLocalizedSoftware } from '@/lib/i18n/content';
import { getServerLocale } from '@/lib/i18n/request';

export const dynamic = 'force-dynamic';

export default async function SoftwareAdminPage() {
  const locale = await getServerLocale();
  const [software, categories] = await Promise.all([
    getLocalizedSoftware(locale, true),
    getLocalizedCategories(locale, true),
  ]);

  return <SoftwareAdminClient initialSoftware={software} categories={categories.filter((category) => category.type === 'software')} />;
}
