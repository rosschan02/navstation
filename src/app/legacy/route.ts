import { NextResponse } from 'next/server';
import pool from '@/db';
import type { Category, SiteData, SoftwareItem } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 获取站点分类
  const { rows: siteCategories } = await pool.query<Category>(`
    SELECT * FROM categories
    WHERE type IN ('site', 'qrcode')
    ORDER BY sort_order ASC, id ASC
  `);

  // 获取站点
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

  // 获取软件分类
  const { rows: softwareCategories } = await pool.query<Category>(`
    SELECT * FROM categories
    WHERE type = 'software'
    ORDER BY sort_order ASC, id ASC
  `);

  // 获取软件
  const { rows: software } = await pool.query<SoftwareItem>(`
    SELECT * FROM software
    ORDER BY sort_order ASC, created_at DESC
  `);

  // 按分类分组站点
  const groupedSites: Record<string, { category: Category; sites: SiteData[] }> = {};
  sites.forEach(site => {
    const categoryId = site.category_id?.toString() || 'uncategorized';
    if (!groupedSites[categoryId]) {
      const category = siteCategories.find(c => c.id.toString() === categoryId);
      if (category) {
        groupedSites[categoryId] = { category, sites: [] };
      }
    }
    if (groupedSites[categoryId]) {
      groupedSites[categoryId].sites.push(site);
    }
  });

  // 按分类分组软件
  const groupedSoftware: Record<string, { category: Category; items: SoftwareItem[] }> = {};
  software.forEach(item => {
    const categoryId = item.category_id?.toString() || 'uncategorized';
    if (!groupedSoftware[categoryId]) {
      const category = softwareCategories.find(c => c.id.toString() === categoryId);
      if (category) {
        groupedSoftware[categoryId] = { category, items: [] };
      }
    }
    if (groupedSoftware[categoryId]) {
      groupedSoftware[categoryId].items.push(item);
    }
  });

  const sortedSiteGroups = Object.values(groupedSites).sort(
    (a, b) => a.category.sort_order - b.category.sort_order
  );

  const sortedSoftwareGroups = Object.values(groupedSoftware).sort(
    (a, b) => a.category.sort_order - b.category.sort_order
  );

  // 生成 HTML
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>导航站</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Microsoft YaHei", SimSun, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      background: #f5f5f5;
    }
    a { color: #137fec; text-decoration: none; }
    a:hover { text-decoration: underline; }

    .header {
      background: #fff;
      border-bottom: 1px solid #ddd;
      padding: 15px 20px;
    }
    .header h1 { font-size: 20px; color: #137fec; }
    .header p { font-size: 12px; color: #999; margin-top: 3px; }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .category {
      background: #fff;
      border: 1px solid #ddd;
      margin-bottom: 20px;
    }
    .category-header {
      background: #f9f9f9;
      border-bottom: 1px solid #ddd;
      padding: 12px 15px;
    }
    .category-header h2 { font-size: 16px; color: #333; display: inline; }
    .category-header span { font-size: 12px; color: #999; margin-left: 8px; }

    .sites-list { padding: 15px; }
    .sites-list:after { content: ""; display: table; clear: both; }

    .site-card {
      float: left;
      width: 23%;
      margin: 0 1% 15px 1%;
      background: #fff;
      border: 1px solid #e0e0e0;
      padding: 12px;
    }
    .site-card:hover { border-color: #137fec; }
    .site-card h3 {
      font-size: 14px;
      color: #333;
      margin-bottom: 5px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .site-card p {
      font-size: 12px;
      color: #666;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .site-card a { display: block; color: inherit; }
    .site-card a:hover { text-decoration: none; }
    .site-card a:hover h3 { color: #137fec; }

    .qr-card {
      float: left;
      width: 14.66%;
      margin: 0 1% 15px 1%;
      background: #fff;
      border: 1px solid #e0e0e0;
      padding: 10px;
      text-align: center;
    }
    .qr-card img { width: 100%; height: auto; border: 1px solid #eee; }
    .qr-card .no-img {
      width: 100%;
      padding-top: 100%;
      background: #f5f5f5;
      color: #ccc;
      font-size: 12px;
    }
    .qr-card h3 {
      font-size: 12px;
      color: #333;
      margin-top: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .qr-card p {
      font-size: 11px;
      color: #999;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .software-card {
      float: left;
      width: 31.33%;
      margin: 0 1% 15px 1%;
      background: #fff;
      border: 1px solid #e0e0e0;
      padding: 12px;
    }
    .software-card:hover { border-color: #137fec; }
    .software-card h3 {
      font-size: 14px;
      color: #333;
      margin-bottom: 3px;
    }
    .software-card .version {
      font-size: 11px;
      color: #999;
      background: #f5f5f5;
      padding: 1px 5px;
      margin-left: 5px;
    }
    .software-card p {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .software-card .meta {
      font-size: 11px;
      color: #999;
    }
    .software-card a.btn {
      display: inline-block;
      background: #137fec;
      color: #fff;
      padding: 5px 12px;
      font-size: 12px;
      float: right;
    }
    .software-card a.btn:hover {
      background: #0d6ecd;
      text-decoration: none;
    }

    .footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
      border-top: 1px solid #ddd;
      background: #fff;
      margin-top: 20px;
    }

    .clearfix:after { content: ""; display: table; clear: both; }
    .clearfix { *zoom: 1; }
  </style>
</head>
<body>
  <div class="header">
    <h1>导航站</h1>
    <p>IE 兼容版本</p>
  </div>

  <div class="container">
    ${sortedSiteGroups.map(({ category, sites: categorySites }) => `
    <div class="category">
      <div class="category-header">
        <h2>${escapeHtml(category.label)}</h2>
        <span>(${categorySites.length})</span>
      </div>
      <div class="sites-list clearfix">
        ${category.type === 'qrcode'
          ? categorySites.map(site => `
            <div class="qr-card">
              ${site.qr_image
                ? `<img src="${escapeHtml(site.qr_image)}" alt="${escapeHtml(site.name)}">`
                : `<div class="no-img"></div>`
              }
              <h3>${escapeHtml(site.name)}</h3>
              ${site.description ? `<p>${escapeHtml(site.description)}</p>` : ''}
            </div>
          `).join('')
          : categorySites.map(site => `
            <div class="site-card">
              <a href="${escapeHtml(site.url)}" target="_blank">
                <h3>${escapeHtml(site.name)}</h3>
                ${site.description ? `<p>${escapeHtml(site.description)}</p>` : ''}
              </a>
            </div>
          `).join('')
        }
      </div>
    </div>
    `).join('')}

    ${sortedSoftwareGroups.map(({ category, items }) => `
    <div class="category">
      <div class="category-header">
        <h2>${escapeHtml(category.label)}</h2>
        <span>(${items.length})</span>
      </div>
      <div class="sites-list clearfix">
        ${items.map(item => `
          <div class="software-card clearfix">
            <h3>
              ${escapeHtml(item.name)}
              ${item.version ? `<span class="version">v${escapeHtml(item.version)}</span>` : ''}
            </h3>
            ${item.description ? `<p>${escapeHtml(item.description)}</p>` : `<p>${escapeHtml(item.file_name)}</p>`}
            <span class="meta">${formatFileSize(item.file_size)} | ${item.download_count} 次下载</span>
            <a class="btn" href="/api/software/${item.id}/download">下载</a>
          </div>
        `).join('')}
      </div>
    </div>
    `).join('')}
  </div>

  <div class="footer">
    <p>&copy; 2024 通用站点导航。保留所有权利。</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
