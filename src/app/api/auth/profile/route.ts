import { NextRequest, NextResponse } from 'next/server';
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

// PUT /api/auth/profile - update user profile (avatar)
export async function PUT(request: NextRequest) {
  const userId = getUserIdFromToken(request);

  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { avatar } = body;

    if (typeof avatar !== 'string') {
      return NextResponse.json({ error: '无效的头像路径' }, { status: 400 });
    }

    await pool.query(
      'UPDATE users SET avatar = $1 WHERE id = $2',
      [avatar, userId]
    );

    // Fetch updated user
    const { rows } = await pool.query(
      'SELECT id, username, role, avatar FROM users WHERE id = $1',
      [userId]
    );

    const user = rows[0];
    return NextResponse.json({
      user: { id: user.id, username: user.username, role: user.role, avatar: user.avatar || '' },
    });
  } catch (error) {
    console.error('Failed to update profile:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
