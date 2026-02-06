import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { authenticate, hasPermission, createAuthErrorResponse } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.authenticated) {
    return createAuthErrorResponse(auth);
  }
  if (!hasPermission(auth, 'write')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Generate QR code PNG buffer
    const buffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Ensure uploads/qr directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'qr');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save to file
    const timestamp = Date.now();
    const filename = `${timestamp}.png`;
    const filePath = path.join(uploadsDir, filename);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      path: `/api/uploads/qr/${filename}`,
    });
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
