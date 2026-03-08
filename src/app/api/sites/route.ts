import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { authenticate, hasPermission, createAuthErrorResponse, extractApiKey } from '@/lib/apiAuth';
import { getLocalizedSites, upsertSiteTranslations } from '@/lib/i18n/content';
import { getRequestLocale } from '@/lib/i18n/request';
import type { LocaleMap, SiteTranslationFields } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/sites - list all sites with category info
// Query params:
//   - type: filter by category type ('site' | 'qrcode')
//   - category: filter by category name
//   - search: search by name or description
// Auth: Public access, or API Key (read permission)
export async function GET(request: NextRequest) {
  // If API Key is provided, validate it
  if (extractApiKey(request)) {
    const auth = await authenticate(request);
    if (!auth.authenticated) {
      return createAuthErrorResponse(auth);
    }
  }
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const locale = getRequestLocale(request);
  let sites = await getLocalizedSites(locale, false, true);
  if (type) {
    sites = sites.filter((site) => site.category_type === type);
  }
  if (category) {
    sites = sites.filter((site) => site.category_name === category);
  }
  if (search) {
    const query = search.toLowerCase();
    sites = sites.filter((site) =>
      site.name.toLowerCase().includes(query)
      || site.description?.toLowerCase().includes(query)
      || site.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }
  return NextResponse.json(sites);
}

// POST /api/sites - create a new site
// Auth: API Key (write permission) or Cookie auth required
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.authenticated) {
    return createAuthErrorResponse(auth);
  }
  if (!hasPermission(auth, 'write')) {
    return NextResponse.json(
      { error: '权限不足，需要写入权限', code: 'PERMISSION_DENIED' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      url,
      category_id,
      logo,
      icon,
      icon_bg,
      icon_color,
      qr_image,
      tags,
      sort_order,
      status,
      translations,
    } = body;

    const normalizedTranslations = translations as LocaleMap<SiteTranslationFields> | undefined;
    const baseName = normalizedTranslations?.en?.name || name;
    const baseDescription = normalizedTranslations?.en?.description || description || '';
    const baseTags = normalizedTranslations?.en?.tags || tags || [];

    if (!baseName) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO sites (name, description, url, category_id, logo, icon, icon_bg, icon_color, qr_image, tags, sort_order, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          baseName,
          baseDescription,
          url || '',
          category_id || null,
          logo || '',
          icon || 'link',
          icon_bg || 'bg-slate-100',
          icon_color || 'text-slate-600',
          qr_image || '',
          baseTags,
          sort_order || 0,
          status || 'active'
        ]
      );

      await upsertSiteTranslations(client, rows[0].id, normalizedTranslations);
      await client.query('COMMIT');
      return NextResponse.json(rows[0], { status: 201 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to create site:', error);
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
  }
}
