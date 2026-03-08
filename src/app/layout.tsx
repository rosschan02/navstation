import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import pool from "@/db";
import "./globals.css";

async function getSettings() {
  try {
    const { rows } = await pool.query(
      'SELECT key, value, updated_at FROM site_settings WHERE key IN ($1, $2, $3)',
      ['site_name', 'site_description', 'site_icon_url']
    );
    const settings: Record<string, string> = {};
    let siteIconUpdatedAt = '';
    for (const row of rows) {
      settings[row.key] = row.value;
      if (row.key === 'site_icon_url' && row.updated_at) {
        siteIconUpdatedAt = new Date(row.updated_at).getTime().toString();
      }
    }
    return {
      site_name: settings.site_name || '导航站',
      site_description: settings.site_description || '综合导航门户与站点管理仪表板',
      site_icon_url: settings.site_icon_url || '',
      site_icon_version: siteIconUpdatedAt,
    };
  } catch {
    return {
      site_name: '导航站',
      site_description: '综合导航门户与站点管理仪表板',
      site_icon_url: '',
      site_icon_version: '',
    };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const iconHref = settings.site_icon_url
    ? `${settings.site_icon_url}${settings.site_icon_version ? `?v=${settings.site_icon_version}` : ''}`
    : '/favicon.ico';

  return {
    title: `${settings.site_name} - NavStation`,
    description: settings.site_description,
    icons: {
      icon: iconHref,
      shortcut: iconHref,
      apple: iconHref,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head />
      <body className="bg-background-light text-slate-900 overflow-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
