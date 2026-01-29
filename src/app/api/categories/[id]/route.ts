import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';

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
  const { name, label, css_class, icon, icon_bg, icon_color } = body;

  const { rows } = await pool.query(
    `UPDATE categories
     SET name = COALESCE($1, name),
         label = COALESCE($2, label),
         css_class = COALESCE($3, css_class),
         icon = COALESCE($4, icon),
         icon_bg = COALESCE($5, icon_bg),
         icon_color = COALESCE($6, icon_color)
     WHERE id = $7
     RETURNING *`,
    [name, label, css_class, icon, icon_bg, icon_color, id]
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

  // Check if category is in use
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

  const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1', [id]);

  if (rowCount === 0) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
