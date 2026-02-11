import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { authenticate, hasPermission, createAuthErrorResponse, extractApiKey } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

const SHORT_CODE_REGEX = /^\d{4}$/;
const LONG_CODE_REGEX = /^\d{1,13}$/;
const STATUS_VALUES = new Set(['active', 'inactive']);

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function parseSortOrder(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? '0'), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function clampLimit(value: string | null, defaultValue: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.min(500, Math.max(1, parsed));
}

// GET /api/phonebook
// Query params:
//   - search: keyword for department_name, short_code, long_code
//   - limit: max rows to return
//   - include_inactive: 1 to include inactive rows (requires write permission)
// Auth: Public read, write auth required for include_inactive
export async function GET(request: NextRequest) {
  let authRequiredForInactive = false;
  let authResult: Awaited<ReturnType<typeof authenticate>> | null = null;

  const includeInactive = request.nextUrl.searchParams.get('include_inactive') === '1';
  if (includeInactive) {
    authRequiredForInactive = true;
  }

  if (extractApiKey(request) || authRequiredForInactive) {
    authResult = await authenticate(request);
    if (!authResult.authenticated) {
      return createAuthErrorResponse(authResult);
    }
  }

  if (includeInactive && (!authResult || !hasPermission(authResult, 'write'))) {
    return NextResponse.json(
      { error: '权限不足，需要写入权限', code: 'PERMISSION_DENIED' },
      { status: 403 }
    );
  }

  const search = normalizeText(request.nextUrl.searchParams.get('search'));
  const limit = clampLimit(request.nextUrl.searchParams.get('limit'), includeInactive ? 500 : 50);

  try {
    let query = 'SELECT * FROM phonebook_entries';
    const whereClauses: string[] = [];
    const params: Array<string | number> = [];

    if (!includeInactive) {
      whereClauses.push(`status = 'active'`);
    }

    if (search) {
      const param = `%${search}%`;
      params.push(param);
      const idx = params.length;
      whereClauses.push(`(department_name ILIKE $${idx} OR short_code ILIKE $${idx} OR long_code ILIKE $${idx})`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    params.push(limit);
    query += ` ORDER BY sort_order ASC, id ASC LIMIT $${params.length}`;

    const { rows } = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === '42P01') {
      return NextResponse.json([]);
    }
    console.error('Failed to get phonebook entries:', error);
    return NextResponse.json({ error: '获取电话本数据失败' }, { status: 500 });
  }
}

// POST /api/phonebook
// Auth: API Key (write permission) or Cookie auth required
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.authenticated) {
    return createAuthErrorResponse(auth);
  }
  if (!hasPermission(auth, 'write')) {
    return NextResponse.json(
      { error: '权限不足，需要写入权限', code: 'PERMISSION_DENIED' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const departmentName = normalizeText(body.department_name);
    const shortCode = normalizeText(body.short_code);
    const longCode = normalizeText(body.long_code);
    const remark = normalizeText(body.remark);
    const sortOrder = parseSortOrder(body.sort_order);
    const status = normalizeText(body.status) || 'active';

    if (!departmentName) {
      return NextResponse.json(
        { error: '科室名称不能为空', code: 'INVALID_DEPARTMENT_NAME' },
        { status: 400 }
      );
    }
    if (departmentName.length > 100) {
      return NextResponse.json(
        { error: '科室名称长度不能超过 100 个字符', code: 'INVALID_DEPARTMENT_NAME' },
        { status: 400 }
      );
    }
    if (!SHORT_CODE_REGEX.test(shortCode)) {
      return NextResponse.json(
        { error: '短码必须是 4 位数字', code: 'INVALID_SHORT_CODE' },
        { status: 400 }
      );
    }
    if (!LONG_CODE_REGEX.test(longCode)) {
      return NextResponse.json(
        { error: '长码必须是 1-13 位数字', code: 'INVALID_LONG_CODE' },
        { status: 400 }
      );
    }
    if (!STATUS_VALUES.has(status)) {
      return NextResponse.json(
        { error: '状态值无效', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    const { rows } = await pool.query(
      `INSERT INTO phonebook_entries (department_name, short_code, long_code, remark, sort_order, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [departmentName, shortCode, longCode, remark, sortOrder, status]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    const pgError = error as { code?: string; message?: string };
    if (pgError.code === '23505') {
      const isShortCode = pgError.message?.includes('short_code');
      return NextResponse.json(
        {
          error: isShortCode ? '短码已存在' : '长码已存在',
          code: isShortCode ? 'DUPLICATE_SHORT_CODE' : 'DUPLICATE_LONG_CODE',
        },
        { status: 409 }
      );
    }
    console.error('Failed to create phonebook entry:', error);
    return NextResponse.json({ error: '新增电话本条目失败' }, { status: 500 });
  }
}
