import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { authenticate, hasPermission, createAuthErrorResponse, extractApiKey } from '@/lib/apiAuth';

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

  let query = `
    SELECT s.*,
           c.name as category_name,
           c.label as category_label,
           c.type as category_type,
           c.css_class as category_class
    FROM sites s
    LEFT JOIN categories c ON s.category_id = c.id
    WHERE s.status = 'active'
  `;
  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (type) {
    query += ` AND c.type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (category) {
    query += ` AND c.name = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  if (search) {
    query += ` AND (s.name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ` ORDER BY c.sort_order ASC, s.sort_order ASC, s.created_at DESC`;

  const { rows } = await pool.query(query, params);
  return NextResponse.json(rows);
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
      status
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `INSERT INTO sites (name, description, url, category_id, logo, icon, icon_bg, icon_color, qr_image, tags, sort_order, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        name,
        description || '',
        url || '',
        category_id || null,
        logo || '',
        icon || 'link',
        icon_bg || 'bg-slate-100',
        icon_color || 'text-slate-600',
        qr_image || '',
        tags || [],
        sort_order || 0,
        status || 'active'
      ]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create site:', error);
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
  }
}
