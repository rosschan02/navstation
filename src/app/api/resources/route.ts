import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';

// GET /api/resources?page=dev
export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get('page');

  let query = 'SELECT * FROM resources';
  const queryParams: string[] = [];

  if (page) {
    query += ' WHERE page = $1';
    queryParams.push(page);
  }

  query += ' ORDER BY sort_order ASC, created_at DESC';

  const { rows } = await pool.query(query, queryParams);
  return NextResponse.json(rows);
}

// POST /api/resources
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, description, url, icon, img, icon_bg, icon_color, tags, page, sort_order } = body;

  if (!title || !url || !page) {
    return NextResponse.json({ error: 'title, url, and page are required' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO resources (title, description, url, icon, img, icon_bg, icon_color, tags, page, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [title, description || '', url, icon || '', img || '', icon_bg || '', icon_color || '', tags || [], page, sort_order || 0]
  );

  return NextResponse.json(rows[0], { status: 201 });
}
