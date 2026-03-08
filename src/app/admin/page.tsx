import { AdminClient } from './AdminClient';
import { getLocalizedCategories, getLocalizedSites } from '@/lib/i18n/content';
import { getServerLocale } from '@/lib/i18n/request';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const locale = await getServerLocale();
  const [sites, categories] = await Promise.all([
    getLocalizedSites(locale, true, true),
    getLocalizedCategories(locale, true),
  ]);

  return (
    <AdminClient
      initialSites={sites}
      categories={categories}
    />
  );
}
