import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { authenticate, hasPermission, createAuthErrorResponse } from '@/lib/apiAuth';
import { upsertSoftwareTranslations } from '@/lib/i18n/content';
import type { LocaleMap, SoftwareTranslationFields } from '@/types';

export const dynamic = 'force-dynamic';

// PUT /api/software/:id
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

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, version, category_id, logo, icon, icon_bg, icon_color, translations } = body as {
      name?: string;
      description?: string;
      version?: string;
      category_id?: number | null;
      logo?: string;
      icon?: string;
      icon_bg?: string;
      icon_color?: string;
      translations?: LocaleMap<SoftwareTranslationFields>;
    };

    // Check if software exists
    const { rows: existing } = await pool.query(
      'SELECT id FROM software WHERE id = $1',
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Software not found' }, { status: 404 });
    }

    // Update software
    const baseName = translations?.en?.name || name;
    const baseDescription = translations?.en?.description || description;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `UPDATE software SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          version = COALESCE($3, version),
          category_id = $4,
          logo = COALESCE($5, logo),
          icon = COALESCE($6, icon),
          icon_bg = COALESCE($7, icon_bg),
          icon_color = COALESCE($8, icon_color),
          updated_at = NOW()
        WHERE id = $9
        RETURNING *`,
        [baseName, baseDescription, version, category_id || null, logo, icon, icon_bg, icon_color, id]
      );

      await upsertSoftwareTranslations(client, Number(id), translations);
      await client.query('COMMIT');
      return NextResponse.json(rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to update software:', error);
    return NextResponse.json({ error: 'Failed to update software' }, { status: 500 });
  }
}

// DELETE /api/software/:id
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

  try {
    const { id } = await params;

    // Get the file path before deleting
    const { rows: existing } = await pool.query(
      'SELECT file_path FROM software WHERE id = $1',
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Software not found' }, { status: 404 });
    }

    // Delete from database
    await pool.query('DELETE FROM software_translations WHERE software_id = $1', [id]);
    await pool.query('DELETE FROM software WHERE id = $1', [id]);

    // Delete file from disk (file_path includes subdirectory like 'software/filename')
    const filePath = path.join(process.cwd(), 'uploads', existing[0].file_path);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete software:', error);
    return NextResponse.json({ error: 'Failed to delete software' }, { status: 500 });
  }
}
