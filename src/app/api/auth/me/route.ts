import { NextRequest, NextResponse } from 'next/server';

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

    return NextResponse.json({
      user: { id: payload.id, username: payload.username, role: payload.role },
    });
  } catch {
    return NextResponse.json({ user: null, error: 'invalid token' }, { status: 401 });
  }
}
