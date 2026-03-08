'use client';

import React, { useEffect, useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdministrativeDivisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitorId: string;
}

type SearchMode = 'online' | 'local';

// Online (Baidu) types
interface RegionSearchItem {
  uid: string;
  name: string;
  location: { lat: number | null; lng: number | null };
  street_id: string;
  detail: number;
  province: string;
  city: string;
  area: string;
  town: string;
  town_code: string;
  address: string;
}

interface RegionSearchResponse {
  status: number;
  message: string;
  resultType: string;
  queryType: string;
  total: number;
  items: RegionSearchItem[];
}

// Local DB types
interface DivisionListItem {
  level: number;
  code: string;
  name_zh: string;
  name_en: string;
  full_name_zh: string;
  has_children: boolean;
  parent_level: number | null;
  parent_code: string | null;
}

interface DivisionNode extends DivisionListItem {
  province_code: string;
  city_code: string | null;
  county_code: string | null;
  town_code: string | null;
  full_name_en: string;
}

interface LocalSearchResponse {
  total: number;
  items: DivisionListItem[];
}

interface DetailResponse {
  node: DivisionNode;
  ancestors: DivisionListItem[];
  children: DivisionListItem[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LEVEL_NAMES: Record<number, string> = {
  1: '省/直辖市',
  2: '市/地级',
  3: '区/县',
  4: '街道/乡镇',
};

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-blue-100 text-blue-700',
  4: 'bg-green-100 text-green-700',
};

const PROVINCES = [
  '北京市', '天津市', '上海市', '重庆市', '河北省', '山西省', '辽宁省', '吉林省',
  '黑龙江省', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省', '河南省',
  '湖北省', '湖南省', '广东省', '海南省', '四川省', '贵州省', '云南省', '陕西省',
  '甘肃省', '青海省', '台湾省', '内蒙古自治区', '广西壮族自治区', '西藏自治区',
  '宁夏回族自治区', '新疆维吾尔自治区', '香港特别行政区', '澳门特别行政区',
];

const LEVEL_OPTIONS = [
  { value: 4, label: '街道/乡镇' },
  { value: 3, label: '区/县' },
  { value: 2, label: '市/地级' },
  { value: 1, label: '省/直辖市' },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AdministrativeDivisionModal({
  isOpen,
  onClose,
  visitorId,
}: AdministrativeDivisionModalProps) {
  const [mode, setMode] = useState<SearchMode>('online');

  // Shared
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  // Online-specific
  const [province, setProvince] = useState('');
  const [onlineItems, setOnlineItems] = useState<RegionSearchItem[]>([]);
  const [selectedOnlineItem, setSelectedOnlineItem] = useState<RegionSearchItem | null>(null);
  const [responseMeta, setResponseMeta] = useState<Omit<RegionSearchResponse, 'items'>>({
    status: 0, message: '', resultType: '', queryType: '', total: 0,
  });

  // Local-specific
  const [level, setLevel] = useState(4);
  const [localItems, setLocalItems] = useState<DivisionListItem[]>([]);
  const [detail, setDetail] = useState<DetailResponse | null>(null);

  // ── Keyboard ──
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // ── Reset on close ──
  useEffect(() => {
    if (isOpen) return;
    setKeyword('');
    setProvince('');
    setLevel(4);
    setOnlineItems([]);
    setSelectedOnlineItem(null);
    setResponseMeta({ status: 0, message: '', resultType: '', queryType: '', total: 0 });
    setLocalItems([]);
    setDetail(null);
    setIsLoading(false);
    setError('');
    setHasSearched(false);
    setCopiedCode('');
  }, [isOpen]);

  // ── Reset search state on mode switch ──
  const handleModeSwitch = (next: SearchMode) => {
    if (next === mode) return;
    setMode(next);
    setKeyword('');
    setProvince('');
    setLevel(4);
    setOnlineItems([]);
    setSelectedOnlineItem(null);
    setResponseMeta({ status: 0, message: '', resultType: '', queryType: '', total: 0 });
    setLocalItems([]);
    setDetail(null);
    setError('');
    setHasSearched(false);
    setCopiedCode('');
  };

  const handleCopy = async (code: string) => {
    try {
      await copyText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((p) => (p === code ? '' : p)), 1500);
    } catch { /* ignore */ }
  };

  // ── Online search ──
  const handleOnlineSearch = async () => {
    const query = keyword.trim();
    const region = province.trim();
    setHasSearched(true);
    if (!region) { setError('请先选择省份'); setOnlineItems([]); return; }
    if (!query) { setError('请输入关键词'); setOnlineItems([]); return; }
    setIsLoading(true);
    setError('');
    setSelectedOnlineItem(null);
    try {
      const params = new URLSearchParams({ query, region, sid: visitorId, page: 'home' });
      const res = await fetch(`/api/regions/search?${params}`, { cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as Partial<RegionSearchResponse> & { error?: string };
      if (!res.ok) throw new Error(data.error || '查询失败');
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setOnlineItems(nextItems);
      setResponseMeta({
        status: Number(data.status) || 0,
        message: data.message || '',
        resultType: data.resultType || '',
        queryType: data.queryType || '',
        total: Number(data.total) || nextItems.length,
      });
    } catch (err) {
      setOnlineItems([]);
      setResponseMeta({ status: 0, message: '', resultType: '', queryType: '', total: 0 });
      setError((err as Error).message || '查询失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Local search ──
  const handleLocalSearch = async () => {
    const trimmed = keyword.trim();
    setHasSearched(true);
    if (!trimmed) { setError('请输入关键词'); setLocalItems([]); return; }
    setIsLoading(true);
    setError('');
    setDetail(null);
    try {
      const params = new URLSearchParams({ keyword: trimmed, level: String(level), limit: '80', sid: visitorId, page: 'home' });
      const res = await fetch(`/api/admin-divisions?${params}`, { cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as Partial<LocalSearchResponse> & { error?: string };
      if (!res.ok) throw new Error(data.error || '查询失败');
      setLocalItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setLocalItems([]);
      setError((err as Error).message || '查询失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = async (nextLevel: number, code: string) => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ detail_level: String(nextLevel), detail_code: code });
      const res = await fetch(`/api/admin-divisions?${params}`, { cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as Partial<DetailResponse> & { error?: string };
      if (!res.ok || !data.node) throw new Error(data.error || '详情查询失败');
      setDetail({
        node: data.node,
        ancestors: Array.isArray(data.ancestors) ? data.ancestors : [],
        children: Array.isArray(data.children) ? data.children : [],
      });
    } catch (err) {
      setError((err as Error).message || '详情查询失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = mode === 'online' ? handleOnlineSearch : handleLocalSearch;

  if (!isOpen) return null;

  // ── Online detail view ──
  const renderOnlineDetail = () => {
    if (!selectedOnlineItem) return null;
    const tc = selectedOnlineItem.town_code;
    const divisionChain = tc
      ? [
          { level: 1, name: selectedOnlineItem.province, code: tc.slice(0, 2) },
          { level: 2, name: selectedOnlineItem.city, code: tc.slice(0, 4) },
          { level: 3, name: selectedOnlineItem.area, code: tc.slice(0, 6) },
          { level: 4, name: selectedOnlineItem.town, code: tc },
        ].filter((d) => d.name)
      : [];

    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setSelectedOnlineItem(null)} className="inline-flex items-center gap-1.5 text-base text-primary hover:opacity-80">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          返回列表
        </button>

        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <h4 className="text-xl font-semibold text-slate-900 break-words">{selectedOnlineItem.name || '-'}</h4>
          <p className="mt-2 text-base text-slate-700 break-words">
            <span className="font-medium text-slate-800">详细地址：</span>
            {selectedOnlineItem.address || '-'}
          </p>
        </div>

        {divisionChain.length > 0 && (
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[18px] text-slate-400">account_tree</span>
              <p className="text-sm text-slate-500 font-medium">行政区划代码</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {divisionChain.map((div, idx) => (
                <React.Fragment key={div.code}>
                  {idx > 0 && <span className="text-slate-300 text-base">›</span>}
                  <button onClick={() => handleCopy(div.code)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors group" title="点击复制代码">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${LEVEL_COLORS[div.level] || 'bg-gray-100 text-gray-700'}`}>
                      {LEVEL_NAMES[div.level]}
                    </span>
                    <span className="text-base font-medium text-slate-800">{div.name}</span>
                    {copiedCode === div.code ? (
                      <span className="text-sm text-green-600 font-semibold">{div.code}</span>
                    ) : (
                      <span className="text-sm font-mono text-slate-500 group-hover:text-primary">{div.code}</span>
                    )}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-sm text-slate-500">纬度 (lat)</p>
            <p className="mt-1 text-lg font-mono text-slate-800">{selectedOnlineItem.location.lat ?? '-'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-sm text-slate-500">经度 (lng)</p>
            <p className="mt-1 text-lg font-mono text-slate-800">{selectedOnlineItem.location.lng ?? '-'}</p>
          </div>
        </div>
      </div>
    );
  };

  // ── Online list ──
  const renderOnlineList = () => {
    if (!hasSearched) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[48px] mb-3 text-slate-300">location_city</span>
          <p className="text-sm">请选择省份并输入关键词</p>
          <p className="text-xs mt-1 text-slate-300">示例：维港半岛</p>
        </div>
      );
    }
    if (isLoading) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[36px] mb-3 animate-spin">progress_activity</span>
          <p className="text-sm">查询中...</p>
        </div>
      );
    }
    if (error) return <div className="py-16 text-center text-red-500 text-sm">{error}</div>;
    if (onlineItems.length === 0) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[48px] mb-3 text-slate-300">search_off</span>
          <p className="text-sm">没有找到匹配结果</p>
          <p className="text-xs mt-1 text-slate-300">请尝试更换关键词或省份</p>
        </div>
      );
    }
    return (
      <div>
        <div className="px-1 mb-3 flex flex-wrap items-center gap-2">
          <p className="text-xs text-slate-500">
            找到 <span className="font-semibold text-slate-900">{onlineItems.length}</span> 条结果
          </p>
          {responseMeta.queryType && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">query_type: {responseMeta.queryType}</span>
          )}
          {responseMeta.resultType && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">result_type: {responseMeta.resultType}</span>
          )}
        </div>
        <div className="space-y-3">
          {onlineItems.map((item, index) => {
            const regionText = [item.province, item.city, item.area, item.town].filter(Boolean).join(' / ') || '-';
            return (
              <div key={`${item.uid || item.name}-${index}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-primary/30 hover:bg-primary/5 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 break-words">{item.name || '-'}</p>
                    <p className="mt-1 text-xs text-slate-500 break-words">行政区域：{regionText}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedOnlineItem(item)} className="shrink-0 px-3 h-8 rounded-lg border border-slate-200 text-xs text-slate-700 hover:text-primary hover:border-primary/40 transition-colors">
                    查看详情
                  </button>
                </div>
                <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-400">地址</p>
                  <p className="text-sm text-slate-700 break-words">{item.address || '-'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Local detail view ──
  const renderLocalDetail = () => {
    if (!detail) return null;
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setDetail(null)} className="inline-flex items-center gap-1.5 text-base text-primary hover:opacity-80">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          返回列表
        </button>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${LEVEL_COLORS[detail.node.level] || 'bg-slate-100 text-slate-700'}`}>
              {LEVEL_NAMES[detail.node.level] || `L${detail.node.level}`}
            </span>
            <h4 className="text-lg font-semibold text-slate-900 break-words">{detail.node.name_zh}</h4>
          </div>
          <p className="mt-2 text-sm text-slate-600 break-words">{detail.node.full_name_zh || '-'}</p>
          <button type="button" onClick={() => handleCopy(detail.node.code)} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:text-primary hover:border-primary/40 transition-colors">
            <span className="material-symbols-outlined text-[16px]">content_copy</span>
            {copiedCode === detail.node.code ? '已复制' : `代码 ${detail.node.code}`}
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[18px] text-slate-400">account_tree</span>
            <p className="text-sm text-slate-500 font-medium">上级链路</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {detail.ancestors.map((item, index) => (
              <React.Fragment key={`${item.level}-${item.code}`}>
                {index > 0 && <span className="text-slate-300 text-base">›</span>}
                <button type="button" onClick={() => handleOpenDetail(item.level, item.code)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${LEVEL_COLORS[item.level] || 'bg-slate-100 text-slate-700'}`}>
                    {LEVEL_NAMES[item.level] || `L${item.level}`}
                  </span>
                  <span className="text-sm text-slate-800">{item.name_zh}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[18px] text-slate-400">nearby</span>
            <p className="text-sm text-slate-500 font-medium">下级区域</p>
          </div>
          {detail.children.length === 0 ? (
            <p className="text-sm text-slate-400">当前区域没有下级可选。</p>
          ) : (
            <div className="space-y-2">
              {detail.children.map((child) => (
                <div key={`${child.level}-${child.code}`} className="rounded-lg border border-slate-200 px-3 py-2.5 hover:border-primary/30 hover:bg-primary/5 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 break-words">{child.name_zh}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{child.code}</p>
                    </div>
                    <button type="button" onClick={() => handleOpenDetail(child.level, child.code)} className="shrink-0 px-3 h-8 rounded-lg border border-slate-200 text-xs text-slate-700 hover:text-primary hover:border-primary/40 transition-colors">
                      查看详情
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Local list ──
  const renderLocalList = () => {
    if (!hasSearched) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[48px] mb-3 text-slate-300">account_tree</span>
          <p className="text-sm">输入关键词搜索本地行政区</p>
          <p className="text-xs mt-1 text-slate-300">示例：合作路、东里、新华区</p>
        </div>
      );
    }
    if (isLoading) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[36px] mb-3 animate-spin">progress_activity</span>
          <p className="text-sm">查询中...</p>
        </div>
      );
    }
    if (error) return <div className="py-16 text-center text-red-500 text-sm">{error}</div>;
    if (localItems.length === 0) {
      return (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <span className="material-symbols-outlined text-[48px] mb-3 text-slate-300">search_off</span>
          <p className="text-sm">没有找到匹配结果</p>
          <p className="text-xs mt-1 text-slate-300">请尝试更换关键词</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500 px-1">
          找到 <span className="font-semibold text-slate-900">{localItems.length}</span> 条结果
        </p>
        {localItems.map((item) => (
          <div key={`${item.level}-${item.code}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-primary/30 hover:bg-primary/5 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${LEVEL_COLORS[item.level] || 'bg-slate-100 text-slate-700'}`}>
                    {LEVEL_NAMES[item.level] || `L${item.level}`}
                  </span>
                  <p className="text-sm font-semibold text-slate-900 break-words">{item.name_zh}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500 break-words">{item.full_name_zh || '-'}</p>
                <p className="mt-1 text-xs font-mono text-slate-400">{item.code}</p>
              </div>
              <button type="button" onClick={() => handleOpenDetail(item.level, item.code)} className="shrink-0 px-3 h-8 rounded-lg border border-slate-200 text-xs text-slate-700 hover:text-primary hover:border-primary/40 transition-colors">
                查看详情
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── Content router ──
  const renderContent = () => {
    if (mode === 'online') {
      return selectedOnlineItem ? renderOnlineDetail() : renderOnlineList();
    }
    return detail ? renderLocalDetail() : renderLocalList();
  };

  // ── Search bar per mode ──
  const renderSearchBar = () => {
    if (mode === 'online') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)_auto] gap-3 mt-3">
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-colors"
          >
            <option value="">选择省份</option>
            {PROVINCES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              autoFocus={!selectedOnlineItem}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
              placeholder="输入地点关键词..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-colors"
            />
          </div>

          <button type="button" onClick={handleSearch} disabled={isLoading} className="h-[42px] px-4 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity">
            {isLoading ? '查询中...' : '查询'}
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)_auto] gap-3 mt-3">
        <select
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-colors"
        >
          {LEVEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            type="text"
            autoFocus={!detail}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
            placeholder="输入区域关键词..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-colors"
          />
        </div>

        <button type="button" onClick={handleSearch} disabled={isLoading} className="h-[42px] px-4 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity">
          {isLoading ? '查询中...' : '查询'}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-slate-900">行政区域查询</h3>
                <div className="flex items-center rounded-lg bg-slate-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('online')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      mode === 'online'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    在线查询
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('local')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      mode === 'local'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    本地查询
                  </button>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="关闭">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {renderSearchBar()}
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-4">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
