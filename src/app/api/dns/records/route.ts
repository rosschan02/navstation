import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { authenticate, createAuthErrorResponse, hasPermission } from '@/lib/apiAuth';
import { bind9AddRecord } from '@/lib/dns/bind9';
import {
  mapOperator,
  normalizeRecordName,
  parseBoolean,
  parsePriority,
  parseTTL,
  toBindRecordData,
  toBindZoneConfig,
  validateRecordInput,
} from '@/app/api/dns/shared';
import type { DnsRecord, DnsRecordType, DnsZone } from '@/types';

export const dynamic = 'force-dynamic';

async function writeChangeLog(input: {
  zoneId: number;
  recordId: number | null;
  action: 'create' | 'update' | 'delete' | 'sync';
  status: 'success' | 'failed' | 'skipped';
  payload: Record<string, unknown>;
  message: string;
  operatorType: string;
  operatorName: string;
}) {
  try {
    await pool.query(
      `INSERT INTO dns_change_logs
       (zone_id, record_id, action, status, request_payload, response_message, operator_type, operator_name)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
      [
        input.zoneId,
        input.recordId,
        input.action,
        input.status,
        JSON.stringify(input.payload || {}),
        input.message,
        input.operatorType,
        input.operatorName,
      ]
    );
  } catch (error) {
    console.error('Failed to write DNS change log:', error);
  }
}

// GET /api/dns/records
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.authenticated) {
    return createAuthErrorResponse(auth);
  }
  if (!hasPermission(auth, 'read')) {
    return NextResponse.json({ error: '权限不足', code: 'PERMISSION_DENIED' }, { status: 403 });
  }

  const zoneIdParam = request.nextUrl.searchParams.get('zone_id');
  const includeInactive = request.nextUrl.searchParams.get('include_inactive') === '1';

  try {
    const conditions: string[] = [];
    const params: Array<number | string> = [];

    if (zoneIdParam) {
      const zoneId = Number.parseInt(zoneIdParam, 10);
      if (!Number.isFinite(zoneId)) {
        return NextResponse.json({ error: '无效的 zone_id' }, { status: 400 });
      }
      params.push(zoneId);
      conditions.push(`r.zone_id = $${params.length}`);
    }

    if (!includeInactive) {
      conditions.push(`r.status = 'active'`);
    }

    let sql = `SELECT r.*, z.name AS zone_name
               FROM dns_records r
               INNER JOIN dns_zones z ON r.zone_id = z.id`;
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY z.name ASC, r.name ASC, r.type ASC, r.id ASC';

    const { rows } = await pool.query<DnsRecord>(sql, params);
    return NextResponse.json(rows);
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === '42P01') {
      return NextResponse.json([]);
    }
    console.error('Failed to get dns records:', error);
    return NextResponse.json({ error: '获取 DNS 记录失败' }, { status: 500 });
  }
}

// POST /api/dns/records
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.authenticated) {
    return createAuthErrorResponse(auth);
  }
  if (!hasPermission(auth, 'write')) {
    return NextResponse.json({ error: '权限不足，需要写入权限', code: 'PERMISSION_DENIED' }, { status: 403 });
  }

  const operator = mapOperator(auth);

  try {
    const body = await request.json();

    const zoneId = Number.parseInt(String(body.zone_id || ''), 10);
    const name = normalizeRecordName(body.name);
    const type = String(body.type || '').trim().toUpperCase() as DnsRecordType;
    const ttl = parseTTL(body.ttl);
    const value = String(body.value || '').trim();
    const priority = parsePriority(body.priority);
    const status = body.status === 'inactive' ? 'inactive' : 'active';
    const syncNow = parseBoolean(body.sync_now, true);

    if (!Number.isFinite(zoneId)) {
      return NextResponse.json({ error: 'zone_id 无效' }, { status: 400 });
    }

    const validationError = validateRecordInput({ name, type, ttl, value, priority, status });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const zoneResult = await pool.query<DnsZone>('SELECT * FROM dns_zones WHERE id = $1', [zoneId]);
    if (zoneResult.rows.length === 0) {
      return NextResponse.json({ error: 'Zone 不存在' }, { status: 404 });
    }
    const zone = zoneResult.rows[0];

    const insertResult = await pool.query<DnsRecord>(
      `INSERT INTO dns_records
       (zone_id, name, type, ttl, value, priority, status, last_sync_status, last_sync_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', '')
       RETURNING *`,
      [zoneId, name, type, ttl, value, priority, status]
    );

    const record = insertResult.rows[0];

    let syncStatus: DnsRecord['last_sync_status'] = 'skipped';
    let syncMessage = '未执行同步';
    let syncDetails: Record<string, unknown> = { success: false, skipped: true };

    if (status !== 'active') {
      syncStatus = 'skipped';
      syncMessage = '记录为 inactive，跳过同步';
    } else if (!zone.is_active) {
      syncStatus = 'skipped';
      syncMessage = 'Zone 已停用，跳过同步';
    } else if (!syncNow) {
      syncStatus = 'skipped';
      syncMessage = 'sync_now=false，跳过同步';
    } else {
      const result = await bind9AddRecord(toBindZoneConfig(zone), toBindRecordData(record));
      syncStatus = result.success ? 'success' : 'failed';
      syncMessage = result.success ? '同步成功' : (result.stderr || '同步失败');
      syncDetails = {
        success: result.success,
        skipped: result.skipped,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    }

    const updateResult = await pool.query<DnsRecord>(
      `UPDATE dns_records SET
         last_sync_status = $1::varchar,
         last_sync_message = $2,
         last_synced_at = CASE WHEN $1::varchar IN ('success', 'failed') THEN NOW() ELSE last_synced_at END,
         updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [syncStatus, syncMessage, record.id]
    );

    await writeChangeLog({
      zoneId: zone.id,
      recordId: record.id,
      action: 'create',
      status: syncStatus === 'failed' ? 'failed' : (syncStatus === 'success' ? 'success' : 'skipped'),
      payload: {
        zone_id: zoneId,
        name,
        type,
        ttl,
        value,
        priority,
        status,
        sync_now: syncNow,
      },
      message: syncMessage,
      operatorType: operator.operatorType,
      operatorName: operator.operatorName,
    });

    return NextResponse.json(
      {
        record: updateResult.rows[0],
        sync: syncDetails,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create dns record:', error);
    return NextResponse.json({ error: '创建 DNS 记录失败' }, { status: 500 });
  }
}
