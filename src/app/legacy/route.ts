import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import type { Category, SiteData, SoftwareItem, SiteSettings } from '@/types';

function getClientIP(request: NextRequest): string {
  // 优先从代理头获取真实客户端 IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0].trim();
    if (ip && !ip.includes(':')) {
      return ip;
    }
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP && !realIP.includes(':')) {
    return realIP;
  }

  return '';
}

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
    const { rows } = await pool.query('SELECT key, value FROM site_settings');
    const settings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      const key = row.key as keyof SiteSettings;
      if (key in settings) {
        settings[key] = row.value;
      }
    }
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function GET(request: NextRequest) {
  // 获取客户端 IP
  const clientIP = getClientIP(request);

  // 获取站点设置
  const settings = await getSettings();

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
  <title>${escapeHtml(settings.site_name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Microsoft YaHei", "Segoe UI", SimSun, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      background: #f0f2f5;
    }
    a { color: #1890ff; text-decoration: none; }
    a:hover { color: #40a9ff; }

    .header {
      background: #f0f2f5;
      padding: 24px 20px 0;
      color: #333;
      text-align: center;
    }
    .header-title {
      display: inline-block;
      *display: inline;
      *zoom: 1;
    }
    .header-logo {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      vertical-align: middle;
      margin-right: 12px;
    }
    .header h1 {
      display: inline-block;
      *display: inline;
      *zoom: 1;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: 2px;
      color: #262626;
      vertical-align: middle;
    }

    .container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 24px;
    }

    .category {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      margin-bottom: 24px;
      overflow: hidden;
    }
    .category-header {
      background: #fafafa;
      border-bottom: 1px solid #f0f0f0;
      padding: 14px 20px;
    }
    .category-header h2 {
      font-size: 16px;
      color: #262626;
      display: inline;
      font-weight: 600;
    }
    .category-header span {
      font-size: 12px;
      color: #8c8c8c;
      margin-left: 8px;
    }

    .sites-list { padding: 20px; }
    .sites-list:after { content: ""; display: table; clear: both; }

    .site-card {
      float: left;
      width: 23%;
      margin: 0 1% 16px 1%;
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      padding: 16px;
      transition: all 0.2s;
    }
    .site-card:hover {
      border-color: #1890ff;
      box-shadow: 0 4px 12px rgba(24,144,255,0.15);
    }
    .site-card a {
      display: block;
      color: inherit;
    }
    .site-card a:hover { text-decoration: none; }
    .site-card .card-inner {
      display: table;
      width: 100%;
    }
    .site-card .site-icon {
      display: table-cell;
      width: 44px;
      vertical-align: top;
      padding-right: 12px;
    }
    .site-card .site-icon .icon-box {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      text-align: center;
      line-height: 44px;
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      overflow: hidden;
    }
    .site-card .site-icon .icon-box img {
      width: 28px;
      height: 28px;
      margin-top: 8px;
    }
    .site-card .site-info {
      display: table-cell;
      vertical-align: middle;
    }
    .site-card h3 {
      font-size: 14px;
      color: #262626;
      font-weight: 600;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .site-card:hover h3 { color: #1890ff; }
    .site-card p {
      font-size: 12px;
      color: #8c8c8c;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin: 0;
    }

    .qr-card {
      float: left;
      width: 14.66%;
      margin: 0 1% 16px 1%;
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      transition: all 0.2s;
    }
    .qr-card:hover {
      border-color: #1890ff;
      box-shadow: 0 4px 12px rgba(24,144,255,0.15);
    }
    .qr-card .qr-img-wrap {
      background: #fafafa;
      border-radius: 6px;
      padding: 8px;
    }
    .qr-card img {
      width: 100%;
      height: auto;
      display: block;
    }
    .qr-card .no-img {
      width: 100%;
      padding-top: 100%;
      background: #f5f5f5;
      border-radius: 4px;
    }
    .qr-card h3 {
      font-size: 13px;
      color: #262626;
      font-weight: 600;
      margin-top: 10px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .qr-card p {
      font-size: 11px;
      color: #8c8c8c;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-top: 2px;
    }

    .software-card {
      float: left;
      width: 31.33%;
      margin: 0 1% 16px 1%;
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      padding: 16px;
      transition: all 0.2s;
    }
    .software-card:hover {
      border-color: #1890ff;
      box-shadow: 0 4px 12px rgba(24,144,255,0.15);
    }
    .software-card .card-inner {
      display: table;
      width: 100%;
    }
    .software-card .soft-icon {
      display: table-cell;
      width: 48px;
      vertical-align: top;
      padding-right: 14px;
    }
    .software-card .soft-icon .icon-box {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      text-align: center;
      line-height: 48px;
      font-size: 20px;
      font-weight: 600;
      color: #fff;
    }
    .software-card .soft-info {
      display: table-cell;
      vertical-align: top;
    }
    .software-card h3 {
      font-size: 15px;
      color: #262626;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .software-card .version {
      font-size: 11px;
      color: #1890ff;
      background: #e6f7ff;
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: 6px;
    }
    .software-card p {
      font-size: 12px;
      color: #8c8c8c;
      margin-bottom: 10px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .software-card .meta-row {
      margin-top: 12px;
    }
    .software-card .meta-row:after { content: ""; display: table; clear: both; }
    .software-card .meta {
      font-size: 12px;
      color: #8c8c8c;
      float: left;
      line-height: 32px;
    }
    .software-card a.btn {
      display: inline-block;
      background: #1890ff;
      color: #fff;
      padding: 6px 16px;
      font-size: 13px;
      border-radius: 4px;
      float: right;
    }
    .software-card a.btn:hover {
      background: #40a9ff;
    }

    .footer {
      text-align: center;
      padding: 28px 20px;
      color: #8c8c8c;
      font-size: 13px;
      border-top: 1px solid #e8e8e8;
      background: #fff;
      margin-top: 8px;
    }

    /* 搜索栏容器 */
    .search-bar {
      max-width: 800px;
      margin: 16px auto 0;
      padding: 0 20px;
    }
    .search-bar:after { content: ""; display: table; clear: both; }
    .local-ip {
      float: left;
      font-size: 16px;
      font-weight: 600;
      color: #262626;
      line-height: 42px;
      margin-right: 16px;
    }
    .local-ip span {
      font-family: Consolas, "Courier New", monospace;
      color: #595959;
    }
    /* 搜索框样式 */
    .search-box {
      overflow: hidden;
    }
    .search-box input {
      width: 100%;
      padding: 10px 16px;
      font-size: 14px;
      border: 1px solid #d9d9d9;
      border-radius: 6px;
      outline: none;
      background: #fff;
      color: #333;
    }
    .search-box input:focus {
      border-color: #1890ff;
    }
    .search-box input::-ms-clear {
      display: none;
    }
    .no-results {
      text-align: center;
      padding: 40px 20px;
      color: #8c8c8c;
      font-size: 14px;
    }
    .hidden { display: none !important; }

    .clearfix:after { content: ""; display: table; clear: both; }
    .clearfix { *zoom: 1; }

    /* Icon background colors */
    .bg-blue { background: #1890ff; }
    .bg-green { background: #52c41a; }
    .bg-orange { background: #fa8c16; }
    .bg-purple { background: #722ed1; }
    .bg-red { background: #f5222d; }
    .bg-cyan { background: #13c2c2; }
    .bg-pink { background: #eb2f96; }
    .bg-gray { background: #8c8c8c; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">
      ${settings.logo_url ? `<img src="${escapeHtml(settings.logo_url)}" alt="${escapeHtml(settings.site_name)}" class="header-logo">` : ''}
      <h1>${escapeHtml(settings.site_name)}</h1>
    </div>
    <div class="search-bar clearfix">
      ${clientIP ? `<div class="local-ip">您的IP：<span>${clientIP}</span></div>` : ''}
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="搜索站点或软件..." autocomplete="off">
      </div>
    </div>
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
              <div class="qr-img-wrap">
                ${site.qr_image
                  ? `<img src="${escapeHtml(site.qr_image)}" alt="${escapeHtml(site.name)}">`
                  : `<div class="no-img"></div>`
                }
              </div>
              <h3>${escapeHtml(site.name)}</h3>
              ${site.description ? `<p>${escapeHtml(site.description)}</p>` : ''}
            </div>
          `).join('')
          : categorySites.map(site => `
            <div class="site-card">
              <a href="${escapeHtml(site.url)}" target="_blank">
                <div class="card-inner">
                  <div class="site-icon">
                    <div class="icon-box" style="background-color: ${getIconBgColor(site.icon_bg)}">
                      ${site.logo
                        ? `<img src="${escapeHtml(site.logo)}" alt="${escapeHtml(site.name)}">`
                        : getInitial(site.name)
                      }
                    </div>
                  </div>
                  <div class="site-info">
                    <h3>${escapeHtml(site.name)}</h3>
                    ${site.description ? `<p>${escapeHtml(site.description)}</p>` : ''}
                  </div>
                </div>
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
            <div class="card-inner">
              <div class="soft-icon">
                <div class="icon-box" style="background-color: ${getIconBgColor(item.icon_bg)}">
                  ${getInitial(item.name)}
                </div>
              </div>
              <div class="soft-info">
                <h3>
                  ${escapeHtml(item.name)}
                  ${item.version ? `<span class="version">v${escapeHtml(item.version)}</span>` : ''}
                </h3>
                ${item.description ? `<p>${escapeHtml(item.description)}</p>` : `<p>${escapeHtml(item.file_name)}</p>`}
                <div class="meta-row clearfix">
                  <span class="meta">${formatFileSize(item.file_size)} · ${item.download_count} 次下载</span>
                  <a class="btn" href="/api/software/${item.id}/download">下载</a>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    `).join('')}
  </div>

  <div class="footer">
    <p>${escapeHtml(settings.footer_text)}</p>
  </div>

  <script>
  (function() {
    var searchInput = document.getElementById('searchInput');
    var categories = document.querySelectorAll ? document.querySelectorAll('.category') : [];

    // IE10 兼容的事件绑定
    function addEvent(el, type, fn) {
      if (el.addEventListener) {
        el.addEventListener(type, fn, false);
      } else if (el.attachEvent) {
        el.attachEvent('on' + type, fn);
      }
    }

    // 获取元素文本内容
    function getText(el) {
      return el.textContent || el.innerText || '';
    }

    // 搜索过滤函数
    function filterSites() {
      var keyword = searchInput.value.toLowerCase().replace(/^\\s+|\\s+$/g, '');
      var i, j, category, cards, card, title, desc, visible;

      for (i = 0; i < categories.length; i++) {
        category = categories[i];
        // 同时支持 site-card, qr-card, software-card
        cards = category.querySelectorAll('.site-card, .qr-card, .software-card');
        visible = 0;

        for (j = 0; j < cards.length; j++) {
          card = cards[j];
          title = getText(card.querySelector('h3')) || '';
          desc = getText(card.querySelector('p')) || '';

          if (keyword === '' ||
              title.toLowerCase().indexOf(keyword) !== -1 ||
              desc.toLowerCase().indexOf(keyword) !== -1) {
            card.className = card.className.replace(/\\s*hidden/g, '');
            visible++;
          } else {
            if (card.className.indexOf('hidden') === -1) {
              card.className += ' hidden';
            }
          }
        }

        // 隐藏没有可见卡片的分类
        if (visible === 0 && keyword !== '') {
          if (category.className.indexOf('hidden') === -1) {
            category.className += ' hidden';
          }
        } else {
          category.className = category.className.replace(/\\s*hidden/g, '');
        }
      }
    }

    // 绑定搜索事件
    if (searchInput) {
      addEvent(searchInput, 'input', filterSites);
      addEvent(searchInput, 'keyup', filterSites);  // IE9 fallback
      addEvent(searchInput, 'propertychange', filterSites);  // IE8 fallback
      addEvent(searchInput, 'change', filterSites);
    }
  })();
  </script>
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

function getInitial(name: string): string {
  if (!name) return '?';
  // 如果是中文，取第一个字
  const firstChar = name.charAt(0);
  if (/[\u4e00-\u9fa5]/.test(firstChar)) {
    return firstChar;
  }
  // 英文取前两个字母大写
  return name.substring(0, 2).toUpperCase();
}

function getIconBgColor(iconBg: string): string {
  // Tailwind 类名到实际颜色的映射
  const colorMap: Record<string, string> = {
    'bg-blue-100': '#1890ff',
    'bg-blue-500': '#1890ff',
    'bg-green-100': '#52c41a',
    'bg-green-500': '#52c41a',
    'bg-orange-100': '#fa8c16',
    'bg-orange-500': '#fa8c16',
    'bg-purple-100': '#722ed1',
    'bg-purple-500': '#722ed1',
    'bg-red-100': '#f5222d',
    'bg-red-500': '#f5222d',
    'bg-cyan-100': '#13c2c2',
    'bg-cyan-500': '#13c2c2',
    'bg-pink-100': '#eb2f96',
    'bg-pink-500': '#eb2f96',
    'bg-slate-100': '#8c8c8c',
    'bg-gray-100': '#8c8c8c',
    'bg-indigo-100': '#4f46e5',
    'bg-indigo-500': '#4f46e5',
    'bg-yellow-100': '#faad14',
    'bg-yellow-500': '#faad14',
    'bg-teal-100': '#13c2c2',
    'bg-teal-500': '#13c2c2',
    'bg-emerald-100': '#10b981',
    'bg-emerald-500': '#10b981',
    'bg-rose-100': '#f43f5e',
    'bg-rose-500': '#f43f5e',
    'bg-violet-100': '#8b5cf6',
    'bg-violet-500': '#8b5cf6',
    'bg-amber-100': '#f59e0b',
    'bg-amber-500': '#f59e0b',
  };

  if (iconBg && colorMap[iconBg]) {
    return colorMap[iconBg];
  }

  // 生成基于名称的随机颜色
  const colors = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#13c2c2', '#eb2f96', '#4f46e5', '#f59e0b'];
  const hash = iconBg ? iconBg.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
  return colors[hash % colors.length];
}
