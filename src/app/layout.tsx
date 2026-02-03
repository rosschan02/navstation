import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import pool from "@/db";
import "./globals.css";

async function getSettings() {
  try {
    const { rows } = await pool.query('SELECT key, value FROM site_settings WHERE key IN ($1, $2)', ['site_name', 'site_description']);
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return {
      site_name: settings.site_name || '导航站',
      site_description: settings.site_description || '综合导航门户与站点管理仪表板',
    };
  } catch {
    return {
      site_name: '导航站',
      site_description: '综合导航门户与站点管理仪表板',
    };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: `${settings.site_name} - NavStation`,
    description: settings.site_description,
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
