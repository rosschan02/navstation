import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
