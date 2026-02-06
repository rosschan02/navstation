import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { buildAnalyticsSource } from '@/lib/analyticsSource';

// POST /api/analytics/click - record a click event
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { target_type, target_id, source } = body;

  if (!target_type || !target_id) {
    return NextResponse.json({ error: 'target_type and target_id are required' }, { status: 400 });
  }

  if (target_type !== 'site' && target_type !== 'software') {
    return NextResponse.json({ error: 'target_type must be site or software' }, { status: 400 });
  }

  const parsedTargetId = Number(target_id);
  if (!Number.isInteger(parsedTargetId) || parsedTargetId <= 0) {
    return NextResponse.json({ error: 'target_id must be a positive integer' }, { status: 400 });
  }

  const normalizedSource = typeof source === 'string' && source
    ? source
    : buildAnalyticsSource({
      page: typeof body.page === 'string' ? body.page : 'direct',
      visitorId: typeof body.sid === 'string' ? body.sid : 'anon',
      category: typeof body.category === 'string' ? body.category : 'all',
      hasSearch: body.has_search === true,
    });

  const { rows } = await pool.query(
    `INSERT INTO click_events (target_type, target_id, source) VALUES ($1, $2, $3) RETURNING *`,
    [target_type, parsedTargetId, normalizedSource]
  );

  return NextResponse.json(rows[0], { status: 201 });
}
