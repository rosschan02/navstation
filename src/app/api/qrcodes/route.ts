import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';

// GET /api/qrcodes
export async function GET() {
  const { rows } = await pool.query('SELECT * FROM qr_codes ORDER BY sort_order ASC');
  return NextResponse.json(rows);
}

// POST /api/qrcodes
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, category, icon, icon_bg, icon_color, qr_image, sort_order } = body;

  if (!name || !qr_image) {
    return NextResponse.json({ error: 'name and qr_image are required' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO qr_codes (name, category, icon, icon_bg, icon_color, qr_image, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [name, category || '', icon || '', icon_bg || '', icon_color || '', qr_image, sort_order || 0]
  );

  return NextResponse.json(rows[0], { status: 201 });
}
