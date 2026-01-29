import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';

export const dynamic = 'force-dynamic';

// GET /api/categories/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { rows } = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

// PUT /api/categories/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, label, type, css_class, icon, icon_bg, icon_color, sort_order } = body;

  const validTypes = ['site', 'qrcode', 'software'];
  if (type && !validTypes.includes(type)) {
    return NextResponse.json({ error: 'Invalid type. Must be site, qrcode, or software' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `UPDATE categories
     SET name = COALESCE($1, name),
         label = COALESCE($2, label),
         type = COALESCE($3, type),
         css_class = COALESCE($4, css_class),
         icon = COALESCE($5, icon),
         icon_bg = COALESCE($6, icon_bg),
         icon_color = COALESCE($7, icon_color),
         sort_order = COALESCE($8, sort_order)
     WHERE id = $9
     RETURNING *`,
    [name, label, type, css_class, icon, icon_bg, icon_color, sort_order, id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

// DELETE /api/categories/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check if category is in use by sites
  const { rows: sites } = await pool.query(
    'SELECT COUNT(*) as count FROM sites WHERE category_id = $1',
    [id]
  );

  if (parseInt(sites[0].count) > 0) {
    return NextResponse.json(
      { error: '该分类下还有站点，无法删除' },
      { status: 400 }
    );
  }

  // Check if category is in use by software
  const { rows: software } = await pool.query(
    'SELECT COUNT(*) as count FROM software WHERE category_id = $1',
    [id]
  );

  if (parseInt(software[0].count) > 0) {
    return NextResponse.json(
      { error: '该分类下还有软件，无法删除' },
      { status: 400 }
    );
  }

  const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1', [id]);

  if (rowCount === 0) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
