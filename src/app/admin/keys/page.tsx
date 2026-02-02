import pool from '@/db';
import type { ApiKey } from '@/types';
import { KeysClient } from './KeysClient';

export const dynamic = 'force-dynamic';

export default async function KeysPage() {
  let keys: ApiKey[] = [];

  try {
    const { rows } = await pool.query<ApiKey>(
      `SELECT id, name, key_prefix, permissions, description, is_active, last_used_at, created_at
       FROM api_keys
       ORDER BY created_at DESC`
    );
    keys = rows;
  } catch {
    // Table might not exist yet, return empty array
  }

  return <KeysClient initialKeys={keys} />;
}
