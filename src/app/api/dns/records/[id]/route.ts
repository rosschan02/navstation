import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { authenticate, createAuthErrorResponse, hasPermission } from '@/lib/apiAuth';
import { bind9AddRecord, bind9DeleteRecord, bind9ReplaceRecord } from '@/lib/dns/bind9';
import {
  mapOperator,
  normalizeRecordName,
  parseBoolean,
  parsePriority,
  parseTTL,
  validateRecordInput,
} from '@/app/api/dns/shared';
import type { Bind9ZoneConfig } from '@/lib/dns/bind9';
import type { DnsRecord, DnsRecordType } from '@/types';

export const dynamic = 'force-dynamic';

interface RecordWithZone extends DnsRecord {
  zone_server: string;
  zone_port: number;
  zone_tsig_key_name: string;
  zone_tsig_algorithm: string;
  zone_tsig_secret: string;
  zone_active: boolean;
}

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

async function loadRecordWithZone(recordId: number): Promise<RecordWithZone | null> {
  const result = await pool.query<RecordWithZone>(
    `SELECT
       r.*,
       z.name AS zone_name,
       z.server AS zone_server,
       z.port AS zone_port,
       z.tsig_key_name AS zone_tsig_key_name,
       z.tsig_algorithm AS zone_tsig_algorithm,
       z.tsig_secret AS zone_tsig_secret,
       z.is_active AS zone_active
     FROM dns_records r
     INNER JOIN dns_zones z ON z.id = r.zone_id
     WHERE r.id = $1`,
    [recordId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

function toZoneConfig(record: RecordWithZone): Bind9ZoneConfig {
  return {
    name: record.zone_name || '',
    server: record.zone_server,
    port: record.zone_port,
    tsig_key_name: record.zone_tsig_key_name,
    tsig_algorithm: record.zone_tsig_algorithm,
    tsig_secret: record.zone_tsig_secret,
  };
}

function toRecordData(record: Pick<DnsRecord, 'name' | 'type' | 'ttl' | 'value' | 'priority'>) {
  return {
    name: record.name,
    type: record.type,
    ttl: record.ttl,
    value: record.value,
    priority: record.priority,
  };
}

// GET /api/dns/records/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth.authenticated) {
    return createAuthErrorResponse(auth);
  }
  if (!hasPermission(auth, 'read')) {
    return NextResponse.json({ error: '权限不足', code: 'PERMISSION_DENIED' }, { status: 403 });
  }

  const { id } = await params;
  const recordId = Number.parseInt(id, 10);
  if (!Number.isFinite(recordId)) {
    return NextResponse.json({ error: '无效的记录 ID' }, { status: 400 });
  }

  try {
    const record = await loadRecordWithZone(recordId);
    if (!record) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }
    return NextResponse.json(record);
  } catch (error) {
    console.error('Failed to get dns record:', error);
    return NextResponse.json({ error: '获取 DNS 记录失败' }, { status: 500 });
  }
}

// PUT /api/dns/records/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth.authenticated) {
    return createAuthErrorResponse(auth);
  }
  if (!hasPermission(auth, 'write')) {
    return NextResponse.json({ error: '权限不足，需要写入权限', code: 'PERMISSION_DENIED' }, { status: 403 });
  }

  const operator = mapOperator(auth);

  const { id } = await params;
  const recordId = Number.parseInt(id, 10);
  if (!Number.isFinite(recordId)) {
    return NextResponse.json({ error: '无效的记录 ID' }, { status: 400 });
  }

  try {
    const existing = await loadRecordWithZone(recordId);
    if (!existing) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    const body = await request.json();
    const syncNow = parseBoolean(body.sync_now, true);

    const nextName = body.name === undefined ? existing.name : normalizeRecordName(body.name);
    const nextType = body.type === undefined ? existing.type : String(body.type).trim().toUpperCase() as DnsRecordType;
    const nextTTL = body.ttl === undefined ? existing.ttl : parseTTL(body.ttl);
    const nextValue = body.value === undefined ? existing.value : String(body.value || '').trim();
    const nextPriority = body.priority === undefined ? existing.priority : parsePriority(body.priority);
    const nextStatus = body.status === undefined ? existing.status : (body.status === 'inactive' ? 'inactive' : 'active');

    const validationError = validateRecordInput({
      name: nextName,
      type: nextType,
      ttl: nextTTL,
      value: nextValue,
      priority: nextPriority,
      status: nextStatus,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { rows } = await pool.query<DnsRecord>(
      `UPDATE dns_records SET
         name = $1,
         type = $2,
         ttl = $3,
         value = $4,
         priority = $5,
         status = $6,
         updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [nextName, nextType, nextTTL, nextValue, nextPriority, nextStatus, recordId]
    );

    const updatedRecord = rows[0];

    const zone = toZoneConfig(existing);

    let syncStatus: DnsRecord['last_sync_status'] = 'skipped';
    let syncMessage = '未执行同步';
    let syncPayload: Record<string, unknown> = { success: false, skipped: true };

    const bindBefore = toRecordData(existing);
    const bindAfter = toRecordData(updatedRecord);

    const recordChanged = (
      existing.name !== updatedRecord.name ||
      existing.type !== updatedRecord.type ||
      existing.ttl !== updatedRecord.ttl ||
      existing.value !== updatedRecord.value ||
      existing.priority !== updatedRecord.priority
    );

    if (!existing.zone_active) {
      syncStatus = 'skipped';
      syncMessage = 'Zone 已停用，跳过同步';
    } else if (!syncNow) {
      syncStatus = 'skipped';
      syncMessage = 'sync_now=false，跳过同步';
    } else if (existing.status === 'active' && updatedRecord.status === 'inactive') {
      const result = await bind9DeleteRecord(zone, bindBefore);
      syncStatus = result.success ? 'success' : 'failed';
      syncMessage = result.success ? '已从 BIND9 删除记录' : (result.stderr || '删除同步失败');
      syncPayload = { success: result.success, skipped: result.skipped, stdout: result.stdout, stderr: result.stderr };
    } else if (existing.status === 'inactive' && updatedRecord.status === 'active') {
      const result = await bind9AddRecord(zone, bindAfter);
      syncStatus = result.success ? 'success' : 'failed';
      syncMessage = result.success ? '已同步到 BIND9' : (result.stderr || '新增同步失败');
      syncPayload = { success: result.success, skipped: result.skipped, stdout: result.stdout, stderr: result.stderr };
    } else if (existing.status === 'active' && updatedRecord.status === 'active' && recordChanged) {
      const result = await bind9ReplaceRecord(zone, bindBefore, bindAfter);
      syncStatus = result.success ? 'success' : 'failed';
      syncMessage = result.success ? '已更新 BIND9 记录' : (result.stderr || '更新同步失败');
      syncPayload = { success: result.success, skipped: result.skipped, stdout: result.stdout, stderr: result.stderr };
    } else {
      syncStatus = 'skipped';
      syncMessage = '记录未影响 BIND9，同步已跳过';
    }

    const finalResult = await pool.query<DnsRecord>(
      `UPDATE dns_records SET
         last_sync_status = $1::varchar,
         last_sync_message = $2,
         last_synced_at = CASE WHEN $1::varchar IN ('success', 'failed') THEN NOW() ELSE last_synced_at END,
         updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [syncStatus, syncMessage, recordId]
    );

    await writeChangeLog({
      zoneId: existing.zone_id,
      recordId,
      action: 'update',
      status: syncStatus === 'failed' ? 'failed' : (syncStatus === 'success' ? 'success' : 'skipped'),
      payload: {
        before: {
          name: existing.name,
          type: existing.type,
          ttl: existing.ttl,
          value: existing.value,
          priority: existing.priority,
          status: existing.status,
        },
        after: {
          name: updatedRecord.name,
          type: updatedRecord.type,
          ttl: updatedRecord.ttl,
          value: updatedRecord.value,
          priority: updatedRecord.priority,
          status: updatedRecord.status,
        },
        sync_now: syncNow,
      },
      message: syncMessage,
      operatorType: operator.operatorType,
      operatorName: operator.operatorName,
    });

    return NextResponse.json({
      record: finalResult.rows[0],
      sync: syncPayload,
    });
  } catch (error) {
    console.error('Failed to update dns record:', error);
    return NextResponse.json({ error: '更新 DNS 记录失败' }, { status: 500 });
  }
}

// DELETE /api/dns/records/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth.authenticated) {
    return createAuthErrorResponse(auth);
  }
  if (!hasPermission(auth, 'write')) {
    return NextResponse.json({ error: '权限不足，需要写入权限', code: 'PERMISSION_DENIED' }, { status: 403 });
  }

  const operator = mapOperator(auth);

  const { id } = await params;
  const recordId = Number.parseInt(id, 10);
  if (!Number.isFinite(recordId)) {
    return NextResponse.json({ error: '无效的记录 ID' }, { status: 400 });
  }

  try {
    const existing = await loadRecordWithZone(recordId);
    if (!existing) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    let syncStatus: DnsRecord['last_sync_status'] = 'skipped';
    let syncMessage = '未执行同步';
    let syncPayload: Record<string, unknown> = { success: false, skipped: true };

    if (existing.status === 'active' && existing.zone_active) {
      const result = await bind9DeleteRecord(toZoneConfig(existing), toRecordData(existing));
      syncStatus = result.success ? 'success' : 'failed';
      syncMessage = result.success ? '已从 BIND9 删除记录' : (result.stderr || '删除同步失败');
      syncPayload = { success: result.success, skipped: result.skipped, stdout: result.stdout, stderr: result.stderr };

      if (!result.success) {
        await writeChangeLog({
          zoneId: existing.zone_id,
          recordId,
          action: 'delete',
          status: 'failed',
          payload: {
            name: existing.name,
            type: existing.type,
            ttl: existing.ttl,
            value: existing.value,
            priority: existing.priority,
          },
          message: syncMessage,
          operatorType: operator.operatorType,
          operatorName: operator.operatorName,
        });

        return NextResponse.json({ error: syncMessage, sync: syncPayload }, { status: 502 });
      }
    } else if (existing.status === 'active' && !existing.zone_active) {
      syncStatus = 'skipped';
      syncMessage = 'Zone 已停用，跳过 BIND9 删除';
    } else {
      syncStatus = 'skipped';
      syncMessage = '记录为 inactive，跳过 BIND9 删除';
    }

    await pool.query('DELETE FROM dns_records WHERE id = $1', [recordId]);

    await writeChangeLog({
      zoneId: existing.zone_id,
      recordId,
      action: 'delete',
      status: syncStatus === 'success' ? 'success' : 'skipped',
      payload: {
        name: existing.name,
        type: existing.type,
        ttl: existing.ttl,
        value: existing.value,
        priority: existing.priority,
      },
      message: syncMessage,
      operatorType: operator.operatorType,
      operatorName: operator.operatorName,
    });

    return NextResponse.json({ success: true, sync: syncPayload });
  } catch (error) {
    console.error('Failed to delete dns record:', error);
    return NextResponse.json({ error: '删除 DNS 记录失败' }, { status: 500 });
  }
}
