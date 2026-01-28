import { notFound } from 'next/navigation';
import pool from '@/db';
import type { ResourceItem } from '@/types';

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

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12 bg-background-light">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{config.title}</h2>
              <p className="text-slate-500 text-base mt-2">{config.description}</p>
            </div>
            <div className="hidden sm:flex bg-slate-100 p-1 rounded-lg">
              <button className="px-3 py-1.5 bg-white text-slate-900 shadow-sm rounded-md text-sm font-medium transition-all">全部</button>
              <button className="px-3 py-1.5 text-slate-500 hover:text-slate-900 rounded-md text-sm font-medium transition-all">最新</button>
              <button className="px-3 py-1.5 text-slate-500 hover:text-slate-900 rounded-md text-sm font-medium transition-all">最热</button>
            </div>
          </div>

          <div className="relative w-full max-w-lg mt-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400">search</span>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              placeholder={`在 ${config.title} 中搜索...`}
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
          {items.map((item) => (
            <div key={item.id} className="group flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 p-5 h-full">
              <div className="flex items-start justify-between mb-4">
                <div className={`size-12 rounded-lg ${item.icon_bg || 'bg-slate-100'} flex items-center justify-center shrink-0`}>
                  {item.img ? (
                    <img src={item.img} alt={item.title} className="size-7 object-contain" />
                  ) : (
                    <span className={`material-symbols-outlined ${item.icon_color || 'text-slate-500'} text-[24px]`}>{item.icon}</span>
                  )}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">bookmark</span>
                  </button>
                  <button className="text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">share</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col flex-1">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors mb-1">{item.title}</h3>
                <p className="text-slate-500 text-sm line-clamp-2 mb-4">{item.description}</p>

                <div className="mt-auto flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {item.tags?.map((tag: string) => (
                      <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-600 border border-slate-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all text-[20px]">arrow_forward</span>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Placeholder */}
          <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-slate-100 transition-all cursor-pointer p-6 min-h-[200px] text-slate-400 hover:text-primary group">
            <div className="size-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
              <span className="material-symbols-outlined text-[24px]">add</span>
            </div>
            <span className="font-medium">提交新资源</span>
          </div>
        </div>
      </div>
    </div>
  );
}
