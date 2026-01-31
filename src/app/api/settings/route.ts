import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import type { SiteSettings } from '@/types';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: '导航站',
  site_description: '综合导航门户与站点管理仪表板',
  site_version: 'v2.0 中文版',
  footer_text: '© 2024 通用站点导航。保留所有权利。',
  logo_url: '',
};

// GET /api/settings - Get all settings
export async function GET() {
  try {
    const { rows } = await pool.query('SELECT key, value FROM site_settings');

    // Convert rows to object, using defaults for missing keys
    const settings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      const key = row.key as keyof SiteSettings;
      if (key in settings) {
        settings[key] = row.value;
      }
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to get settings:', error);
    // Return defaults if table doesn't exist yet
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validKeys = Object.keys(DEFAULT_SETTINGS);

    // Update each provided setting
    for (const [key, value] of Object.entries(body)) {
      if (validKeys.includes(key) && typeof value === 'string') {
        await pool.query(
          `INSERT INTO site_settings (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, value]
        );
      }
    }

    // Return updated settings
    const { rows } = await pool.query('SELECT key, value FROM site_settings');
    const settings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      const key = row.key as keyof SiteSettings;
      if (key in settings) {
        settings[key] = row.value;
      }
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
