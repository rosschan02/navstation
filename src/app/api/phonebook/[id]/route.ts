import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { authenticate, hasPermission, createAuthErrorResponse, extractApiKey } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

const SHORT_CODE_REGEX = /^\d{3,4}$/;
const LONG_CODE_REGEX = /^\d{1,13}$/;
const STATUS_VALUES = new Set(['active', 'inactive']);

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function parseSortOrder(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

// GET /api/phonebook/:id
// Auth: Public access, or API Key (read permission)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (extractApiKey(request)) {
    const auth = await authenticate(request);
    if (!auth.authenticated) {
      return createAuthErrorResponse(auth);
    }
  }

  const { id } = await params;

  try {
    const { rows } = await pool.query('SELECT * FROM phonebook_entries WHERE id = $1', [id]);
    if (rows.length === 0) {
      return NextResponse.json({ error: '电话本条目不存在' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Failed to get phonebook entry:', error);
    return NextResponse.json({ error: '获取电话本条目失败' }, { status: 500 });
  }
}

// PUT /api/phonebook/:id
// Auth: API Key (write permission) or Cookie auth required
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  try {
    const body = await request.json();

    const departmentName = body.department_name === undefined ? null : normalizeText(body.department_name);
    const shortCode = body.short_code === undefined ? null : normalizeText(body.short_code);
    const longCode = body.long_code === undefined ? null : normalizeText(body.long_code);
    const remark = body.remark === undefined ? null : normalizeText(body.remark);
    const sortOrder = parseSortOrder(body.sort_order);
    const status = body.status === undefined ? null : normalizeText(body.status);

    if (departmentName !== null) {
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
    }

    if (shortCode !== null && shortCode !== '' && !SHORT_CODE_REGEX.test(shortCode)) {
      return NextResponse.json(
        { error: '短码必须是 3-4 位数字', code: 'INVALID_SHORT_CODE' },
        { status: 400 }
      );
    }

    if (longCode !== null && longCode !== '' && !LONG_CODE_REGEX.test(longCode)) {
      return NextResponse.json(
        { error: '长码必须是 1-13 位数字', code: 'INVALID_LONG_CODE' },
        { status: 400 }
      );
    }

    if (status !== null && !STATUS_VALUES.has(status)) {
      return NextResponse.json(
        { error: '状态值无效', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    const { rows } = await pool.query(
      `UPDATE phonebook_entries SET
         department_name = COALESCE($1, department_name),
         short_code = COALESCE($2, short_code),
         long_code = COALESCE($3, long_code),
         remark = COALESCE($4, remark),
         sort_order = COALESCE($5, sort_order),
         status = COALESCE($6, status),
         updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [departmentName, shortCode, longCode, remark, sortOrder, status, id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: '电话本条目不存在' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Failed to update phonebook entry:', error);
    return NextResponse.json({ error: '更新电话本条目失败' }, { status: 500 });
  }
}

// DELETE /api/phonebook/:id
// Auth: API Key (write permission) or Cookie auth required
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  try {
    const { rowCount } = await pool.query('DELETE FROM phonebook_entries WHERE id = $1', [id]);
    if (rowCount === 0) {
      return NextResponse.json({ error: '电话本条目不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete phonebook entry:', error);
    return NextResponse.json({ error: '删除电话本条目失败' }, { status: 500 });
  }
}
