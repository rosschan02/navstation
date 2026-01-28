import pool from '@/db';

export const dynamic = 'force-dynamic';

const IMAGES = {
  GITHUB: "https://lh3.googleusercontent.com/aida-public/AB6AXuCsyAU2EgsJZ03O8IBMq9bUgtjfIghXanHowYoovPvYnNhdQKeEZ2CkGZn3wiHwHQPuPoCvVCO_bhOxXlfmHrx0LFmRNOpa34oaccHswVG9zQ-fr0klDO0KzXdqetmsiDKAyc1yot-ImlZLKTUNHwwkrBWgSnzt2WE2ImQrIFybeQJ9P0gJMzorOWiLa27spGCg4EK-38D7Hy0Vrm0uU-8j27T779o6yj3AL3mWl41MyntqqQO36xDqv7ZEVNE1XV3oA8pPbyUhbyc",
  FIGMA: "https://lh3.googleusercontent.com/aida-public/AB6AXuCQbwfqgozXDF2N1fKlykk89gMkZyPkX_nD_Zq1RasKpwNI4M_PxD-DO7N4NORQt5l994o3fGjFnq8TAmUTIFNrck4mZ8emkgB0QbHZDJIPrnUzlKKM-gOL380KThhOvp3_o-719T4dNHBdEwocNkSzr-zOC3D_9ljzGHjxPIvdi62K2A9xXkuByl1YP6TjxO8HNp4IroNVlQ8SoTiMdXiUEsbB3whFobBP2oeCZpDDi4vSbe7f_tD5PdTi0d3z6sMR7400DAGW-mE",
  VSCODE: "https://lh3.googleusercontent.com/aida-public/AB6AXuDbQgD8fCAnyf4GSzZPrHIK1PKpxyK76iuTWbMiAUKPjnWEG1_sE9r3qdO0eYZvvEThdR0oWtIXMxjS22e-bR4hH9FHmAq5Ydo0SUMzBhyBxHd6wWwT-9cTOqYYsqEwODFrsb9-EnWgS1p7rZmqQECVvBCUeVeb_SnCBqgeCmKSeBDgzM-7pHElYQrkQ_kf206pb0oBZlyzj6jqLKdqLnp9c_9e6OhgI2sawWYt6zfOcHkGpP9W7TjSayojxXDsYUDKDnOVDPosemE",
  STACKOVERFLOW: "https://lh3.googleusercontent.com/aida-public/AB6AXuAdV0gPGJZn2RlQ08_k_IJqAJEUYnVDUT6BvEUTZnkkfLOsGu0R3WXxlByPJwHZCW5VhTH1ZaVnJqS4CSd332YlrVWsW1Ig2BhDQb3g0BURijUH1zVMgxyDCT91JKd8pNo-IE4KZHrhGj-U0ETSWTx-s0yUCc9-gtUbLS_yeBhzmG4VdyP2N3wdzod8PuafN0DZT3hlLoAF3JPtX44cdelv4Qkd2WVN8j1IhX29W90nG3tHFwYCMnS36pqwTH82kN2Rqj4t4XKHctk",
  REACT: "https://lh3.googleusercontent.com/aida-public/AB6AXuCWaVPp_3Djw2gRlWQMpvDJecHwNi-_Tpd1sjoY6o_yxAXDUtUkCYI2-AatxsCvEByuHMXHP3c0jDmlp96w7solRhxYwqJdk5qNOpf8lrqIdNpVwu8flMx3cpT3Ieh6rQdZ35rdUTgWeMiL1bXm5mvn5p-f8wGITRcqZN8_nZISt5V_ngvVLf527-GyJLMQJFGsmfCQ6J49Pj5SfNWE3vdeFafVfd8eN6WTLguGZxKNXD4Cc-tTtwkd4eW5srTcp4gc74jS1Dd9BaM",
  TAILWIND: "https://lh3.googleusercontent.com/aida-public/AB6AXuCPoOn1WZ_WuVASK37go_ljFAdxhDVkTu11ZLIVxcTpY9uaxvDTeSB5s-X2E3O7sQcMr-jkIhlM0i2axj3LAcVKj98_0Ql6ibCway5TUjP19DUb_CIf0tUu4m0Cd5Mxw0_v_mYv5JX8YR_iLISrgBGu4VHANz8wX9EVrzWuKH15KA3rulwo2jPbbwK46JAxfovaLUTbyDK5Oar5RdlCp9zXWN2P8rp7WJrpDsMLyI-7KrbYrXFLuehfYDd0-SHuCNXu2JcLICpm-3I",
};

// Featured cards data (same as original Home page)
const FEATURED = [
  { title: "GitHub", desc: "全球最大的代码托管平台", img: IMAGES.GITHUB, iconBg: "bg-black", imgClass: "size-6 invert" },
  { title: "Figma", desc: "在线协作界面设计工具", img: IMAGES.FIGMA, iconBg: "bg-[#F24E1E]", imgClass: "size-6 brightness-0 invert" },
  { title: "YouTube", desc: "视频、音乐和直播", icon: "play_arrow", iconBg: "bg-[#FF0000]" },
  { title: "Gmail", desc: "安全、智能且易用的电子邮件", icon: "mail", iconBg: "bg-blue-600" },
];

const DEV_CARDS = [
  { title: "VS Code Web", desc: "基于浏览器的编辑器", img: IMAGES.VSCODE, icon: "", iconColor: "", iconBg: "bg-slate-100" },
  { title: "Stack Overflow", desc: "开发者问答社区", img: IMAGES.STACKOVERFLOW, icon: "", iconColor: "", iconBg: "bg-slate-100" },
  { title: "React Docs", desc: "UI 库文档", img: IMAGES.REACT, icon: "", iconColor: "", iconBg: "bg-slate-100" },
  { title: "AWS Console", desc: "云管理控制台", img: "", icon: "dns", iconColor: "text-orange-500", iconBg: "bg-slate-100" },
  { title: "Tailwind CSS", desc: "原子化 CSS 框架", img: IMAGES.TAILWIND, icon: "", iconColor: "", iconBg: "bg-slate-100" },
  { title: "HackerNews", desc: "科技新闻聚合", img: "", icon: "terminal", iconColor: "text-green-500", iconBg: "bg-slate-100" },
];

const DESIGN_CARDS = [
  { title: "Dribbble", desc: "设计灵感", icon: "palette", iconColor: "text-pink-500", iconBg: "bg-pink-100" },
  { title: "Unsplash", desc: "免费库存照片", icon: "image", iconColor: "text-blue-500", iconBg: "bg-blue-100" },
  { title: "Behance", desc: "创意作品集", icon: "auto_awesome", iconColor: "text-purple-500", iconBg: "bg-purple-100" },
  { title: "Google Fonts", desc: "字体资源", icon: "font_download", iconColor: "text-red-500", iconBg: "bg-red-100" },
];

export default async function HomePage() {
  // Fetch total site count from DB for display
  const { rows } = await pool.query('SELECT count(*) as total FROM sites');
  const _siteCount = rows[0].total;

  return (
    <div className="flex-1 overflow-y-auto w-full bg-background-light">
      <div className="max-w-[1200px] mx-auto w-full px-6 py-8 flex flex-col gap-8">

        {/* Search Bar */}
        <section className="flex justify-center w-full mb-4">
          <div className="w-full max-w-2xl relative">
            <label className="flex flex-col w-full group relative z-10">
              <div className="flex w-full items-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 h-14 overflow-hidden focus-within:ring-2 focus-within:ring-primary transition-shadow">
                <div className="flex items-center justify-center pl-5 pr-3 text-slate-400">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input
                  className="w-full h-full bg-transparent border-none focus:ring-0 text-base text-slate-900 placeholder:text-slate-400 font-normal focus:outline-none"
                  placeholder="搜索谷歌或输入网址..."
                  type="text"
                />
                <div className="pr-2 flex items-center gap-1">
                  <button className="size-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>mic</span>
                  </button>
                  <button className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs font-medium mr-2">⌘K</button>
                </div>
              </div>
            </label>
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-20 blur-lg -z-10 group-focus-within:opacity-40 transition-opacity"></div>
          </div>
        </section>

        {/* Most Visited */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-900 text-xl font-bold tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 filled">bolt</span>
              常用访问
            </h2>
            <button className="text-sm text-primary hover:text-blue-600 font-medium hover:underline">自定义</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURED.map((item) => (
              <a key={item.title} href="#" className="group flex flex-col p-4 rounded-xl bg-white border border-slate-200 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div className={`size-10 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0 overflow-hidden`}>
                    {item.img ? (
                      <img src={item.img} alt={item.title} className={item.imgClass} />
                    ) : (
                      <span className="material-symbols-outlined text-white">{item.icon}</span>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-[20px]">arrow_outward</span>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-slate-900 font-semibold text-base group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="text-slate-500 text-sm mt-1 truncate">{item.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Development */}
        <section className="flex flex-col gap-4">
          <h2 className="text-slate-900 text-lg font-bold tracking-tight px-1">开发</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {DEV_CARDS.map((item) => (
              <a key={item.title} href="#" className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200 hover:border-primary/50 hover:shadow-sm transition-all group">
                <div className={`size-9 rounded ${item.iconBg || 'bg-slate-100'} flex items-center justify-center shrink-0`}>
                  {item.img ? (
                    <img src={item.img} alt={item.title} className="size-5" />
                  ) : (
                    <span className={`material-symbols-outlined ${item.iconColor} text-[20px]`}>{item.icon}</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-primary truncate">{item.title}</span>
                  <span className="text-xs text-slate-500 truncate">{item.desc}</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Design */}
        <section className="flex flex-col gap-4">
          <h2 className="text-slate-900 text-lg font-bold tracking-tight px-1">设计</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {DESIGN_CARDS.map((item) => (
              <a key={item.title} href="#" className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200 hover:border-primary/50 hover:shadow-sm transition-all group">
                <div className={`size-9 rounded ${item.iconBg || 'bg-slate-100'} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined ${item.iconColor} text-[20px]`}>{item.icon}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-primary truncate">{item.title}</span>
                  <span className="text-xs text-slate-500 truncate">{item.desc}</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="w-full py-6 text-center text-slate-400 text-xs">
          <p>&copy; 2024 通用站点导航。保留所有权利。</p>
        </div>
      </div>
    </div>
  );
}
