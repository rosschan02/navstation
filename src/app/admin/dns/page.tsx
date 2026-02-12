import pool from '@/db';
import type { DnsChangeLog, DnsRecord, DnsZone } from '@/types';
import { DnsClient } from './DnsClient';

export const dynamic = 'force-dynamic';

export default async function DnsPage() {
  let zones: DnsZone[] = [];
  let records: DnsRecord[] = [];
  let logs: DnsChangeLog[] = [];

  try {
    const [zonesResult, recordsResult, logsResult] = await Promise.all([
      pool.query<DnsZone>(
        `SELECT
           id, name, server, port, tsig_key_name, tsig_algorithm,
           ''::text AS tsig_secret, description, is_active, created_at, updated_at
         FROM dns_zones
         ORDER BY is_active DESC, id ASC`
      ),
      pool.query<DnsRecord>(
        `SELECT r.*, z.name AS zone_name
         FROM dns_records r
         INNER JOIN dns_zones z ON r.zone_id = z.id
         ORDER BY z.name ASC, r.name ASC, r.type ASC, r.id ASC`
      ),
      pool.query<DnsChangeLog>(
        `SELECT
           l.*,
           z.name AS zone_name,
           r.name AS record_name,
           r.type AS record_type
         FROM dns_change_logs l
         LEFT JOIN dns_zones z ON z.id = l.zone_id
         LEFT JOIN dns_records r ON r.id = l.record_id
         ORDER BY l.created_at DESC
         LIMIT 100`
      ),
    ]);

    zones = zonesResult.rows;
    records = recordsResult.rows;
    logs = logsResult.rows;
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code !== '42P01') {
      console.error('Failed to load DNS admin data:', error);
    }
  }

  return <DnsClient initialZones={zones} initialRecords={records} initialLogs={logs} />;
}
