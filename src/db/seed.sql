-- NavStation Seed Data
-- All data sourced from existing frontend constants.tsx

-- ============================================================
-- Categories
-- ============================================================
INSERT INTO categories (name, label, css_class, icon, icon_bg, icon_color) VALUES
  ('Search Engines',    '搜索引擎', 'bg-blue-100 text-blue-800',   'search',          'bg-blue-100',   'text-blue-600'),
  ('Developer Tools',   '开发工具', 'bg-purple-100 text-purple-800', 'terminal',      'bg-purple-100', 'text-purple-600'),
  ('Design Resources',  '设计资源', 'bg-pink-100 text-pink-800',   'palette',         'bg-pink-100',   'text-pink-600'),
  ('Social Media',      '社交媒体', 'bg-indigo-100 text-indigo-800', 'forum',         'bg-indigo-100', 'text-indigo-600'),
  ('Shopping',          '在线购物', 'bg-orange-100 text-orange-800', 'shopping_bag',  'bg-orange-100', 'text-orange-600'),
  ('Entertainment',     '娱乐媒体', 'bg-red-100 text-red-800',     'sports_esports',  'bg-red-100',    'text-red-600'),
  ('Other',             '其他',     'bg-slate-100 text-slate-800', 'folder',          'bg-slate-100',  'text-slate-600')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Sites (from MOCK_SITES)
-- ============================================================
INSERT INTO sites (name, url, category_id, status, icon, color_class) VALUES
  ('Google',   'https://google.com',   (SELECT id FROM categories WHERE name='Search Engines'),   'active',   'https://lh3.googleusercontent.com/aida-public/AB6AXuD2Z3sMrXd-5mJvNhlv4Cj91PORNmDagH3fb9ACVBli61OxL8_lf4YkZr-_MW4r4HXq5bwEkjfo6qohNHkVdWGppmrVxX5hXSbpWvku8qWszF8ZP0EHpCpKcXmOP7jNCCtrKEVekFh9xvmCh0onj9Xh2Tqmh1MKhbqufW4yZS9hmhKlaxxn_xhdrYR_u9STSR7QPAt5c1PSM80WI0miI-kZU8irtQppcH_futIlSvdyHionGSCgAEP79-kD37hAMeYSp7a1GFrT1xE', ''),
  ('GitHub',   'https://github.com',   (SELECT id FROM categories WHERE name='Developer Tools'),  'active',   'https://lh3.googleusercontent.com/aida-public/AB6AXuBF_HPvUF_O4u7hIKxEdif98euLLDVk2puUlewiVC0tdI2nz3BB8284AyDJLoAgtagyirBedYczekFPB2KvDgMjY0trOsdnTp81mm7Oj9e__uK58OF7HQK47ny0OF0M2lBVBZV6aJ3oSFwuyGuS7IOj_teGZeXwoiFqV_1VcCKq0va7jTcbJUD8I__U3IXve99tQDgrBrXJYZmsjO1SaqCt4CYcAGrMcUPPduCtK3UKWvkVZ-BFbs1jVyzg18KQxYPm8u7NfnoHUfM', ''),
  ('Dribbble', 'https://dribbble.com', (SELECT id FROM categories WHERE name='Design Resources'), 'inactive', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDU96ZOO1TpD23RrR41QnVSEz18TWA-O9Is0Qu74MAje5sCnbH1scVdjBR1XkMMEIIz3KRNsESLxnCKmOYWnk289iu10kGJ77hM6a7sUEMvdGwW9e6JYhzrhT1V_WmyVVP6MyaphhpOJUtlBWixWeHLv1AvntVu9TOrB4Z0XasjDNtS38YtbsLSR-Dlm5Zuve423xjmNv4quM-_Jjp4bYln1c86o1-_l5fVGm75-845RqTHp8TXBqfejLBKQ8ci2uhtT2xYh1hg9qQ', ''),
  ('LinkedIn', 'https://linkedin.com', (SELECT id FROM categories WHERE name='Social Media'),     'active',   'https://lh3.googleusercontent.com/aida-public/AB6AXuDVrFVSzqTN_SuMBu08nDXPgWQpIcyz_9S8Z3To_Jw8_c-TEnLmNaKnnEpz__g1ttpJY6UD1fCQGioILyXe3T9Gp9ajefC76owLjV-9NZE4x91y4oW1mdQwlQIjOMxmUYV1BlQRzuhYbaOw6VEj5wQNZPQ808d09uv2tpowBXLrc6iXvgrZu3-uBlOZJeqZFAb2Z4QXgKYCOVtKCPhfcNwGa6lCPBBZzCXH2N2F7ub0_n5a6y3boi0z6y9YNB5YlbPg0-0Rzkc-zdI', '');

-- ============================================================
-- Resources - Dev (page='dev')
-- ============================================================
INSERT INTO resources (title, description, url, img, icon, icon_bg, icon_color, tags, page, sort_order) VALUES
  ('VS Code',        '最好的代码编辑器',     '#', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDbQgD8fCAnyf4GSzZPrHIK1PKpxyK76iuTWbMiAUKPjnWEG1_sE9r3qdO0eYZvvEThdR0oWtIXMxjS22e-bR4hH9FHmAq5Ydo0SUMzBhyBxHd6wWwT-9cTOqYYsqEwODFrsb9-EnWgS1p7rZmqQECVvBCUeVeb_SnCBqgeCmKSeBDgzM-7pHElYQrkQ_kf206pb0oBZlyzj6jqLKdqLnp9c_9e6OhgI2sawWYt6zfOcHkGpP9W7TjSayojxXDsYUDKDnOVDPosemE', '', '', '', ARRAY['Editor','MS'], 'dev', 1),
  ('Stack Overflow', '开发者问答社区',       '#', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdV0gPGJZn2RlQ08_k_IJqAJEUYnVDUT6BvEUTZnkkfLOsGu0R3WXxlByPJwHZCW5VhTH1ZaVnJqS4CSd332YlrVWsW1Ig2BhDQb3g0BURijUH1zVMgxyDCT91JKd8pNo-IE4KZHrhGj-U0ETSWTx-s0yUCc9-gtUbLS_yeBhzmG4VdyP2N3wdzod8PuafN0DZT3hlLoAF3JPtX44cdelv4Qkd2WVN8j1IhX29W90nG3tHFwYCMnS36pqwTH82kN2Rqj4t4XKHctk', '', '', '', ARRAY['Community'], 'dev', 2),
  ('GitHub',         '代码托管与协作',       '#', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsyAU2EgsJZ03O8IBMq9bUgtjfIghXanHowYoovPvYnNhdQKeEZ2CkGZn3wiHwHQPuPoCvVCO_bhOxXlfmHrx0LFmRNOpa34oaccHswVG9zQ-fr0klDO0KzXdqetmsiDKAyc1yot-ImlZLKTUNHwwkrBWgSnzt2WE2ImQrIFybeQJ9P0gJMzorOWiLa27spGCg4EK-38D7Hy0Vrm0uU-8j27T779o6yj3AL3mWl41MyntqqQO36xDqv7ZEVNE1XV3oA8pPbyUhbyc', '', '', '', ARRAY['Git'], 'dev', 3),
  ('React',          'UI 构建库',            '#', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWaVPp_3Djw2gRlWQMpvDJecHwNi-_Tpd1sjoY6o_yxAXDUtUkCYI2-AatxsCvEByuHMXHP3c0jDmlp96w7solRhxYwqJdk5qNOpf8lrqIdNpVwu8flMx3cpT3Ieh6rQdZ35rdUTgWeMiL1bXm5mvn5p-f8wGITRcqZN8_nZISt5V_ngvVLf527-GyJLMQJFGsmfCQ6J49Pj5SfNWE3vdeFafVfd8eN6WTLguGZxKNXD4Cc-tTtwkd4eW5srTcp4gc74jS1Dd9BaM', '', '', '', ARRAY['Frontend'], 'dev', 4),
  ('Tailwind',       '原子化 CSS 框架',      '#', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPoOn1WZ_WuVASK37go_ljFAdxhDVkTu11ZLIVxcTpY9uaxvDTeSB5s-X2E3O7sQcMr-jkIhlM0i2axj3LAcVKj98_0Ql6ibCway5TUjP19DUb_CIf0tUu4m0Cd5Mxw0_v_mYv5JX8YR_iLISrgBGu4VHANz8wX9EVrzWuKH15KA3rulwo2jPbbwK46JAxfovaLUTbyDK5Oar5RdlCp9zXWN2P8rp7WJrpDsMLyI-7KrbYrXFLuehfYDd0-SHuCNXu2JcLICpm-3I', '', '', '', ARRAY['CSS'], 'dev', 5),
  ('MDN Web Docs',   'Web 开发文档',         '#', '', 'description',  'bg-black',       'text-white',      ARRAY['Docs'], 'dev', 6),
  ('Can I Use',      '浏览器兼容性查询',     '#', '', 'check_circle', 'bg-orange-100',  'text-orange-600', ARRAY['Tool'], 'dev', 7),
  ('Docker',         '容器化平台',           '#', '', 'view_in_ar',   'bg-blue-100',    'text-blue-600',   ARRAY['DevOps'], 'dev', 8),
  ('Vercel',         '前端部署平台',         '#', '', 'cloud_upload', 'bg-black',       'text-white',      ARRAY['Deploy'], 'dev', 9),
  ('LeetCode',       '算法刷题',             '#', '', 'code',         'bg-yellow-100',  'text-yellow-600', ARRAY['Interview'], 'dev', 10);

-- ============================================================
-- Resources - Design (page='design')
-- ============================================================
INSERT INTO resources (title, description, url, icon, img, icon_bg, icon_color, tags, page, sort_order) VALUES
  ('Dribbble',       '设计灵感社区',     '#', 'palette',             '', 'bg-pink-100',   'text-pink-600',   ARRAY['Inspiration'], 'design', 1),
  ('Behance',        'Adobe 创意展示',   '#', 'image',               '', 'bg-blue-600',   'text-white',      ARRAY['Portfolio'], 'design', 2),
  ('Figma',          '在线 UI 设计工具', '#', '',                    'https://lh3.googleusercontent.com/aida-public/AB6AXuCQbwfqgozXDF2N1fKlykk89gMkZyPkX_nD_Zq1RasKpwNI4M_PxD-DO7N4NORQt5l994o3fGjFnq8TAmUTIFNrck4mZ8emkgB0QbHZDJIPrnUzlKKM-gOL380KThhOvp3_o-719T4dNHBdEwocNkSzr-zOC3D_9ljzGHjxPIvdi62K2A9xXkuByl1YP6TjxO8HNp4IroNVlQ8SoTiMdXiUEsbB3whFobBP2oeCZpDDi4vSbe7f_tD5PdTi0d3z6sMR7400DAGW-mE', '', '', ARRAY['Tool'], 'design', 3),
  ('Unsplash',       '免费高清图片',     '#', 'photo_camera',        '', 'bg-black',      'text-white',      ARRAY['Photo'], 'design', 4),
  ('Coolors',        '配色方案生成',     '#', 'colorize',            '', 'bg-blue-100',   'text-blue-600',   ARRAY['Color'], 'design', 5),
  ('Material Icons', 'Google 图标库',    '#', 'sentiment_satisfied', '', 'bg-blue-50',    'text-blue-500',   ARRAY['Icons'], 'design', 6),
  ('FontAwesome',    '流行图标库',       '#', 'flag',                '', 'bg-blue-100',   'text-blue-800',   ARRAY['Icons'], 'design', 7),
  ('Awwwards',       '最佳网页设计',     '#', 'emoji_events',        '', 'bg-black',      'text-white',      ARRAY['Awards'], 'design', 8);

-- ============================================================
-- Resources - Reading (page='read')
-- ============================================================
INSERT INTO resources (title, description, url, icon, icon_bg, icon_color, tags, page, sort_order) VALUES
  ('Medium',     '高质量文章社区',   '#', 'article',         'bg-black',       'text-white', ARRAY['Blog'], 'read', 1),
  ('Hacker News','科技新闻聚合',     '#', 'rss_feed',        'bg-orange-500',  'text-white', ARRAY['News'], 'read', 2),
  ('掘金',       '中文技术社区',     '#', 'code_off',        'bg-blue-500',    'text-white', ARRAY['Tech'], 'read', 3),
  ('知乎',       '中文问答社区',     '#', 'question_answer', 'bg-blue-600',    'text-white', ARRAY['Q&A'], 'read', 4),
  ('InfoQ',      '企业级开发资讯',   '#', 'newspaper',       'bg-green-600',   'text-white', ARRAY['Tech'], 'read', 5),
  ('Daily.dev',  '开发者新闻主页',   '#', 'feed',            'bg-purple-600',  'text-white', ARRAY['News'], 'read', 6);

-- ============================================================
-- Resources - Fun (page='fun')
-- ============================================================
INSERT INTO resources (title, description, url, icon, icon_bg, icon_color, tags, page, sort_order) VALUES
  ('Bilibili', '弹幕视频网站',   '#', 'play_circle',     'bg-pink-400',    'text-white', ARRAY['Video'], 'fun', 1),
  ('YouTube',  '全球视频平台',   '#', 'play_arrow',      'bg-red-600',     'text-white', ARRAY['Video'], 'fun', 2),
  ('Steam',    '游戏分发平台',   '#', 'sports_esports',  'bg-blue-900',    'text-white', ARRAY['Game'], 'fun', 3),
  ('Spotify',  '音乐流媒体',     '#', 'headphones',      'bg-green-500',   'text-white', ARRAY['Music'], 'fun', 4),
  ('Twitch',   '游戏直播',       '#', 'videocam',        'bg-purple-600',  'text-white', ARRAY['Live'], 'fun', 5),
  ('Netflix',  '影视流媒体',     '#', 'movie',           'bg-red-700',     'text-white', ARRAY['Movie'], 'fun', 6);

-- ============================================================
-- Resources - Shop (page='shop')
-- ============================================================
INSERT INTO resources (title, description, url, icon, icon_bg, icon_color, tags, page, sort_order) VALUES
  ('淘宝',        '综合电商平台',   '#', 'shopping_bag',    'bg-orange-500',  'text-white',      ARRAY['Shop'], 'shop', 1),
  ('京东',        '正品电器',       '#', 'local_shipping',  'bg-red-600',     'text-white',      ARRAY['Shop'], 'shop', 2),
  ('Amazon',      '全球购物',       '#', 'store',           'bg-slate-800',   'text-white',      ARRAY['Global'], 'shop', 3),
  ('Apple Store', '官方商城',       '#', 'phone_iphone',    'bg-gray-200',    'text-gray-900',   ARRAY['Tech'], 'shop', 4),
  ('IKEA',        '家居用品',       '#', 'chair',           'bg-blue-700',    'text-yellow-400', ARRAY['Home'], 'shop', 5);

-- ============================================================
-- QR Codes (from QR_ITEMS)
-- ============================================================
INSERT INTO qr_codes (name, category, icon, icon_bg, icon_color, qr_image, sort_order) VALUES
  ('TechCrunch News',  '科技 & 创业', 'terminal',      'bg-green-50',  'text-green-600',  'https://lh3.googleusercontent.com/aida-public/AB6AXuDijK6xG7ve4d2rebN_83tPfBTmHl5GCfoFFjtjgNW9SvAjdtpmNulIJ0-ZSG5JdsEFNh-g1iUlfoGfIorbRVs_Cskd44Zzm6Huo43isd0BgZIxkl_LeIgnlI2FRUjA-k9RF1yPKNvXfOIt8iTFGYeXvmwewn6Av-0wcuTYmAWxDWS4-t_SqJMDNlzZdV0QyCX4ymwulUHOobc3p1grH_b4gnbo7YyHFxCPZtOP4E3DRiu5Z8CathYQBkW8ob46ZtyPmX3ydDAPLls', 1),
  ('Dribbble Daily',   '设计灵感',    'palette',       'bg-pink-50',   'text-pink-600',   'https://lh3.googleusercontent.com/aida-public/AB6AXuBn67wr93gHZQNuszoyDeYJfi9fNtXV8PhNDpzVR61LV8xjR5UjCFE-peijvnKwMtO92ykEvrr7wAiML0LNhYxYSy6s1zVNYzXeNsM1_Hci-tN9fxOPrQdfPeytSh0wLnkBEUDjL63w9ItPIf-u18poedzMMPgfyL7OL3TwUMeF5O3Hb-mvOE6vWneED0yxAzy-9Z-VeeGDNqi0fSShPwlDMxDDcTJDu2G1y2UdtdGrPIWNZ1x1aafZCraDJXtzkrqV9KqDEBUjBFw', 2),
  ('36Kr Media',       '创业新闻',    'rocket_launch', 'bg-blue-50',   'text-blue-600',   'https://lh3.googleusercontent.com/aida-public/AB6AXuD74QJgQt_d3A7I-2WxajFKbGfriioAckAaSnQst5IHIyXzUPKcAsh9Oqi00G9yo-0kXjyFG9OtjiOnC0xIa6-puGsCT-ewoe8hMa_Jr5VOs2I4jtRqyIoHvds-nhd5e8IedAiWFVa5hm_WumUq1_RBxUQWK9_sGcvcqvpwCh_Gd_u2XbEJ7LvHlDJSE_0PUvtHvXe9T6f7GxDnQrPGW-8-oYpawOOASS9_472oiHP0jPNUHmftj3Pj6HYWMAmTD8cinvn3a8SX6z0', 3),
  ('GitHub Trends',    '开发',        'data_object',   'bg-gray-50',   'text-gray-700',   'https://lh3.googleusercontent.com/aida-public/AB6AXuAVACFoeRNh84EKX8d18syu1FrcQj7wZijBp3h383sVB_pFZhGGQ6ltEQ_AR3MeNN6MgyEIDOPwFCkP1-4gdhSlfJJpf_Bkw2PTG0aE6VOrKRwpVD8Hi8iZFCgMLKIFyz241O5jq6ePjC-6HDJhuuhqYUHnhNK8WHoZeUfcEq_6cXAdJVNHxdNoI2rwqKgzcGC32WIDNIOgYHqBxyjUGfOVilgYpQ09clIH4AvkX2nscY5-zl7phjbmCdk8J1K1u0fq3YBrnOYbkZ8', 4),
  ('Product Hunt',     '新产品',      'explore',       'bg-orange-50', 'text-orange-600', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAhxb_fB1zrP4M-an8G_bHyJqhn1YcHH7V5WlgpU1exhRisdjJkt5h3t_v92mnZvMLTQzz87Sf80w1gWnHLdS7J-u8BuOzfdeiL8TLymDo8yWjPMvOXGm45dXvI04LmWe0DblntVEKHmhXit5d5X28aBCR4P4MjYyN2Y6yzy8eT1Q5IgLl0FEf6-GtY16lldDUkNHLd_LgFHkbhUalqlOUHZ6QuH4iTY97HyeBZg6ew-9bVqOwi62lZJEaNp06FFg22y1F_Ns60DyE', 5),
  ('V2EX Community',   '讨论社区',    'forum',         'bg-indigo-50', 'text-indigo-600', 'https://lh3.googleusercontent.com/aida-public/AB6AXuB6-kyIs2U7n94DeTHUw7OG1wsAmK2v92kqm_ekBrEN_ZDXCwgWouDJwTuxUrhChA3gwGWSM57egzBY3YS1oXKkrFJr_kqkNCtGNd2xjkKk-i9ojM9id0mfX8aGlqy--DeVii4NaEpiRfFSXJHpe9taHE9XhMxFhmQDcvVPFlCOFSOn3tEttYf6Y_-nDBH7Cvf9VSjvk6pj6xTWFdRj1_XOuQP5S3CIm7OLgblNnXu77K9d6Rr4AuRAWq61RJP6jUytDtbSY2RJjgc', 6),
  ('InfoQ Dev',        '架构',        'architecture',  'bg-teal-50',   'text-teal-600',   'https://lh3.googleusercontent.com/aida-public/AB6AXuDSHmRNyT70IcGmSxHJipCP2Y6a9FtV6uN53gjkAVT1_HOIGsgQ85G7-4QllNlIyVc_hYrHM600uUcTajxj3Yz9eArwLw_9hJHqDiQmMGNCYW4DcP1LUWhVq9kkg6oC2x84XhBYJehVB3Fk_WcJCkqWpHuESQ6DKfyGrACHvhnXnL78A8Nx6UTjOMMPckWUVOYMyxzYU5ngydGkylvIdtlC72buETrsjRyCxtXJHyOpZ1CQweLoLKTOClhbBdolphMSl3SWnultx0E', 7),
  ('UI China',         '设计社区',    'auto_awesome',  'bg-purple-50', 'text-purple-600', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWHfy7TaGkQBTaKwWmjOxomrtiwq7XryDtE7DxagOnMbf9GvumnF8zRgxZf4HNPkieoiPT8fgqeNRTo8ptu5xIKvTMUiH_4cb9Y8A6n4nkNgGcPjJWlhChNB1jfzkwTIH8jKQ2dv0fMXdeSwvp5xEJf30iv28U2olR7fJZe6iRXaY-gn3VNWwdBSXkMd-QYKjoevj6SOH3vrs2EADQYZqsSY0_BBLE6wUZZEvVah8FZmt64U8uZCEUj9QXQi06EKe6QDL17fw5EPw', 8);

-- ============================================================
-- Admin User (username: admin, password: admin)
-- ============================================================
INSERT INTO users (username, password_hash, role) VALUES
  ('admin', '$2b$10$biA2hiGj1uez0/YkT7MVUehIN4nSHXatS/t8iOKaY2EWoe7U8hEmu', 'admin')
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- Sample click events (for analytics demo data)
-- ============================================================
INSERT INTO click_events (target_type, target_id, source, created_at) VALUES
  ('site', 1, 'direct',        NOW() - INTERVAL '6 days'),
  ('site', 1, 'direct',        NOW() - INTERVAL '6 days'),
  ('site', 2, 'google',        NOW() - INTERVAL '5 days'),
  ('site', 2, 'google',        NOW() - INTERVAL '5 days'),
  ('site', 2, 'direct',        NOW() - INTERVAL '5 days'),
  ('resource', 1, 'direct',    NOW() - INTERVAL '4 days'),
  ('resource', 3, 'social',    NOW() - INTERVAL '4 days'),
  ('resource', 3, 'google',    NOW() - INTERVAL '4 days'),
  ('resource', 5, 'direct',    NOW() - INTERVAL '3 days'),
  ('site', 1, 'direct',        NOW() - INTERVAL '3 days'),
  ('site', 3, 'referral',      NOW() - INTERVAL '3 days'),
  ('site', 1, 'google',        NOW() - INTERVAL '2 days'),
  ('site', 2, 'social',        NOW() - INTERVAL '2 days'),
  ('resource', 2, 'direct',    NOW() - INTERVAL '2 days'),
  ('resource', 4, 'direct',    NOW() - INTERVAL '1 day'),
  ('site', 1, 'direct',        NOW() - INTERVAL '1 day'),
  ('site', 2, 'google',        NOW() - INTERVAL '1 day'),
  ('qr', 1, 'direct',          NOW() - INTERVAL '1 day'),
  ('site', 1, 'direct',        NOW()),
  ('site', 2, 'direct',        NOW()),
  ('resource', 1, 'google',    NOW()),
  ('qr', 2, 'direct',          NOW());
