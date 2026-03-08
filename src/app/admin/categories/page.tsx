import { CategoriesClient } from './CategoriesClient';
import { getLocalizedCategories } from '@/lib/i18n/content';
import { getServerLocale } from '@/lib/i18n/request';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const locale = await getServerLocale();
  const categories = await getLocalizedCategories(locale, true);

  return <CategoriesClient initialCategories={categories} />;
}
