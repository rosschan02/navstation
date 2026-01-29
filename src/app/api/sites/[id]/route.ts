import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';

export const dynamic = 'force-dynamic';

// GET /api/sites/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { rows } = await pool.query(
    `SELECT s.*,
            c.name as category_name,
            c.label as category_label,
            c.type as category_type,
            c.css_class as category_class
     FROM sites s
     LEFT JOIN categories c ON s.category_id = c.id
     WHERE s.id = $1`,
    [id]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

// PUT /api/sites/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const {
    name,
    description,
    url,
    category_id,
    logo,
    icon,
    icon_bg,
    icon_color,
    qr_image,
    tags,
    sort_order,
    status
  } = body;

  const { rows } = await pool.query(
    `UPDATE sites SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       url = COALESCE($3, url),
       category_id = $4,
       logo = COALESCE($5, logo),
       icon = COALESCE($6, icon),
       icon_bg = COALESCE($7, icon_bg),
       icon_color = COALESCE($8, icon_color),
       qr_image = COALESCE($9, qr_image),
       tags = COALESCE($10, tags),
       sort_order = COALESCE($11, sort_order),
       status = COALESCE($12, status),
       updated_at = NOW()
     WHERE id = $13 RETURNING *`,
    [name, description, url, category_id, logo, icon, icon_bg, icon_color, qr_image, tags, sort_order, status, id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

// DELETE /api/sites/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { rowCount } = await pool.query('DELETE FROM sites WHERE id = $1', [id]);
  if (rowCount === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
