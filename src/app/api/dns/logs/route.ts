import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { authenticate, createAuthErrorResponse, hasPermission } from '@/lib/apiAuth';
import type { DnsChangeLog } from '@/types';

export const dynamic = 'force-dynamic';

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value || '100', 10);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(500, Math.max(1, parsed));
}

// GET /api/dns/logs
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.authenticated) {
    return createAuthErrorResponse(auth);
  }
  if (!hasPermission(auth, 'read')) {
    return NextResponse.json({ error: '权限不足', code: 'PERMISSION_DENIED' }, { status: 403 });
  }

  const zoneIdParam = request.nextUrl.searchParams.get('zone_id');
  const recordIdParam = request.nextUrl.searchParams.get('record_id');
  const limit = parseLimit(request.nextUrl.searchParams.get('limit'));

  try {
    const conditions: string[] = [];
    const params: Array<number | string> = [];

    if (zoneIdParam) {
      const zoneId = Number.parseInt(zoneIdParam, 10);
      if (!Number.isFinite(zoneId)) {
        return NextResponse.json({ error: '无效的 zone_id' }, { status: 400 });
      }
      params.push(zoneId);
      conditions.push(`l.zone_id = $${params.length}`);
    }

    if (recordIdParam) {
      const recordId = Number.parseInt(recordIdParam, 10);
      if (!Number.isFinite(recordId)) {
        return NextResponse.json({ error: '无效的 record_id' }, { status: 400 });
      }
      params.push(recordId);
      conditions.push(`l.record_id = $${params.length}`);
    }

    let sql = `SELECT
                 l.*,
                 z.name AS zone_name,
                 r.name AS record_name,
                 r.type AS record_type
               FROM dns_change_logs l
               LEFT JOIN dns_zones z ON z.id = l.zone_id
               LEFT JOIN dns_records r ON r.id = l.record_id`;

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    params.push(limit);
    sql += ` ORDER BY l.created_at DESC LIMIT $${params.length}`;

    const { rows } = await pool.query<DnsChangeLog>(sql, params);
    return NextResponse.json(rows);
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === '42P01') {
      return NextResponse.json([]);
    }
    console.error('Failed to get dns change logs:', error);
    return NextResponse.json({ error: '获取 DNS 变更日志失败' }, { status: 500 });
  }
}
