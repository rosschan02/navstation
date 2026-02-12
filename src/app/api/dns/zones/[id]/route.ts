import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { authenticate, createAuthErrorResponse, hasPermission } from '@/lib/apiAuth';
import { normalizeZoneName, parsePort, validateZoneInput } from '@/app/api/dns/shared';
import type { DnsZone } from '@/types';

export const dynamic = 'force-dynamic';

function sanitizeZone(zone: DnsZone): DnsZone {
  return {
    ...zone,
    tsig_secret: '',
  };
}

// PUT /api/dns/zones/:id
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

  const { id } = await params;
  const zoneId = Number.parseInt(id, 10);
  if (!Number.isFinite(zoneId)) {
    return NextResponse.json({ error: '无效的 Zone ID' }, { status: 400 });
  }

  try {
    const existingResult = await pool.query<DnsZone>('SELECT * FROM dns_zones WHERE id = $1', [zoneId]);
    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Zone 不存在' }, { status: 404 });
    }

    const body = await request.json();
    const existing = existingResult.rows[0];

    const name = body.name === undefined ? existing.name : normalizeZoneName(body.name);
    const server = body.server === undefined ? existing.server : String(body.server || '').trim();
    const port = body.port === undefined ? existing.port : parsePort(body.port);
    const tsig_key_name = body.tsig_key_name === undefined ? existing.tsig_key_name : String(body.tsig_key_name || '').trim();
    const tsig_algorithm = body.tsig_algorithm === undefined ? existing.tsig_algorithm : String(body.tsig_algorithm || '').trim();
    const tsig_secret = body.tsig_secret === undefined ? existing.tsig_secret : String(body.tsig_secret || '').trim();
    const description = body.description === undefined ? existing.description : String(body.description || '').trim();
    const is_active = body.is_active === undefined ? existing.is_active : Boolean(body.is_active);

    const validationError = validateZoneInput({ name, server, port, tsig_algorithm });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { rows } = await pool.query<DnsZone>(
      `UPDATE dns_zones SET
         name = $1,
         server = $2,
         port = $3,
         tsig_key_name = $4,
         tsig_algorithm = $5,
         tsig_secret = $6,
         description = $7,
         is_active = $8,
         updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [name, server, port, tsig_key_name, tsig_algorithm, tsig_secret, description, is_active, zoneId]
    );

    return NextResponse.json(sanitizeZone(rows[0]));
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      return NextResponse.json({ error: 'Zone 名称已存在' }, { status: 409 });
    }
    console.error('Failed to update dns zone:', error);
    return NextResponse.json({ error: '更新 DNS Zone 失败' }, { status: 500 });
  }
}

// DELETE /api/dns/zones/:id
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

  const { id } = await params;
  const zoneId = Number.parseInt(id, 10);
  if (!Number.isFinite(zoneId)) {
    return NextResponse.json({ error: '无效的 Zone ID' }, { status: 400 });
  }

  try {
    const records = await pool.query('SELECT id FROM dns_records WHERE zone_id = $1 LIMIT 1', [zoneId]);
    if (records.rows.length > 0) {
      return NextResponse.json({ error: '请先删除该 Zone 下的记录' }, { status: 409 });
    }

    const result = await pool.query('DELETE FROM dns_zones WHERE id = $1 RETURNING id', [zoneId]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Zone 不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete dns zone:', error);
    return NextResponse.json({ error: '删除 DNS Zone 失败' }, { status: 500 });
  }
}
