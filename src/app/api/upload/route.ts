import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Max file size: 5MB for uploaded brand assets
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed image types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
];
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico']);

function isAllowedImage(file: File): boolean {
  if (ALLOWED_TYPES.includes(file.type)) return true;
  const ext = path.extname(file.name).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string || 'logo'; // 'logo' or 'qr'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!isAllowedImage(file)) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', type === 'qr' ? 'qr' : 'logos');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.name) || '.png';
    const safeFileName = `${timestamp}${ext}`;
    const filePath = path.join(uploadsDir, safeFileName);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the relative path for storage in database
    const relativePath = `/uploads/${type === 'qr' ? 'qr' : 'logos'}/${safeFileName}`;

    return NextResponse.json({
      success: true,
      path: relativePath,
      filename: safeFileName
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to upload file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
