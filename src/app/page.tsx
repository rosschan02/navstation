import { Suspense } from 'react';
import { headers } from 'next/headers';
import pool from '@/db';
import { HomeClient } from './HomeClient';
import type { Category, SiteData } from '@/types';

async function getClientIP(): Promise<string> {
  const headersList = await headers();

  // 优先从代理头获取真实客户端 IP
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for 可能包含多个 IP，取第一个（原始客户端）
    const ip = forwardedFor.split(',')[0].trim();
    // 过滤 IPv6，只返回 IPv4
    if (ip && !ip.includes(':')) {
      return ip;
    }
  }

  // Nginx 等反向代理设置的头
  const realIP = headersList.get('x-real-ip');
  if (realIP && !realIP.includes(':')) {
    return realIP;
  }

  return '';
}

export const dynamic = 'force-dynamic';

async function getFooterText(): Promise<string> {
  try {
    const { rows } = await pool.query('SELECT value FROM site_settings WHERE key = $1', ['footer_text']);
    return rows[0]?.value || '© 2024 通用站点导航。保留所有权利。';
  } catch {
    return '© 2024 通用站点导航。保留所有权利。';
  }
}

export default async function HomePage() {
  // Fetch categories (site type only, excluding software)
  const { rows: categories } = await pool.query<Category>(`
    SELECT * FROM categories
    WHERE type IN ('site', 'qrcode')
    ORDER BY sort_order ASC, id ASC
  `);

  // Fetch all active sites
  const { rows: sites } = await pool.query<SiteData>(`
    SELECT s.*,
           c.name as category_name,
           c.label as category_label,
           c.type as category_type
    FROM sites s
    LEFT JOIN categories c ON s.category_id = c.id
    WHERE s.status = 'active' AND c.type IN ('site', 'qrcode')
    ORDER BY c.sort_order ASC, s.sort_order ASC, s.created_at DESC
  `);

  const footerText = await getFooterText();
  const clientIP = await getClientIP();

  return (
    <Suspense fallback={<div className="flex-1 bg-background-light" />}>
      <HomeClient categories={categories} sites={sites} footerText={footerText} clientIP={clientIP} />
    </Suspense>
  );
}
