import pool from '@/db';
import { SoftwareAdminClient } from './SoftwareAdminClient';
import type { SoftwareItem } from '@/types';

export const dynamic = 'force-dynamic';

export default async function SoftwareAdminPage() {
  const { rows: software } = await pool.query<SoftwareItem>(
    'SELECT * FROM software ORDER BY created_at DESC'
  );

  return <SoftwareAdminClient initialSoftware={software} />;
}
