import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/db';

// POST /api/auth/login
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 });
  }

  const { rows } = await pool.query(
    'SELECT id, username, password_hash, role FROM users WHERE username = $1',
    [username]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  // Simple token: base64 encode user info (for production use JWT)
  const token = Buffer.from(JSON.stringify({
    id: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24h
  })).toString('base64');

  const response = NextResponse.json({
    user: { id: user.id, username: user.username, role: user.role },
    token,
  });

  // Also set as httpOnly cookie for SSR
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: false, // set true in production with HTTPS
    sameSite: 'lax',
    maxAge: 86400, // 24h
    path: '/',
  });

  return response;
}
