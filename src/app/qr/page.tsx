import pool from '@/db';
import type { QRCodeItem } from '@/types';

export const dynamic = 'force-dynamic';

export default async function QRPage() {
  const { rows: items } = await pool.query<QRCodeItem>(
    'SELECT * FROM qr_codes ORDER BY sort_order ASC'
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12 bg-background-light">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">微信公众号 / 小程序</h2>
            <div className="flex gap-2">
              <button className="p-2 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined">grid_view</span>
              </button>
              <button className="p-2 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined">view_list</span>
              </button>
            </div>
          </div>
          <p className="text-slate-500 text-sm font-normal">
            推荐的公众号和小程序。扫码关注更新。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
          {items.map((item) => (
            <div key={item.id} className="group flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 p-4 h-[26rem]">
              <div className="flex items-center gap-3 mb-3 shrink-0">
                <div className={`w-10 h-10 rounded-full ${item.icon_bg} flex items-center justify-center overflow-hidden shrink-0 border border-slate-100`}>
                  <span className={`material-symbols-outlined ${item.icon_color}`}>{item.icon}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">{item.name}</h3>
                  <span className="text-xs text-slate-500">{item.category}</span>
                </div>
                <button className="ml-auto p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-slate-50 transition-colors" title="复制 ID">
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                </button>
              </div>
              <div className="flex-1 w-full bg-white rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  className="w-full h-full object-contain mix-blend-multiply p-0"
                  src={item.qr_image}
                  alt={`QR Code for ${item.name}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
