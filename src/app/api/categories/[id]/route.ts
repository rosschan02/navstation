import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { authenticate, hasPermission, createAuthErrorResponse, extractApiKey } from '@/lib/apiAuth';
import { getLocalizedCategories, upsertCategoryTranslations } from '@/lib/i18n/content';
import { getRequestLocale } from '@/lib/i18n/request';
import type { CategoryTranslationFields, LocaleMap } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/categories/:id
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
  const category = (await getLocalizedCategories(locale, true)).find((item) => item.id === Number(id));

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  return NextResponse.json(category);
}

// PUT /api/categories/:id
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

  const validTypes = ['site', 'qrcode', 'software'];
  if (type && !validTypes.includes(type)) {
    return NextResponse.json({ error: 'Invalid type. Must be site, qrcode, or software' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const baseName = translations?.en?.name || name;
    const baseLabel = translations?.en?.label || label;
    const { rows } = await client.query(
      `UPDATE categories
       SET name = COALESCE($1, name),
           label = COALESCE($2, label),
           type = COALESCE($3, type),
           css_class = COALESCE($4, css_class),
           icon = COALESCE($5, icon),
           icon_bg = COALESCE($6, icon_bg),
           icon_color = COALESCE($7, icon_color),
           sort_order = COALESCE($8, sort_order)
       WHERE id = $9
       RETURNING *`,
      [baseName, baseLabel, type, css_class, icon, icon_bg, icon_color, sort_order, id]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    await upsertCategoryTranslations(client, Number(id), translations);
    await client.query('COMMIT');
    return NextResponse.json(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to update category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE /api/categories/:id
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

  // Check if category is in use by sites
  const { rows: sites } = await pool.query(
    'SELECT COUNT(*) as count FROM sites WHERE category_id = $1',
    [id]
  );

  if (parseInt(sites[0].count) > 0) {
    return NextResponse.json(
      { error: '该分类下还有站点，无法删除' },
      { status: 400 }
    );
  }

  // Check if category is in use by software
  const { rows: software } = await pool.query(
    'SELECT COUNT(*) as count FROM software WHERE category_id = $1',
    [id]
  );

  if (parseInt(software[0].count) > 0) {
    return NextResponse.json(
      { error: '该分类下还有软件，无法删除' },
      { status: 400 }
    );
  }

  await pool.query('DELETE FROM category_translations WHERE category_id = $1', [id]);
  const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1', [id]);

  if (rowCount === 0) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
