import pool from '@/db';
import type { Category, SiteData } from '@/types';

export const dynamic = 'force-dynamic';

export default async function LegacyPage() {
  // 获取分类
  const { rows: categories } = await pool.query<Category>(`
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

  // 按分类分组
  const groupedSites: Record<string, { category: Category; sites: SiteData[] }> = {};
  sites.forEach(site => {
    const categoryId = site.category_id?.toString() || 'uncategorized';
    if (!groupedSites[categoryId]) {
      const category = categories.find(c => c.id.toString() === categoryId);
      if (category) {
        groupedSites[categoryId] = { category, sites: [] };
      }
    }
    if (groupedSites[categoryId]) {
      groupedSites[categoryId].sites.push(site);
    }
  });

  const sortedGroups = Object.values(groupedSites).sort(
    (a, b) => a.category.sort_order - b.category.sort_order
  );

  return (
    <html lang="zh-CN">
      <head>
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>导航站</title>
        <style dangerouslySetInnerHTML={{ __html: `
          /* Reset */
          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: "Microsoft YaHei", SimSun, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            background: #f5f5f5;
          }

          a {
            color: #137fec;
            text-decoration: none;
          }

          a:hover {
            text-decoration: underline;
          }

          /* Header */
          .header {
            background: #fff;
            border-bottom: 1px solid #ddd;
            padding: 15px 20px;
          }

          .header h1 {
            font-size: 20px;
            color: #137fec;
          }

          .header p {
            font-size: 12px;
            color: #999;
            margin-top: 3px;
          }

          /* Container */
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }

          /* Category */
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

          .category-header h2 {
            font-size: 16px;
            color: #333;
          }

          .category-header span {
            font-size: 12px;
            color: #999;
            margin-left: 8px;
          }

          /* Sites List */
          .sites-list {
            padding: 15px;
          }

          .sites-list:after {
            content: "";
            display: table;
            clear: both;
          }

          /* Site Card */
          .site-card {
            float: left;
            width: 23%;
            margin: 0 1% 15px 1%;
            background: #fff;
            border: 1px solid #e0e0e0;
            padding: 12px;
          }

          .site-card:hover {
            border-color: #137fec;
          }

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

          .site-card a {
            display: block;
            color: inherit;
          }

          .site-card a:hover {
            text-decoration: none;
          }

          .site-card a:hover h3 {
            color: #137fec;
          }

          /* QR Code Card */
          .qr-card {
            float: left;
            width: 14.66%;
            margin: 0 1% 15px 1%;
            background: #fff;
            border: 1px solid #e0e0e0;
            padding: 10px;
            text-align: center;
          }

          .qr-card img {
            width: 100%;
            height: auto;
            border: 1px solid #eee;
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

          /* Footer */
          .footer {
            text-align: center;
            padding: 20px;
            color: #999;
            font-size: 12px;
            border-top: 1px solid #ddd;
            background: #fff;
            margin-top: 20px;
          }

          /* Clearfix for IE */
          .clearfix:after {
            content: "";
            display: table;
            clear: both;
          }

          .clearfix {
            *zoom: 1;
          }
        `}} />
      </head>
      <body>
        <div className="header">
          <h1>导航站</h1>
          <p>v2.0 中文版</p>
        </div>

        <div className="container">
          {sortedGroups.map(({ category, sites: categorySites }) => (
            <div key={category.id} className="category">
              <div className="category-header">
                <h2>
                  {category.label}
                  <span>({categorySites.length})</span>
                </h2>
              </div>
              <div className="sites-list clearfix">
                {category.type === 'qrcode' ? (
                  categorySites.map(site => (
                    <div key={site.id} className="qr-card">
                      {site.qr_image ? (
                        <img src={site.qr_image} alt={site.name} />
                      ) : (
                        <div style={{
                          width: '100%',
                          paddingTop: '100%',
                          background: '#f5f5f5',
                          position: 'relative'
                        }}>
                          <span style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#ccc'
                          }}>无图片</span>
                        </div>
                      )}
                      <h3>{site.name}</h3>
                      {site.description && <p>{site.description}</p>}
                    </div>
                  ))
                ) : (
                  categorySites.map(site => (
                    <div key={site.id} className="site-card">
                      <a href={site.url} target="_blank" rel="noopener noreferrer">
                        <h3>{site.name}</h3>
                        {site.description && <p>{site.description}</p>}
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="footer">
          <p>&copy; 2024 通用站点导航。保留所有权利。</p>
        </div>
      </body>
    </html>
  );
}
