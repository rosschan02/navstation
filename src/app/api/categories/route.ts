import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { authenticate, hasPermission, createAuthErrorResponse, extractApiKey } from '@/lib/apiAuth';
import { getLocalizedCategories, upsertCategoryTranslations } from '@/lib/i18n/content';
import { getRequestLocale } from '@/lib/i18n/request';
import type { CategoryTranslationFields, LocaleMap } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/categories
// Query params:
//   - type: filter by type ('site' | 'qrcode' | 'software')
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
  const locale = getRequestLocale(request);
  const categories = await getLocalizedCategories(locale, true);
  return NextResponse.json(type ? categories.filter((category) => category.type === type) : categories);
}

// POST /api/categories
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
    const { name, label, type, css_class, icon, icon_bg, icon_color, sort_order, translations } = body as {
      name?: string;
      label?: string;
      type?: string;
      css_class?: string;
      icon?: string;
      icon_bg?: string;
      icon_color?: string;
      sort_order?: number;
      translations?: LocaleMap<CategoryTranslationFields>;
    };

    const baseName = translations?.en?.name || name;
    const baseLabel = translations?.en?.label || label;

    if (!baseName || !baseLabel) {
      return NextResponse.json({ error: 'name and label are required' }, { status: 400 });
    }

    const validTypes = ['site', 'qrcode', 'software'];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be site, qrcode, or software' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO categories (name, label, type, css_class, icon, icon_bg, icon_color, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          baseName,
          baseLabel,
          type || 'site',
          css_class || '',
          icon || 'folder',
          icon_bg || 'bg-blue-100',
          icon_color || 'text-blue-600',
          sort_order || 0
        ]
      );

      await upsertCategoryTranslations(client, rows[0].id, translations);
      await client.query('COMMIT');
      return NextResponse.json(rows[0], { status: 201 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
