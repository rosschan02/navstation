import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { buildAnalyticsSource } from '@/lib/analyticsSource';
import { parseAnalyticsSource } from '@/lib/analyticsSource';
import { getClientIpFromRequest } from '@/lib/clientIp';
import { recordAnalyticsEvent } from '@/lib/analyticsEvents';

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

  const parsedSource = parseAnalyticsSource(normalizedSource);
  try {
    const siteOrSoftware = await pool.query<{
      name: string;
      category_id: number | null;
      category_label: string | null;
    }>(
      target_type === 'site'
        ? `SELECT s.name, s.category_id, c.label as category_label
           FROM sites s
           LEFT JOIN categories c ON s.category_id = c.id
           WHERE s.id = $1
           LIMIT 1`
        : `SELECT sw.name, sw.category_id, c.label as category_label
           FROM software sw
           LEFT JOIN categories c ON sw.category_id = c.id
           WHERE sw.id = $1
           LIMIT 1`,
      [parsedTargetId]
    );

    const target = siteOrSoftware.rows[0];
    await recordAnalyticsEvent({
      eventType: target_type === 'site' ? 'nav_click' : 'software_download',
      targetType: target_type,
      targetId: parsedTargetId,
      targetName: target?.name || '',
      categoryId: target?.category_id ?? null,
      categoryLabel: target?.category_label || '',
      page: parsedSource.page,
      visitorId: parsedSource.visitorId,
      clientIp: getClientIpFromRequest(request),
      hasSearch: parsedSource.hasSearch,
      metadata: {
        source: normalizedSource,
        legacy_category: parsedSource.category,
      },
    });
  } catch (analyticsError) {
    console.error('Failed to write unified analytics click event:', analyticsError);
    return NextResponse.json({ error: 'failed to record analytics event' }, { status: 500 });
  }

  return NextResponse.json({
    target_type,
    target_id: parsedTargetId,
    source: normalizedSource,
    created_at: new Date().toISOString(),
  }, { status: 201 });
}
