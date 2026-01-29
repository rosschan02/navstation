import pool from '@/db';
import { AdminClient } from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [sitesResult, categoriesResult] = await Promise.all([
    pool.query(`
      SELECT s.*,
             c.name as category_name,
             c.label as category_label,
             c.type as category_type,
             c.css_class as category_class
      FROM sites s
      LEFT JOIN categories c ON s.category_id = c.id
      ORDER BY c.sort_order ASC, s.sort_order ASC, s.created_at DESC
    `),
    pool.query(`
      SELECT * FROM categories
      ORDER BY sort_order ASC, id ASC
    `),
  ]);

  return (
    <AdminClient
      initialSites={sitesResult.rows}
      categories={categoriesResult.rows}
    />
  );
}
