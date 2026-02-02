import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import {
  generateApiKey,
  getKeyPrefix,
  hashApiKey,
  validateCookieAuth,
} from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// GET /api/keys - 获取 API Key 列表（需管理员登录）
export async function GET(request: NextRequest) {
  const user = validateCookieAuth(request);
  if (!user) {
    return NextResponse.json(
      { error: '未登录', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, name, key_prefix, permissions, description, is_active, last_used_at, created_at
       FROM api_keys
       ORDER BY created_at DESC`
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to get API keys:', error);
    return NextResponse.json(
      { error: '获取 API Key 列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/keys - 创建新 API Key（需管理员登录）
export async function POST(request: NextRequest) {
  const user = validateCookieAuth(request);
  if (!user) {
    return NextResponse.json(
      { error: '未登录', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { name, permissions, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Key 名称不能为空' },
        { status: 400 }
      );
    }

    const validPermissions = ['read', 'write'];
    const perm = permissions || 'read';
    if (!validPermissions.includes(perm)) {
      return NextResponse.json(
        { error: '权限值无效，必须是 read 或 write' },
        { status: 400 }
      );
    }

    // 生成新 Key
    const fullKey = generateApiKey();
    const keyPrefix = getKeyPrefix(fullKey);
    const keyHash = hashApiKey(fullKey);

    const { rows } = await pool.query(
      `INSERT INTO api_keys (name, key_prefix, key_hash, permissions, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, permissions, description, is_active, created_at`,
      [name.trim(), keyPrefix, keyHash, perm, description || '']
    );

    // 返回完整 Key（仅此一次）
    return NextResponse.json(
      {
        ...rows[0],
        key: fullKey,
        message: '请保存此 Key，它不会再次显示',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create API key:', error);
    return NextResponse.json(
      { error: '创建 API Key 失败' },
      { status: 500 }
    );
  }
}
