import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/db';

// Helper to get user ID from token
function getUserIdFromToken(request: NextRequest): number | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;

  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) return null;
    return payload.id;
  } catch {
    return null;
  }
}

// PUT /api/auth/password - change password
export async function PUT(request: NextRequest) {
  const userId = getUserIdFromToken(request);

  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { old_password, new_password } = body;

    if (!old_password || !new_password) {
      return NextResponse.json({ error: '请输入当前密码和新密码' }, { status: 400 });
    }

    if (new_password.length < 4) {
      return NextResponse.json({ error: '新密码长度至少4位' }, { status: 400 });
    }

    // Fetch current user
    const { rows } = await pool.query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = rows[0];

    // Verify old password
    const valid = await bcrypt.compare(old_password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: '当前密码错误' }, { status: 400 });
    }

    // Hash new password and update
    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHash, userId]
    );

    return NextResponse.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('Failed to change password:', error);
    return NextResponse.json({ error: '修改失败' }, { status: 500 });
  }
}
