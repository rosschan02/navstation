import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import type { SiteSettings } from '@/types';
import { getLocalizedSettings, upsertSettingTranslations } from '@/lib/i18n/content';
import { getRequestLocale } from '@/lib/i18n/request';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: '导航站',
  site_description: '综合导航门户与站点管理仪表板',
  site_version: 'v2.0 中文版',
  footer_text: '© 2024 通用站点导航。保留所有权利。',
  logo_url: '',
  site_icon_url: '',
  default_locale: 'en',
};

// GET /api/settings - Get all settings
export async function GET(request: NextRequest) {
  try {
    const locale = getRequestLocale(request);
    const settings = await getLocalizedSettings(locale);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to get settings:', error);
    // Return defaults if table doesn't exist yet
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const validKeys = Object.keys(DEFAULT_SETTINGS);
    const translations = body.translations;
    await client.query('BEGIN');

    // Update each provided setting
    for (const [key, value] of Object.entries(body)) {
      if (validKeys.includes(key) && typeof value === 'string') {
        await client.query(
          `INSERT INTO site_settings (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, value]
        );
      }
    }

    await upsertSettingTranslations(client, translations);
    await client.query('COMMIT');
    client.release();

    const locale = getRequestLocale(request);
    const settings = await getLocalizedSettings(locale);
    return NextResponse.json(settings);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  } finally {
    client.release();
  }
}
