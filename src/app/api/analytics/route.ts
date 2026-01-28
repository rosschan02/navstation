import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';

// GET /api/analytics?days=7
export async function GET(request: NextRequest) {
  const days = parseInt(request.nextUrl.searchParams.get('days') || '7', 10);

  // Total clicks in period
  const totalRes = await pool.query(
    `SELECT count(*) as total FROM click_events WHERE created_at >= NOW() - $1::int * INTERVAL '1 day'`,
    [days]
  );

  // Daily breakdown
  const dailyRes = await pool.query(
    `SELECT date_trunc('day', created_at)::date as day, count(*) as clicks
     FROM click_events
     WHERE created_at >= NOW() - $1::int * INTERVAL '1 day'
     GROUP BY day ORDER BY day`,
    [days]
  );

  // Source breakdown
  const sourceRes = await pool.query(
    `SELECT source, count(*) as clicks
     FROM click_events
     WHERE created_at >= NOW() - $1::int * INTERVAL '1 day'
     GROUP BY source ORDER BY clicks DESC`,
    [days]
  );

  // Target type breakdown
  const typeRes = await pool.query(
    `SELECT target_type, count(*) as clicks
     FROM click_events
     WHERE created_at >= NOW() - $1::int * INTERVAL '1 day'
     GROUP BY target_type ORDER BY clicks DESC`,
    [days]
  );

  // Top clicked targets
  const topRes = await pool.query(
    `SELECT target_type, target_id, count(*) as clicks
     FROM click_events
     WHERE created_at >= NOW() - $1::int * INTERVAL '1 day'
     GROUP BY target_type, target_id
     ORDER BY clicks DESC LIMIT 10`,
    [days]
  );

  return NextResponse.json({
    total: parseInt(totalRes.rows[0].total),
    daily: dailyRes.rows,
    sources: sourceRes.rows,
    types: typeRes.rows,
    top: topRes.rows,
  });
}
