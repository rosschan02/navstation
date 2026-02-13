import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { authenticate, createAuthErrorResponse, hasPermission } from '@/lib/apiAuth';
import { syncForwardZones } from '@/lib/dns/bind9-forward';
import { mapOperator, normalizeZoneName } from '@/app/api/dns/shared';
import type { DnsForwardZone } from '@/types';

export const dynamic = 'force-dynamic';

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

// GET /api/dns/forward-zones
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.authenticated) {
    return createAuthErrorResponse(auth);
  }
  if (!hasPermission(auth, 'read')) {
    return NextResponse.json({ error: '权限不足', code: 'PERMISSION_DENIED' }, { status: 403 });
  }

  try {
    const { rows } = await pool.query<DnsForwardZone>(
      `SELECT * FROM dns_forward_zones ORDER BY is_active DESC, name ASC`
    );
    return NextResponse.json(rows);
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === '42P01') {
      return NextResponse.json([]);
    }
    console.error('Failed to get forward zones:', error);
    return NextResponse.json({ error: '获取转发区域失败' }, { status: 500 });
  }
}

// POST /api/dns/forward-zones
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

    const name = normalizeZoneName(body.name);
    if (!name || !DOMAIN_PATTERN.test(name)) {
      return NextResponse.json({ error: '域名格式无效（示例：yibao.example.com）' }, { status: 400 });
    }

    const forwarders = parseForwarders(body.forwarders);
    if (!forwarders) {
      return NextResponse.json({ error: '转发 DNS 地址无效，请输入合法 IP 地址（逗号或换行分隔）' }, { status: 400 });
    }

    const forwardPolicy = body.forward_policy === 'first' ? 'first' : 'only';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const isActive = body.is_active !== false;

    const { rows } = await pool.query<DnsForwardZone>(
      `INSERT INTO dns_forward_zones (name, forwarders, forward_policy, description, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, forwarders, forwardPolicy, description, isActive]
    );

    const zone = rows[0];

    // Auto-sync to BIND9
    const syncResult = await syncForwardZones();

    await writeChangeLog({
      action: 'create',
      status: syncResult.success ? 'success' : 'failed',
      payload: { forward_zone_id: zone.id, name, forwarders, forward_policy: forwardPolicy, description },
      message: `创建转发区域 ${name}: ${syncResult.message}`,
      operatorType: operator.operatorType,
      operatorName: operator.operatorName,
    });

    // Re-read the zone to get updated sync status
    const updated = await pool.query<DnsForwardZone>('SELECT * FROM dns_forward_zones WHERE id = $1', [zone.id]);

    return NextResponse.json(updated.rows[0] || zone, { status: 201 });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      return NextResponse.json({ error: '该域名已存在' }, { status: 409 });
    }
    console.error('Failed to create forward zone:', error);
    return NextResponse.json({ error: '创建转发区域失败' }, { status: 500 });
  }
}
