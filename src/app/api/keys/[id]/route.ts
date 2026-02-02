import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { validateCookieAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// PUT /api/keys/:id - 更新 API Key（需管理员登录）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = validateCookieAuth(request);
  if (!user) {
    return NextResponse.json(
      { error: '未登录', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const keyId = parseInt(id, 10);
  if (isNaN(keyId)) {
    return NextResponse.json({ error: '无效的 ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, permissions, description, is_active } = body;

    // 检查 Key 是否存在
    const existing = await pool.query(
      'SELECT id FROM api_keys WHERE id = $1',
      [keyId]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'API Key 不存在' }, { status: 404 });
    }

    // 构建更新语句
    const updates: string[] = [];
    const values: (string | boolean)[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Key 名称不能为空' },
          { status: 400 }
        );
      }
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }

    if (permissions !== undefined) {
      const validPermissions = ['read', 'write'];
      if (!validPermissions.includes(permissions)) {
        return NextResponse.json(
          { error: '权限值无效，必须是 read 或 write' },
          { status: 400 }
        );
      }
      updates.push(`permissions = $${paramIndex++}`);
      values.push(permissions);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(Boolean(is_active));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 });
    }

    values.push(keyId.toString());
    const { rows } = await pool.query(
      `UPDATE api_keys SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, key_prefix, permissions, description, is_active, last_used_at, created_at`,
      values
    );

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Failed to update API key:', error);
    return NextResponse.json(
      { error: '更新 API Key 失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/keys/:id - 删除 API Key（需管理员登录）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = validateCookieAuth(request);
  if (!user) {
    return NextResponse.json(
      { error: '未登录', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const keyId = parseInt(id, 10);
  if (isNaN(keyId)) {
    return NextResponse.json({ error: '无效的 ID' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      'DELETE FROM api_keys WHERE id = $1 RETURNING id',
      [keyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'API Key 不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'API Key 已删除' });
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return NextResponse.json(
      { error: '删除 API Key 失败' },
      { status: 500 }
    );
  }
}
