import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';

// GET /api/sites - list all sites with category info
export async function GET() {
  const { rows } = await pool.query(`
    SELECT s.*, c.name as category_name, c.label as category_label, c.css_class as category_class
    FROM sites s
    LEFT JOIN categories c ON s.category_id = c.id
    ORDER BY s.created_at DESC
  `);
  return NextResponse.json(rows);
}

// POST /api/sites - create a new site
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, url, category_id, icon, status } = body;

  if (!name || !url) {
    return NextResponse.json({ error: 'name and url are required' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO sites (name, url, category_id, icon, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, url, category_id || null, icon || '', status || 'active']
  );

  return NextResponse.json(rows[0], { status: 201 });
}
