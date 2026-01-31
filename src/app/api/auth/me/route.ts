import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';

// GET /api/auth/me - get current user from token
export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());

    if (payload.exp < Date.now()) {
      return NextResponse.json({ user: null, error: 'token expired' }, { status: 401 });
    }

    // Fetch latest user data from database (including avatar)
    const { rows } = await pool.query(
      'SELECT id, username, role, avatar FROM users WHERE id = $1',
      [payload.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ user: null, error: 'user not found' }, { status: 401 });
    }

    const user = rows[0];
    return NextResponse.json({
      user: { id: user.id, username: user.username, role: user.role, avatar: user.avatar || '' },
    });
  } catch {
    return NextResponse.json({ user: null, error: 'invalid token' }, { status: 401 });
  }
}
