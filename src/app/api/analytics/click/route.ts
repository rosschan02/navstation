import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';

// POST /api/analytics/click - record a click event
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { target_type, target_id, source } = body;

  if (!target_type || !target_id) {
    return NextResponse.json({ error: 'target_type and target_id are required' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO click_events (target_type, target_id, source) VALUES ($1, $2, $3) RETURNING *`,
    [target_type, target_id, source || 'direct']
  );

  return NextResponse.json(rows[0], { status: 201 });
}
