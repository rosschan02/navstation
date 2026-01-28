import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';

// GET /api/qrcodes/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { rows } = await pool.query('SELECT * FROM qr_codes WHERE id = $1', [id]);
  if (rows.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

// PUT /api/qrcodes/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, category, icon, icon_bg, icon_color, qr_image, sort_order } = body;

  const { rows } = await pool.query(
    `UPDATE qr_codes SET
       name = COALESCE($1, name),
       category = COALESCE($2, category),
       icon = COALESCE($3, icon),
       icon_bg = COALESCE($4, icon_bg),
       icon_color = COALESCE($5, icon_color),
       qr_image = COALESCE($6, qr_image),
       sort_order = COALESCE($7, sort_order)
     WHERE id = $8 RETURNING *`,
    [name, category, icon, icon_bg, icon_color, qr_image, sort_order, id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

// DELETE /api/qrcodes/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { rowCount } = await pool.query('DELETE FROM qr_codes WHERE id = $1', [id]);
  if (rowCount === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
