import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Max file size: 4GB
const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('category_id');

    let query = `
      SELECT s.*,
             c.name as category_name,
             c.label as category_label
      FROM software s
      LEFT JOIN categories c ON s.category_id = c.id
    `;
    const params: (string | number)[] = [];

    if (categoryId) {
      query += ' WHERE s.category_id = $1';
      params.push(categoryId);
    }

    query += ' ORDER BY s.created_at DESC';

    const { rows } = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch software:', error);
    return NextResponse.json({ error: 'Failed to fetch software' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const name = formData.get('name') as string;
    const description = formData.get('description') as string || '';
    const version = formData.get('version') as string || '';
    const category_id = formData.get('category_id') as string || null;
    const icon = formData.get('icon') as string || 'download';
    const icon_bg = formData.get('icon_bg') as string || 'bg-blue-100';
    const icon_color = formData.get('icon_color') as string || 'text-blue-600';
    const file = formData.get('file') as File | null;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 4GB limit' }, { status: 400 });
    }

    // Create uploads/software directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'software');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}_${safeFileName}`;
    const filePath = path.join(uploadsDir, fileName);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Get default software category if not provided
    let finalCategoryId = category_id;
    if (!finalCategoryId) {
      const { rows: categories } = await pool.query(
        "SELECT id FROM categories WHERE type = 'software' LIMIT 1"
      );
      if (categories.length > 0) {
        finalCategoryId = categories[0].id;
      }
    }

    // Insert into database
    const { rows } = await pool.query(
      `INSERT INTO software (name, description, version, category_id, file_name, file_path, file_size, icon, icon_bg, icon_color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, description, version, finalCategoryId, file.name, `software/${fileName}`, file.size, icon, icon_bg, icon_color]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Failed to upload software:', error);
    return NextResponse.json({ error: 'Failed to upload software' }, { status: 500 });
  }
}
