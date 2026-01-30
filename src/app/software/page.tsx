import pool from '@/db';
import { SoftwareClient } from './SoftwareClient';
import type { SoftwareItem, Category } from '@/types';

export const dynamic = 'force-dynamic';

export default async function SoftwarePage() {
  const { rows: software } = await pool.query<SoftwareItem>(
    'SELECT * FROM software ORDER BY sort_order ASC, created_at DESC'
  );

  const { rows: categories } = await pool.query<Category>(
    "SELECT * FROM categories WHERE type = 'software' ORDER BY sort_order ASC"
  );

  return <SoftwareClient items={software} categories={categories} />;
}
