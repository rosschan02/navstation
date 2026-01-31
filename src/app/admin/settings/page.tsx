import { SettingsClient } from './SettingsClient';
import type { SiteSettings } from '@/types';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: '导航站',
  site_description: '综合导航门户与站点管理仪表板',
  site_version: 'v2.0 中文版',
  footer_text: '© 2024 通用站点导航。保留所有权利。',
  logo_url: '',
};

async function getSettings(): Promise<SiteSettings> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/settings`, { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error('Failed to fetch settings:', error);
  }
  return DEFAULT_SETTINGS;
}

export default async function SettingsPage() {
  const settings = await getSettings();

  return <SettingsClient initialSettings={settings} />;
}
