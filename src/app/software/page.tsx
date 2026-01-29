import pool from '@/db';
import { SoftwareClient } from './SoftwareClient';
import type { SoftwareItem } from '@/types';

export const dynamic = 'force-dynamic';

export default async function SoftwarePage() {
  const { rows: software } = await pool.query<SoftwareItem>(
    'SELECT * FROM software ORDER BY sort_order ASC, created_at DESC'
  );

  return <SoftwareClient items={software} />;
}
