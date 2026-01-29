import pool from '@/db';
import type { Category } from '@/types';
import { CategoriesClient } from './CategoriesClient';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const { rows: categories } = await pool.query<Category>(
    'SELECT * FROM categories ORDER BY id ASC'
  );

  return <CategoriesClient initialCategories={categories} />;
}
