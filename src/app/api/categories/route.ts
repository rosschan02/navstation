import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';

// GET /api/categories
export async function GET() {
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY id ASC');
  return NextResponse.json(rows);
}

// POST /api/categories
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, label, css_class, icon, icon_bg, icon_color } = body;

  if (!name || !label) {
    return NextResponse.json({ error: 'name and label are required' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO categories (name, label, css_class, icon, icon_bg, icon_color)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, label, css_class || '', icon || '', icon_bg || '', icon_color || '']
  );

  return NextResponse.json(rows[0], { status: 201 });
}
