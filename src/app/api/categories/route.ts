import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';

export const dynamic = 'force-dynamic';

// GET /api/categories
// Query params:
//   - type: filter by type ('site' | 'qrcode' | 'software')
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');

  let query = 'SELECT * FROM categories';
  const params: string[] = [];

  if (type) {
    query += ' WHERE type = $1';
    params.push(type);
  }

  query += ' ORDER BY sort_order ASC, id ASC';

  const { rows } = await pool.query(query, params);
  return NextResponse.json(rows);
}

// POST /api/categories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, label, type, css_class, icon, icon_bg, icon_color, sort_order } = body;

    if (!name || !label) {
      return NextResponse.json({ error: 'name and label are required' }, { status: 400 });
    }

    const validTypes = ['site', 'qrcode', 'software'];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be site, qrcode, or software' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `INSERT INTO categories (name, label, type, css_class, icon, icon_bg, icon_color, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name,
        label,
        type || 'site',
        css_class || '',
        icon || 'folder',
        icon_bg || 'bg-blue-100',
        icon_color || 'text-blue-600',
        sort_order || 0
      ]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
