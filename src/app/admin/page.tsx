import pool from '@/db';
import { AdminClient } from './AdminClient';

export default async function AdminPage() {
  const { rows: sites } = await pool.query(`
    SELECT s.*, c.name as category_name, c.label as category_label, c.css_class as category_class
    FROM sites s
    LEFT JOIN categories c ON s.category_id = c.id
    ORDER BY s.created_at DESC
  `);

  return <AdminClient initialSites={sites} />;
}
