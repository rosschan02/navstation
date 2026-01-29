import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get software info
    const { rows } = await pool.query(
      'SELECT * FROM software WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Software not found' }, { status: 404 });
    }

    const software = rows[0];
    const filePath = path.join(process.cwd(), 'uploads', software.file_path);

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Increment download count
    await pool.query(
      'UPDATE software SET download_count = download_count + 1 WHERE id = $1',
      [id]
    );

    // Read and serve the file
    const fileBuffer = await readFile(filePath);

    // Determine content type based on file extension
    const ext = path.extname(software.file_name).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.exe': 'application/x-msdownload',
      '.msi': 'application/x-msi',
      '.dmg': 'application/x-apple-diskimage',
      '.pkg': 'application/x-newton-compatible-pkg',
      '.deb': 'application/x-deb',
      '.rpm': 'application/x-rpm',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.7z': 'application/x-7z-compressed',
      '.rar': 'application/x-rar-compressed',
      '.iso': 'application/x-iso9660-image',
      '.apk': 'application/vnd.android.package-archive',
      '.pdf': 'application/pdf',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(software.file_name)}"`,
        'Content-Length': software.file_size.toString(),
      },
    });
  } catch (error) {
    console.error('Failed to download software:', error);
    return NextResponse.json({ error: 'Failed to download software' }, { status: 500 });
  }
}
