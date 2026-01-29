import { notFound } from 'next/navigation';
import pool from '@/db';
import { ResourcesClient } from '@/components/ResourcesClient';
import type { ResourceItem } from '@/types';

export const dynamic = 'force-dynamic';

const PAGE_CONFIG: Record<string, { title: string; description: string }> = {
  dev:    { title: '开发工具', description: '精选的编程、运维与协作工具' },
  design: { title: '设计资源', description: '灵感、素材与设计系统' },
  read:   { title: '阅读与资讯', description: '深度文章、新闻聚合与博客' },
  fun:    { title: '娱乐媒体', description: '视频、音乐与游戏平台' },
  shop:   { title: '购物', description: '全球精选电商平台' },
};

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;

  const config = PAGE_CONFIG[page];
  if (!config) notFound();

  const { rows: items } = await pool.query<ResourceItem>(
    'SELECT * FROM resources WHERE page = $1 ORDER BY sort_order ASC',
    [page]
  );

  return <ResourcesClient items={items} config={config} />;
}
