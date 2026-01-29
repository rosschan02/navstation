import { Suspense } from 'react';
import pool from '@/db';
import { HomeClient } from './HomeClient';
import type { Category, SiteData } from '@/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch categories (site type only, excluding software)
  const { rows: categories } = await pool.query<Category>(`
    SELECT * FROM categories
    WHERE type IN ('site', 'qrcode')
    ORDER BY sort_order ASC, id ASC
  `);

  // Fetch all active sites
  const { rows: sites } = await pool.query<SiteData>(`
    SELECT s.*,
           c.name as category_name,
           c.label as category_label,
           c.type as category_type
    FROM sites s
    LEFT JOIN categories c ON s.category_id = c.id
    WHERE s.status = 'active' AND c.type IN ('site', 'qrcode')
    ORDER BY c.sort_order ASC, s.sort_order ASC, s.created_at DESC
  `);

  return (
    <Suspense fallback={<div className="flex-1 bg-background-light" />}>
      <HomeClient categories={categories} sites={sites} />
    </Suspense>
  );
}
