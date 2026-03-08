import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { recordAnalyticsEvent } from '@/lib/analyticsEvents';
import { getClientIpFromRequest } from '@/lib/clientIp';

export const dynamic = 'force-dynamic';

type DivisionRow = {
  level: number;
  code: string;
  parent_level: number | null;
  parent_code: string | null;
  name_zh: string;
  name_en: string;
  province_code: string;
  city_code: string | null;
  county_code: string | null;
  town_code: string | null;
  has_children: boolean;
  full_name_zh: string;
  full_name_en: string;
};

type DivisionListItem = {
  level: number;
  code: string;
  name_zh: string;
  name_en: string;
  full_name_zh: string;
  has_children: boolean;
  parent_level: number | null;
  parent_code: string | null;
};

const LEVEL_RANGE = new Set([1, 2, 3, 4]);

function normalizeText(value: string | null, maxLength: number): string {
  if (!value) return '';
  return value.trim().slice(0, maxLength);
}

function parseLevel(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || !LEVEL_RANGE.has(parsed)) return null;
  return parsed;
}

function parseLimit(value: string | null, defaultValue: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.max(1, Math.min(100, parsed));
}

function isTableMissing(error: unknown): boolean {
  const pgError = error as { code?: string };
  return pgError?.code === '42P01';
}

async function searchDivisions(
  keyword: string,
  level: number | null,
  limit: number
): Promise<DivisionListItem[]> {
  const params: Array<string | number> = [];
  const where: string[] = [];

  params.push(`%${keyword}%`);
  where.push(`name_zh ILIKE $${params.length}`);

  if (level) {
    params.push(level);
    where.push(`level = $${params.length}`);
  }

  params.push(limit);

  const { rows } = await pool.query<DivisionListItem>(
    `SELECT level, code, name_zh, name_en, full_name_zh, has_children, parent_level, parent_code
     FROM admin_divisions
     WHERE ${where.join(' AND ')}
     ORDER BY level DESC, char_length(name_zh) ASC, code ASC
     LIMIT $${params.length}`,
    params
  );

  return rows;
}

async function getDivisionDetail(level: number, code: string) {
  const targetRes = await pool.query<DivisionRow>(
    `SELECT level, code, parent_level, parent_code, name_zh, name_en, province_code, city_code, county_code, town_code, has_children, full_name_zh, full_name_en
     FROM admin_divisions
     WHERE level = $1 AND code = $2
     LIMIT 1`,
    [level, code]
  );

  const target = targetRes.rows[0];
  if (!target) return null;

  const ancestorsRes = await pool.query<DivisionListItem>(
    `WITH RECURSIVE chain AS (
       SELECT level, code, parent_level, parent_code, name_zh, name_en, full_name_zh, has_children
       FROM admin_divisions
       WHERE level = $1 AND code = $2
       UNION ALL
       SELECT p.level, p.code, p.parent_level, p.parent_code, p.name_zh, p.name_en, p.full_name_zh, p.has_children
       FROM admin_divisions p
       JOIN chain c
         ON c.parent_level = p.level
        AND c.parent_code = p.code
     )
     SELECT level, code, parent_level, parent_code, name_zh, name_en, full_name_zh, has_children
     FROM chain
     ORDER BY level ASC`,
    [level, code]
  );

  const childrenRes = await pool.query<DivisionListItem>(
    `SELECT level, code, parent_level, parent_code, name_zh, name_en, full_name_zh, has_children
     FROM admin_divisions
     WHERE parent_level = $1 AND parent_code = $2
     ORDER BY code ASC`,
    [level, code]
  );

  return {
    node: target,
    ancestors: ancestorsRes.rows,
    children: childrenRes.rows,
  };
}

// GET /api/admin-divisions
// mode 1: search
//   - keyword: required
//   - level: optional (1-4)
//   - limit: optional (1-100, default 50)
// mode 2: detail
//   - detail_level + detail_code
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const visitorId = normalizeText(searchParams.get('sid'), 64) || 'anon';
  const page = normalizeText(searchParams.get('page'), 32) || 'home';

  const detailLevel = parseLevel(searchParams.get('detail_level'));
  const detailCode = normalizeText(searchParams.get('detail_code'), 12);

  try {
    if (detailLevel && detailCode) {
      const detail = await getDivisionDetail(detailLevel, detailCode);
      if (!detail) {
        return NextResponse.json({ error: '未找到对应行政区域' }, { status: 404 });
      }
      return NextResponse.json(detail);
    }

    const keyword = normalizeText(searchParams.get('keyword'), 50);
    if (!keyword) {
      return NextResponse.json({ error: 'keyword 不能为空' }, { status: 400 });
    }

    const level = parseLevel(searchParams.get('level'));
    const limit = parseLimit(searchParams.get('limit'), 50);
    const items = await searchDivisions(keyword, level, limit);

    try {
      await recordAnalyticsEvent({
        eventType: 'admin_division_query',
        targetType: 'tool',
        targetName: '行政区域查询',
        page,
        visitorId,
        clientIp: getClientIpFromRequest(request),
        searchQuery: keyword,
        metadata: {
          level,
          limit,
          result_count: items.length,
        },
      });
    } catch (analyticsError) {
      console.error('Failed to record admin division analytics event:', analyticsError);
    }

    return NextResponse.json({
      total: items.length,
      items,
    });
  } catch (error) {
    if (isTableMissing(error)) {
      return NextResponse.json(
        { error: 'admin_divisions 表不存在，请先执行数据库迁移和导入脚本' },
        { status: 503 }
      );
    }
    console.error('Admin divisions query failed:', error);
    return NextResponse.json({ error: '本地行政区查询失败，请稍后重试' }, { status: 500 });
  }
}
