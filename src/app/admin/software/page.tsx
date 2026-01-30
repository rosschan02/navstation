import pool from '@/db';
import { SoftwareAdminClient } from './SoftwareAdminClient';
import type { SoftwareItem, Category } from '@/types';

export const dynamic = 'force-dynamic';

export default async function SoftwareAdminPage() {
  const { rows: software } = await pool.query<SoftwareItem>(
    'SELECT * FROM software ORDER BY sort_order ASC, created_at DESC'
  );

  const { rows: categories } = await pool.query<Category>(
    "SELECT * FROM categories WHERE type = 'software' ORDER BY sort_order ASC"
  );

  return <SoftwareAdminClient initialSoftware={software} categories={categories} />;
}
