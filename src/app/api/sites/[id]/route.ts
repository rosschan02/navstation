import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { authenticate, hasPermission, createAuthErrorResponse, extractApiKey } from '@/lib/apiAuth';
import { getLocalizedSites, upsertSiteTranslations } from '@/lib/i18n/content';
import { getRequestLocale } from '@/lib/i18n/request';
import type { LocaleMap, SiteTranslationFields } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/sites/:id
// Auth: Public access, or API Key (read permission)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // If API Key is provided, validate it
  if (extractApiKey(request)) {
    const auth = await authenticate(request);
    if (!auth.authenticated) {
      return createAuthErrorResponse(auth);
    }
  }
  const { id } = await params;
  const locale = getRequestLocale(request);
  const site = (await getLocalizedSites(locale, true, true)).find((item) => item.id === Number(id));
  if (!site) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(site);
}

// PUT /api/sites/:id
// Auth: API Key (write permission) or Cookie auth required
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
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
    translations
  } = body;

  const normalizedTranslations = translations as LocaleMap<SiteTranslationFields> | undefined;
  const baseName = normalizedTranslations?.en?.name || name;
  const baseDescription = normalizedTranslations?.en?.description || description;
  const baseTags = normalizedTranslations?.en?.tags || tags;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE sites SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         url = COALESCE($3, url),
         category_id = $4,
         logo = COALESCE($5, logo),
         icon = COALESCE($6, icon),
         icon_bg = COALESCE($7, icon_bg),
         icon_color = COALESCE($8, icon_color),
         qr_image = COALESCE($9, qr_image),
         tags = COALESCE($10, tags),
         sort_order = COALESCE($11, sort_order),
         status = COALESCE($12, status),
         updated_at = NOW()
       WHERE id = $13 RETURNING *`,
      [baseName, baseDescription, url, category_id, logo, icon, icon_bg, icon_color, qr_image, baseTags, sort_order, status, id]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    await upsertSiteTranslations(client, Number(id), normalizedTranslations);
    await client.query('COMMIT');
    return NextResponse.json(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to update site:', error);
    return NextResponse.json({ error: 'Failed to update site' }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE /api/sites/:id
// Auth: API Key (write permission) or Cookie auth required
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  await pool.query('DELETE FROM site_translations WHERE site_id = $1', [id]);
  const { rowCount } = await pool.query('DELETE FROM sites WHERE id = $1', [id]);
  if (rowCount === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
