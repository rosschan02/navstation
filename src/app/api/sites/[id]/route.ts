import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';

// GET /api/sites/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { rows } = await pool.query(
    `SELECT s.*, c.name as category_name, c.label as category_label, c.css_class as category_class
     FROM sites s LEFT JOIN categories c ON s.category_id = c.id
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
  const { name, url, category_id, icon, status } = body;

  const { rows } = await pool.query(
    `UPDATE sites SET
       name = COALESCE($1, name),
       url = COALESCE($2, url),
       category_id = COALESCE($3, category_id),
       icon = COALESCE($4, icon),
       status = COALESCE($5, status),
       updated_at = NOW()
     WHERE id = $6 RETURNING *`,
    [name, url, category_id, icon, status, id]
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
