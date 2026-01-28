import { NextResponse } from 'next/server';
import pool from '@/db';

// GET /api/categories
export async function GET() {
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY id ASC');
  return NextResponse.json(rows);
}
