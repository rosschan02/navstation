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

// GET /api/dns/zones
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.authenticated) {
    return createAuthErrorResponse(auth);
  }
  if (!hasPermission(auth, 'read')) {
    return NextResponse.json({ error: '权限不足', code: 'PERMISSION_DENIED' }, { status: 403 });
  }

  try {
    const { rows } = await pool.query<DnsZone>(
      'SELECT * FROM dns_zones ORDER BY is_active DESC, id ASC'
    );
    return NextResponse.json(rows.map(sanitizeZone));
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === '42P01') {
      return NextResponse.json([]);
    }
    console.error('Failed to get dns zones:', error);
    return NextResponse.json({ error: '获取 DNS Zone 列表失败' }, { status: 500 });
  }
}

// POST /api/dns/zones
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.authenticated) {
    return createAuthErrorResponse(auth);
  }
  if (!hasPermission(auth, 'write')) {
    return NextResponse.json({ error: '权限不足，需要写入权限', code: 'PERMISSION_DENIED' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const name = normalizeZoneName(body.name);
    const server = typeof body.server === 'string' ? body.server.trim() : '127.0.0.1';
    const port = parsePort(body.port);
    const tsig_key_name = typeof body.tsig_key_name === 'string' ? body.tsig_key_name.trim() : '';
    const tsig_algorithm = typeof body.tsig_algorithm === 'string' ? body.tsig_algorithm.trim() : 'hmac-sha256';
    const tsig_secret = typeof body.tsig_secret === 'string' ? body.tsig_secret.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const is_active = body.is_active === undefined ? true : Boolean(body.is_active);

    const validationError = validateZoneInput({ name, server, port, tsig_algorithm });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { rows } = await pool.query<DnsZone>(
      `INSERT INTO dns_zones
       (name, server, port, tsig_key_name, tsig_algorithm, tsig_secret, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, server, port, tsig_key_name, tsig_algorithm, tsig_secret, description, is_active]
    );

    return NextResponse.json(sanitizeZone(rows[0]), { status: 201 });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      return NextResponse.json({ error: 'Zone 已存在' }, { status: 409 });
    }
    console.error('Failed to create dns zone:', error);
    return NextResponse.json({ error: '创建 DNS Zone 失败' }, { status: 500 });
  }
}
