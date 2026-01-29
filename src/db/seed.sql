-- NavStation Seed Data
-- Version: 2.0.0
-- For use with unified sites structure

-- ============================================================
-- Categories (with type: site, qrcode, software)
-- ============================================================
INSERT INTO categories (name, label, type, icon, icon_bg, icon_color, sort_order) VALUES
  ('dev',      '开发工具',      'site',     'terminal',        'bg-green-100',  'text-green-600',  1),
  ('design',   '设计资源',      'site',     'palette',         'bg-pink-100',   'text-pink-600',   2),
  ('read',     '阅读',          'site',     'menu_book',       'bg-amber-100',  'text-amber-600',  3),
  ('fun',      '娱乐',          'site',     'sports_esports',  'bg-purple-100', 'text-purple-600', 4),
  ('shop',     '购物',          'site',     'shopping_bag',    'bg-orange-100', 'text-orange-600', 5),
  ('social',   '社交媒体',      'site',     'forum',           'bg-indigo-100', 'text-indigo-600', 6),
  ('qrcode',   '公众号/小程序', 'qrcode',   'qr_code_2',       'bg-blue-100',   'text-blue-600',   10),
  ('software', '软件下载',      'software', 'download',        'bg-teal-100',   'text-teal-600',   11)
ON CONFLICT (name) DO UPDATE SET
  label = EXCLUDED.label,
  type = EXCLUDED.type,
  icon = EXCLUDED.icon,
  icon_bg = EXCLUDED.icon_bg,
  icon_color = EXCLUDED.icon_color,
  sort_order = EXCLUDED.sort_order;

-- ============================================================
-- Sites - Dev Tools
-- ============================================================
INSERT INTO sites (name, description, url, category_id, logo, icon, icon_bg, icon_color, tags, sort_order, status) VALUES
  ('VS Code',        '最好的代码编辑器',     'https://code.visualstudio.com', (SELECT id FROM categories WHERE name='dev'), 'https://lh3.googleusercontent.com/aida-public/AB6AXuDbQgD8fCAnyf4GSzZPrHIK1PKpxyK76iuTWbMiAUKPjnWEG1_sE9r3qdO0eYZvvEThdR0oWtIXMxjS22e-bR4hH9FHmAq5Ydo0SUMzBhyBxHd6wWwT-9cTOqYYsqEwODFrsb9-EnWgS1p7rZmqQECVvBCUeVeb_SnCBqgeCmKSeBDgzM-7pHElYQrkQ_kf206pb0oBZlyzj6jqLKdqLnp9c_9e6OhgI2sawWYt6zfOcHkGpP9W7TjSayojxXDsYUDKDnOVDPosemE', 'code', 'bg-blue-100', 'text-blue-600', ARRAY['Editor','MS'], 1, 'active'),
  ('Stack Overflow', '开发者问答社区',       'https://stackoverflow.com', (SELECT id FROM categories WHERE name='dev'), 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdV0gPGJZn2RlQ08_k_IJqAJEUYnVDUT6BvEUTZnkkfLOsGu0R3WXxlByPJwHZCW5VhTH1ZaVnJqS4CSd332YlrVWsW1Ig2BhDQb3g0BURijUH1zVMgxyDCT91JKd8pNo-IE4KZHrhGj-U0ETSWTx-s0yUCc9-gtUbLS_yeBhzmG4VdyP2N3wdzod8PuafN0DZT3hlLoAF3JPtX44cdelv4Qkd2WVN8j1IhX29W90nG3tHFwYCMnS36pqwTH82kN2Rqj4t4XKHctk', 'forum', 'bg-orange-100', 'text-orange-600', ARRAY['Community'], 2, 'active'),
  ('GitHub',         '代码托管与协作',       'https://github.com', (SELECT id FROM categories WHERE name='dev'), 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsyAU2EgsJZ03O8IBMq9bUgtjfIghXanHowYoovPvYnNhdQKeEZ2CkGZn3wiHwHQPuPoCvVCO_bhOxXlfmHrx0LFmRNOpa34oaccHswVG9zQ-fr0klDO0KzXdqetmsiDKAyc1yot-ImlZLKTUNHwwkrBWgSnzt2WE2ImQrIFybeQJ9P0gJMzorOWiLa27spGCg4EK-38D7Hy0Vrm0uU-8j27T779o6yj3AL3mWl41MyntqqQO36xDqv7ZEVNE1XV3oA8pPbyUhbyc', 'code', 'bg-slate-100', 'text-slate-600', ARRAY['Git'], 3, 'active'),
  ('React',          'UI 构建库',            'https://react.dev', (SELECT id FROM categories WHERE name='dev'), 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWaVPp_3Djw2gRlWQMpvDJecHwNi-_Tpd1sjoY6o_yxAXDUtUkCYI2-AatxsCvEByuHMXHP3c0jDmlp96w7solRhxYwqJdk5qNOpf8lrqIdNpVwu8flMx3cpT3Ieh6rQdZ35rdUTgWeMiL1bXm5mvn5p-f8wGITRcqZN8_nZISt5V_ngvVLf527-GyJLMQJFGsmfCQ6J49Pj5SfNWE3vdeFafVfd8eN6WTLguGZxKNXD4Cc-tTtwkd4eW5srTcp4gc74jS1Dd9BaM', 'code', 'bg-blue-100', 'text-blue-600', ARRAY['Frontend'], 4, 'active'),
  ('Tailwind CSS',   '原子化 CSS 框架',      'https://tailwindcss.com', (SELECT id FROM categories WHERE name='dev'), 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPoOn1WZ_WuVASK37go_ljFAdxhDVkTu11ZLIVxcTpY9uaxvDTeSB5s-X2E3O7sQcMr-jkIhlM0i2axj3LAcVKj98_0Ql6ibCway5TUjP19DUb_CIf0tUu4m0Cd5Mxw0_v_mYv5JX8YR_iLISrgBGu4VHANz8wX9EVrzWuKH15KA3rulwo2jPbbwK46JAxfovaLUTbyDK5Oar5RdlCp9zXWN2P8rp7WJrpDsMLyI-7KrbYrXFLuehfYDd0-SHuCNXu2JcLICpm-3I', 'code', 'bg-cyan-100', 'text-cyan-600', ARRAY['CSS'], 5, 'active'),
  ('MDN Web Docs',   'Web 开发文档',         'https://developer.mozilla.org', (SELECT id FROM categories WHERE name='dev'), '', 'description', 'bg-black', 'text-white', ARRAY['Docs'], 6, 'active'),
  ('Can I Use',      '浏览器兼容性查询',     'https://caniuse.com', (SELECT id FROM categories WHERE name='dev'), '', 'check_circle', 'bg-orange-100', 'text-orange-600', ARRAY['Tool'], 7, 'active'),
  ('Docker',         '容器化平台',           'https://docker.com', (SELECT id FROM categories WHERE name='dev'), '', 'view_in_ar', 'bg-blue-100', 'text-blue-600', ARRAY['DevOps'], 8, 'active'),
  ('Vercel',         '前端部署平台',         'https://vercel.com', (SELECT id FROM categories WHERE name='dev'), '', 'cloud_upload', 'bg-black', 'text-white', ARRAY['Deploy'], 9, 'active'),
  ('LeetCode',       '算法刷题',             'https://leetcode.com', (SELECT id FROM categories WHERE name='dev'), '', 'code', 'bg-yellow-100', 'text-yellow-600', ARRAY['Interview'], 10, 'active');

-- ============================================================
-- Sites - Design
-- ============================================================
INSERT INTO sites (name, description, url, category_id, logo, icon, icon_bg, icon_color, tags, sort_order, status) VALUES
  ('Dribbble',       '设计灵感社区',     'https://dribbble.com', (SELECT id FROM categories WHERE name='design'), '', 'palette', 'bg-pink-100', 'text-pink-600', ARRAY['Inspiration'], 1, 'active'),
  ('Behance',        'Adobe 创意展示',   'https://behance.net', (SELECT id FROM categories WHERE name='design'), '', 'image', 'bg-blue-600', 'text-white', ARRAY['Portfolio'], 2, 'active'),
  ('Figma',          '在线 UI 设计工具', 'https://figma.com', (SELECT id FROM categories WHERE name='design'), 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQbwfqgozXDF2N1fKlykk89gMkZyPkX_nD_Zq1RasKpwNI4M_PxD-DO7N4NORQt5l994o3fGjFnq8TAmUTIFNrck4mZ8emkgB0QbHZDJIPrnUzlKKM-gOL380KThhOvp3_o-719T4dNHBdEwocNkSzr-zOC3D_9ljzGHjxPIvdi62K2A9xXkuByl1YP6TjxO8HNp4IroNVlQ8SoTiMdXiUEsbB3whFobBP2oeCZpDDi4vSbe7f_tD5PdTi0d3z6sMR7400DAGW-mE', 'brush', 'bg-purple-100', 'text-purple-600', ARRAY['Tool'], 3, 'active'),
  ('Unsplash',       '免费高清图片',     'https://unsplash.com', (SELECT id FROM categories WHERE name='design'), '', 'photo_camera', 'bg-black', 'text-white', ARRAY['Photo'], 4, 'active'),
  ('Coolors',        '配色方案生成',     'https://coolors.co', (SELECT id FROM categories WHERE name='design'), '', 'colorize', 'bg-blue-100', 'text-blue-600', ARRAY['Color'], 5, 'active'),
  ('Material Icons', 'Google 图标库',    'https://fonts.google.com/icons', (SELECT id FROM categories WHERE name='design'), '', 'sentiment_satisfied', 'bg-blue-50', 'text-blue-500', ARRAY['Icons'], 6, 'active'),
  ('FontAwesome',    '流行图标库',       'https://fontawesome.com', (SELECT id FROM categories WHERE name='design'), '', 'flag', 'bg-blue-100', 'text-blue-800', ARRAY['Icons'], 7, 'active'),
  ('Awwwards',       '最佳网页设计',     'https://awwwards.com', (SELECT id FROM categories WHERE name='design'), '', 'emoji_events', 'bg-black', 'text-white', ARRAY['Awards'], 8, 'active');

-- ============================================================
-- Sites - Reading
-- ============================================================
INSERT INTO sites (name, description, url, category_id, icon, icon_bg, icon_color, tags, sort_order, status) VALUES
  ('Medium',     '高质量文章社区',   'https://medium.com', (SELECT id FROM categories WHERE name='read'), 'article', 'bg-black', 'text-white', ARRAY['Blog'], 1, 'active'),
  ('Hacker News','科技新闻聚合',     'https://news.ycombinator.com', (SELECT id FROM categories WHERE name='read'), 'rss_feed', 'bg-orange-500', 'text-white', ARRAY['News'], 2, 'active'),
  ('掘金',       '中文技术社区',     'https://juejin.cn', (SELECT id FROM categories WHERE name='read'), 'code_off', 'bg-blue-500', 'text-white', ARRAY['Tech'], 3, 'active'),
  ('知乎',       '中文问答社区',     'https://zhihu.com', (SELECT id FROM categories WHERE name='read'), 'question_answer', 'bg-blue-600', 'text-white', ARRAY['Q&A'], 4, 'active'),
  ('InfoQ',      '企业级开发资讯',   'https://infoq.cn', (SELECT id FROM categories WHERE name='read'), 'newspaper', 'bg-green-600', 'text-white', ARRAY['Tech'], 5, 'active'),
  ('Daily.dev',  '开发者新闻主页',   'https://daily.dev', (SELECT id FROM categories WHERE name='read'), 'feed', 'bg-purple-600', 'text-white', ARRAY['News'], 6, 'active');

-- ============================================================
-- Sites - Fun
-- ============================================================
INSERT INTO sites (name, description, url, category_id, icon, icon_bg, icon_color, tags, sort_order, status) VALUES
  ('Bilibili', '弹幕视频网站',   'https://bilibili.com', (SELECT id FROM categories WHERE name='fun'), 'play_circle', 'bg-pink-400', 'text-white', ARRAY['Video'], 1, 'active'),
  ('YouTube',  '全球视频平台',   'https://youtube.com', (SELECT id FROM categories WHERE name='fun'), 'play_arrow', 'bg-red-600', 'text-white', ARRAY['Video'], 2, 'active'),
  ('Steam',    '游戏分发平台',   'https://store.steampowered.com', (SELECT id FROM categories WHERE name='fun'), 'sports_esports', 'bg-blue-900', 'text-white', ARRAY['Game'], 3, 'active'),
  ('Spotify',  '音乐流媒体',     'https://spotify.com', (SELECT id FROM categories WHERE name='fun'), 'headphones', 'bg-green-500', 'text-white', ARRAY['Music'], 4, 'active'),
  ('Twitch',   '游戏直播',       'https://twitch.tv', (SELECT id FROM categories WHERE name='fun'), 'videocam', 'bg-purple-600', 'text-white', ARRAY['Live'], 5, 'active'),
  ('Netflix',  '影视流媒体',     'https://netflix.com', (SELECT id FROM categories WHERE name='fun'), 'movie', 'bg-red-700', 'text-white', ARRAY['Movie'], 6, 'active');

-- ============================================================
-- Sites - Shop
-- ============================================================
INSERT INTO sites (name, description, url, category_id, icon, icon_bg, icon_color, tags, sort_order, status) VALUES
  ('淘宝',        '综合电商平台',   'https://taobao.com', (SELECT id FROM categories WHERE name='shop'), 'shopping_bag', 'bg-orange-500', 'text-white', ARRAY['Shop'], 1, 'active'),
  ('京东',        '正品电器',       'https://jd.com', (SELECT id FROM categories WHERE name='shop'), 'local_shipping', 'bg-red-600', 'text-white', ARRAY['Shop'], 2, 'active'),
  ('Amazon',      '全球购物',       'https://amazon.com', (SELECT id FROM categories WHERE name='shop'), 'store', 'bg-slate-800', 'text-white', ARRAY['Global'], 3, 'active'),
  ('Apple Store', '官方商城',       'https://apple.com/store', (SELECT id FROM categories WHERE name='shop'), 'phone_iphone', 'bg-gray-200', 'text-gray-900', ARRAY['Tech'], 4, 'active'),
  ('IKEA',        '家居用品',       'https://ikea.com', (SELECT id FROM categories WHERE name='shop'), 'chair', 'bg-blue-700', 'text-yellow-400', ARRAY['Home'], 5, 'active');

-- ============================================================
-- Sites - Social
-- ============================================================
INSERT INTO sites (name, description, url, category_id, icon, icon_bg, icon_color, tags, sort_order, status) VALUES
  ('Twitter/X',  '社交媒体',       'https://x.com', (SELECT id FROM categories WHERE name='social'), 'tag', 'bg-black', 'text-white', ARRAY['Social'], 1, 'active'),
  ('LinkedIn',   '职业社交',       'https://linkedin.com', (SELECT id FROM categories WHERE name='social'), 'work', 'bg-blue-700', 'text-white', ARRAY['Career'], 2, 'active'),
  ('微博',       '中文社交平台',   'https://weibo.com', (SELECT id FROM categories WHERE name='social'), 'chat', 'bg-red-500', 'text-white', ARRAY['Social'], 3, 'active'),
  ('Discord',    '社区聊天',       'https://discord.com', (SELECT id FROM categories WHERE name='social'), 'headset_mic', 'bg-indigo-600', 'text-white', ARRAY['Chat'], 4, 'active');

-- ============================================================
-- Sites - QR Codes (type=qrcode)
-- ============================================================
INSERT INTO sites (name, description, url, category_id, icon, icon_bg, icon_color, qr_image, sort_order, status) VALUES
  ('TechCrunch News',  '科技 & 创业', '', (SELECT id FROM categories WHERE name='qrcode'), 'terminal', 'bg-green-50', 'text-green-600', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDijK6xG7ve4d2rebN_83tPfBTmHl5GCfoFFjtjgNW9SvAjdtpmNulIJ0-ZSG5JdsEFNh-g1iUlfoGfIorbRVs_Cskd44Zzm6Huo43isd0BgZIxkl_LeIgnlI2FRUjA-k9RF1yPKNvXfOIt8iTFGYeXvmwewn6Av-0wcuTYmAWxDWS4-t_SqJMDNlzZdV0QyCX4ymwulUHOobc3p1grH_b4gnbo7YyHFxCPZtOP4E3DRiu5Z8CathYQBkW8ob46ZtyPmX3ydDAPLls', 1, 'active'),
  ('Dribbble Daily',   '设计灵感', '', (SELECT id FROM categories WHERE name='qrcode'), 'palette', 'bg-pink-50', 'text-pink-600', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBn67wr93gHZQNuszoyDeYJfi9fNtXV8PhNDpzVR61LV8xjR5UjCFE-peijvnKwMtO92ykEvrr7wAiML0LNhYxYSy6s1zVNYzXeNsM1_Hci-tN9fxOPrQdfPeytSh0wLnkBEUDjL63w9ItPIf-u18poedzMMPgfyL7OL3TwUMeF5O3Hb-mvOE6vWneED0yxAzy-9Z-VeeGDNqi0fSShPwlDMxDDcTJDu2G1y2UdtdGrPIWNZ1x1aafZCraDJXtzkrqV9KqDEBUjBFw', 2, 'active'),
  ('36Kr Media',       '创业新闻', '', (SELECT id FROM categories WHERE name='qrcode'), 'rocket_launch', 'bg-blue-50', 'text-blue-600', 'https://lh3.googleusercontent.com/aida-public/AB6AXuD74QJgQt_d3A7I-2WxajFKbGfriioAckAaSnQst5IHIyXzUPKcAsh9Oqi00G9yo-0kXjyFG9OtjiOnC0xIa6-puGsCT-ewoe8hMa_Jr5VOs2I4jtRqyIoHvds-nhd5e8IedAiWFVa5hm_WumUq1_RBxUQWK9_sGcvcqvpwCh_Gd_u2XbEJ7LvHlDJSE_0PUvtHvXe9T6f7GxDnQrPGW-8-oYpawOOASS9_472oiHP0jPNUHmftj3Pj6HYWMAmTD8cinvn3a8SX6z0', 3, 'active'),
  ('GitHub Trends',    '开发趋势', '', (SELECT id FROM categories WHERE name='qrcode'), 'data_object', 'bg-gray-50', 'text-gray-700', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVACFoeRNh84EKX8d18syu1FrcQj7wZijBp3h383sVB_pFZhGGQ6ltEQ_AR3MeNN6MgyEIDOPwFCkP1-4gdhSlfJJpf_Bkw2PTG0aE6VOrKRwpVD8Hi8iZFCgMLKIFyz241O5jq6ePjC-6HDJhuuhqYUHnhNK8WHoZeUfcEq_6cXAdJVNHxdNoI2rwqKgzcGC32WIDNIOgYHqBxyjUGfOVilgYpQ09clIH4AvkX2nscY5-zl7phjbmCdk8J1K1u0fq3YBrnOYbkZ8', 4, 'active'),
  ('Product Hunt',     '新产品发现', '', (SELECT id FROM categories WHERE name='qrcode'), 'explore', 'bg-orange-50', 'text-orange-600', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAhxb_fB1zrP4M-an8G_bHyJqhn1YcHH7V5WlgpU1exhRisdjJkt5h3t_v92mnZvMLTQzz87Sf80w1gWnHLdS7J-u8BuOzfdeiL8TLymDo8yWjPMvOXGm45dXvI04LmWe0DblntVEKHmhXit5d5X28aBCR4P4MjYyN2Y6yzy8eT1Q5IgLl0FEf6-GtY16lldDUkNHLd_LgFHkbhUalqlOUHZ6QuH4iTY97HyeBZg6ew-9bVqOwi62lZJEaNp06FFg22y1F_Ns60DyE', 5, 'active'),
  ('V2EX Community',   '讨论社区', '', (SELECT id FROM categories WHERE name='qrcode'), 'forum', 'bg-indigo-50', 'text-indigo-600', 'https://lh3.googleusercontent.com/aida-public/AB6AXuB6-kyIs2U7n94DeTHUw7OG1wsAmK2v92kqm_ekBrEN_ZDXCwgWouDJwTuxUrhChA3gwGWSM57egzBY3YS1oXKkrFJr_kqkNCtGNd2xjkKk-i9ojM9id0mfX8aGlqy--DeVii4NaEpiRfFSXJHpe9taHE9XhMxFhmQDcvVPFlCOFSOn3tEttYf6Y_-nDBH7Cvf9VSjvk6pj6xTWFdRj1_XOuQP5S3CIm7OLgblNnXu77K9d6Rr4AuRAWq61RJP6jUytDtbSY2RJjgc', 6, 'active');

-- ============================================================
-- Admin User (username: admin, password: admin)
-- ============================================================
INSERT INTO users (username, password_hash, role) VALUES
  ('admin', '$2b$10$biA2hiGj1uez0/YkT7MVUehIN4nSHXatS/t8iOKaY2EWoe7U8hEmu', 'admin')
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- Sample click events (for analytics demo)
-- ============================================================
INSERT INTO click_events (target_type, target_id, source, created_at) VALUES
  ('site', 1, 'direct', NOW() - INTERVAL '6 days'),
  ('site', 1, 'direct', NOW() - INTERVAL '6 days'),
  ('site', 2, 'google', NOW() - INTERVAL '5 days'),
  ('site', 2, 'google', NOW() - INTERVAL '5 days'),
  ('site', 3, 'direct', NOW() - INTERVAL '5 days'),
  ('site', 4, 'direct', NOW() - INTERVAL '4 days'),
  ('site', 5, 'social', NOW() - INTERVAL '4 days'),
  ('site', 6, 'google', NOW() - INTERVAL '4 days'),
  ('site', 7, 'direct', NOW() - INTERVAL '3 days'),
  ('site', 1, 'direct', NOW() - INTERVAL '3 days'),
  ('site', 2, 'referral', NOW() - INTERVAL '3 days'),
  ('site', 1, 'google', NOW() - INTERVAL '2 days'),
  ('site', 3, 'social', NOW() - INTERVAL '2 days'),
  ('site', 4, 'direct', NOW() - INTERVAL '2 days'),
  ('site', 5, 'direct', NOW() - INTERVAL '1 day'),
  ('site', 1, 'direct', NOW() - INTERVAL '1 day'),
  ('site', 2, 'google', NOW() - INTERVAL '1 day'),
  ('site', 1, 'direct', NOW()),
  ('site', 2, 'direct', NOW()),
  ('site', 3, 'google', NOW());
