import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { authenticate, createAuthErrorResponse, hasPermission } from '@/lib/apiAuth';
import { syncForwardZones } from '@/lib/dns/bind9-forward';
import { mapOperator, normalizeZoneName } from '@/app/api/dns/shared';
import type { DnsForwardZone } from '@/types';

const IP_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;
const DOMAIN_PATTERN = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)(?:\.(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?))+\.?$/;

function parseForwarders(input: unknown): string | null {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) return null;

  const ips = raw
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (ips.length === 0) return null;

  for (const ip of ips) {
    if (!IP_PATTERN.test(ip)) return null;
  }

  return ips.join(',');
}

async function writeChangeLog(input: {
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
       VALUES (NULL, NULL, $1, $2, $3::jsonb, $4, $5, $6)`,
      [input.action, input.status, JSON.stringify(input.payload), input.message, input.operatorType, input.operatorName]
    );
  } catch (error) {
    console.error('Failed to write forward zone change log:', error);
  }
}

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/dns/forward-zones/[id]
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.authenticated) {
    return createAuthErrorResponse(auth);
  }
  if (!hasPermission(auth, 'write')) {
    return NextResponse.json({ error: '权限不足，需要写入权限', code: 'PERMISSION_DENIED' }, { status: 403 });
  }

  const { id } = await context.params;
  const zoneId = Number.parseInt(id, 10);
  if (!Number.isFinite(zoneId)) {
    return NextResponse.json({ error: '无效的 ID' }, { status: 400 });
  }

  const operator = mapOperator(auth);

  try {
    const existing = await pool.query<DnsForwardZone>('SELECT * FROM dns_forward_zones WHERE id = $1', [zoneId]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: '转发区域不存在' }, { status: 404 });
    }

    const body = await request.json();
    const before = existing.rows[0];

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      const name = normalizeZoneName(body.name);
      if (!name || !DOMAIN_PATTERN.test(name)) {
        return NextResponse.json({ error: '域名格式无效' }, { status: 400 });
      }
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (body.forwarders !== undefined) {
      const forwarders = parseForwarders(body.forwarders);
      if (!forwarders) {
        return NextResponse.json({ error: '转发 DNS 地址无效' }, { status: 400 });
      }
      updates.push(`forwarders = $${paramIndex++}`);
      values.push(forwarders);
    }

    if (body.forward_policy !== undefined) {
      const policy = body.forward_policy === 'first' ? 'first' : 'only';
      updates.push(`forward_policy = $${paramIndex++}`);
      values.push(policy);
    }

    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(typeof body.description === 'string' ? body.description.trim() : '');
    }

    if (body.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(!!body.is_active);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(zoneId);

    const { rows } = await pool.query<DnsForwardZone>(
      `UPDATE dns_forward_zones SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    const zone = rows[0];

    // Auto-sync to BIND9
    const syncResult = await syncForwardZones();

    await writeChangeLog({
      action: 'update',
      status: syncResult.success ? 'success' : 'failed',
      payload: { forward_zone_id: zone.id, before: { name: before.name, forwarders: before.forwarders, forward_policy: before.forward_policy, is_active: before.is_active }, after: body },
      message: `更新转发区域 ${zone.name}: ${syncResult.message}`,
      operatorType: operator.operatorType,
      operatorName: operator.operatorName,
    });

    // Re-read to get updated sync status
    const updated = await pool.query<DnsForwardZone>('SELECT * FROM dns_forward_zones WHERE id = $1', [zone.id]);

    return NextResponse.json(updated.rows[0] || zone);
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      return NextResponse.json({ error: '该域名已存在' }, { status: 409 });
    }
    console.error('Failed to update forward zone:', error);
    return NextResponse.json({ error: '更新转发区域失败' }, { status: 500 });
  }
}

// DELETE /api/dns/forward-zones/[id]
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.authenticated) {
    return createAuthErrorResponse(auth);
  }
  if (!hasPermission(auth, 'write')) {
    return NextResponse.json({ error: '权限不足，需要写入权限', code: 'PERMISSION_DENIED' }, { status: 403 });
  }

  const { id } = await context.params;
  const zoneId = Number.parseInt(id, 10);
  if (!Number.isFinite(zoneId)) {
    return NextResponse.json({ error: '无效的 ID' }, { status: 400 });
  }

  const operator = mapOperator(auth);

  try {
    const existing = await pool.query<DnsForwardZone>('SELECT * FROM dns_forward_zones WHERE id = $1', [zoneId]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: '转发区域不存在' }, { status: 404 });
    }

    const zone = existing.rows[0];

    await pool.query('DELETE FROM dns_forward_zones WHERE id = $1', [zoneId]);

    // Auto-sync to BIND9 (regenerate config without the deleted zone)
    const syncResult = await syncForwardZones();

    await writeChangeLog({
      action: 'delete',
      status: syncResult.success ? 'success' : 'failed',
      payload: { forward_zone_id: zone.id, name: zone.name, forwarders: zone.forwarders },
      message: `删除转发区域 ${zone.name}: ${syncResult.message}`,
      operatorType: operator.operatorType,
      operatorName: operator.operatorName,
    });

    return NextResponse.json({ success: true, name: zone.name, sync: syncResult.message });
  } catch (error) {
    console.error('Failed to delete forward zone:', error);
    return NextResponse.json({ error: '删除转发区域失败' }, { status: 500 });
  }
}
