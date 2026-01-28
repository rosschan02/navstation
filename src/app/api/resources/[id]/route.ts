import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';

// GET /api/resources/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { rows } = await pool.query('SELECT * FROM resources WHERE id = $1', [id]);
  if (rows.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

// PUT /api/resources/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { title, description, url, icon, img, icon_bg, icon_color, tags, page, sort_order } = body;

  const { rows } = await pool.query(
    `UPDATE resources SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       url = COALESCE($3, url),
       icon = COALESCE($4, icon),
       img = COALESCE($5, img),
       icon_bg = COALESCE($6, icon_bg),
       icon_color = COALESCE($7, icon_color),
       tags = COALESCE($8, tags),
       page = COALESCE($9, page),
       sort_order = COALESCE($10, sort_order)
     WHERE id = $11 RETURNING *`,
    [title, description, url, icon, img, icon_bg, icon_color, tags, page, sort_order, id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

// DELETE /api/resources/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { rowCount } = await pool.query('DELETE FROM resources WHERE id = $1', [id]);
  if (rowCount === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
