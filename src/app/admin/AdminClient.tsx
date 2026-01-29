'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { SiteData, Category } from '@/types';
import { IconPicker } from '@/components/IconPicker';

interface AdminClientProps {
  initialSites: SiteData[];
  categories: Category[];
}

export function AdminClient({ initialSites, categories }: AdminClientProps) {
  const router = useRouter();
  const [sites, setSites] = useState(initialSites);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteData | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [qrPreview, setQrPreview] = useState<string>('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    category_id: '',
    logo: '',
    icon: 'link',
    icon_bg: 'bg-slate-100',
    icon_color: 'text-slate-600',
    qr_image: '',
    tags: [] as string[],
    sort_order: 0,
    status: 'active' as 'active' | 'inactive',
  });

  const [tagInput, setTagInput] = useState('');

  // Get site categories only (not software)
  const siteCategories = categories.filter(c => c.type === 'site' || c.type === 'qrcode');

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      url: '',
      category_id: '',
      logo: '',
      icon: 'link',
      icon_bg: 'bg-slate-100',
      icon_color: 'text-slate-600',
      qr_image: '',
      tags: [],
      sort_order: 0,
      status: 'active',
    });
    setLogoPreview('');
    setQrPreview('');
    setTagInput('');
    setEditingSite(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (site: SiteData) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      description: site.description || '',
      url: site.url || '',
      category_id: site.category_id?.toString() || '',
      logo: site.logo || '',
      icon: site.icon || 'link',
      icon_bg: site.icon_bg || 'bg-slate-100',
      icon_color: site.icon_color || 'text-slate-600',
      qr_image: site.qr_image || '',
      tags: site.tags || [],
      sort_order: site.sort_order || 0,
      status: site.status || 'active',
    });
    setLogoPreview(site.logo || '');
    setQrPreview(site.qr_image || '');
    setIsModalOpen(true);
  };

  const handleFileUpload = async (file: File, type: 'logo' | 'qr') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Use the API path for serving
        const path = `/api/uploads/${type === 'qr' ? 'qr' : 'logos'}/${data.filename}`;
        if (type === 'logo') {
          setLogoPreview(path);
          setFormData(prev => ({ ...prev, logo: path }));
        } else {
          setQrPreview(path);
          setFormData(prev => ({ ...prev, qr_image: path }));
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('上传失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingSite ? `/api/sites/${editingSite.id}` : '/api/sites';
    const method = editingSite ? 'PUT' : 'POST';

    const payload = {
      ...formData,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
    };

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setIsModalOpen(false);
      resetForm();
      router.refresh();
      // Refresh local state
      const newSites = await fetch('/api/sites').then(r => r.json());
      setSites(newSites);
    } else {
      const data = await res.json();
      alert(data.error || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个站点吗？')) return;

    const res = await fetch(`/api/sites/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSites(sites.filter(s => s.id !== id));
      router.refresh();
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  // Filter sites
  const filteredSites = sites.filter(site => {
    if (filterCategory !== 'all' && site.category_id?.toString() !== filterCategory) return false;
    if (filterType !== 'all' && site.category_type !== filterType) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return site.name.toLowerCase().includes(query) ||
             site.description?.toLowerCase().includes(query) ||
             site.url?.toLowerCase().includes(query);
    }
    return true;
  });

  // Get selected category info for form
  const selectedCategory = categories.find(c => c.id.toString() === formData.category_id);
  const isQrCategory = selectedCategory?.type === 'qrcode';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
      <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">站点管理</h1>
            <p className="text-slate-500 mt-1">管理所有导航站点和二维码</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-primary/20 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>添加站点</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索站点名称、描述或链接..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">全部类型</option>
              <option value="site">普通站点</option>
              <option value="qrcode">二维码</option>
            </select>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">全部分类</option>
              {siteCategories.map(cat => (
                <option key={cat.id} value={cat.id.toString()}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-slate-500 text-sm">总数</p>
            <p className="text-2xl font-bold text-slate-900">{sites.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-slate-500 text-sm">普通站点</p>
            <p className="text-2xl font-bold text-slate-900">{sites.filter(s => s.category_type === 'site').length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-slate-500 text-sm">二维码</p>
            <p className="text-2xl font-bold text-slate-900">{sites.filter(s => s.category_type === 'qrcode').length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-slate-500 text-sm">筛选结果</p>
            <p className="text-2xl font-bold text-slate-900">{filteredSites.length}</p>
          </div>
        </div>

        {/* Sites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSites.map((site) => (
            <div
              key={site.id}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-3">
                {/* Icon/Logo */}
                <div className={`size-12 rounded-lg ${site.icon_bg || 'bg-slate-100'} flex items-center justify-center shrink-0 overflow-hidden`}>
                  {site.logo ? (
                    <img src={site.logo} alt={site.name} className="size-8 object-contain" />
                  ) : site.qr_image ? (
                    <span className="material-symbols-outlined text-slate-600 text-[24px]">qr_code_2</span>
                  ) : (
                    <span className={`material-symbols-outlined ${site.icon_color || 'text-slate-600'} text-[24px]`}>{site.icon || 'link'}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{site.name}</h3>
                  <p className="text-sm text-slate-500 truncate">{site.description || site.url || '无描述'}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(site)}
                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(site.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>

              {/* QR Image Preview */}
              {site.qr_image && (
                <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                  <img src={site.qr_image} alt="QR Code" className="w-full max-w-[120px] mx-auto" />
                </div>
              )}

              {/* Meta */}
              <div className="mt-3 flex flex-wrap gap-1">
                {site.category_label && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                    {site.category_label}
                  </span>
                )}
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  site.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {site.status === 'active' ? '活跃' : '停用'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredSites.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <span className="material-symbols-outlined text-[48px] mb-4">search_off</span>
            <p className="text-lg font-medium">没有找到匹配的站点</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <div className="px-6 py-5 border-b border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {editingSite ? '编辑站点' : '添加站点'}
                  </h3>
                </div>

                <div className="px-6 py-5 flex flex-col gap-5">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      分类 <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">选择分类</option>
                      {siteCategories.map(cat => (
                        <option key={cat.id} value={cat.id.toString()}>
                          {cat.label} ({cat.type === 'qrcode' ? '二维码' : '普通站点'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="站点名称"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      rows={2}
                      placeholder="简短描述"
                    />
                  </div>

                  {/* URL (not required for QR codes) */}
                  {!isQrCategory && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">链接</label>
                      <input
                        type="url"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="https://example.com"
                      />
                    </div>
                  )}

                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Logo</label>
                    <div className="flex items-center gap-4">
                      <div
                        onClick={() => logoInputRef.current?.click()}
                        className={`size-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
                          logoPreview ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50'
                        }`}
                      >
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="size-12 object-contain" />
                        ) : (
                          <span className="material-symbols-outlined text-slate-400">add_photo_alternate</span>
                        )}
                      </div>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'logo');
                        }}
                      />
                      <div className="text-sm text-slate-500">
                        <p>点击上传 Logo</p>
                        <p className="text-xs">支持 PNG, JPG, SVG</p>
                      </div>
                    </div>
                  </div>

                  {/* QR Image Upload (for QR category) */}
                  {isQrCategory && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        二维码图片 <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-4">
                        <div
                          onClick={() => qrInputRef.current?.click()}
                          className={`size-24 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
                            qrPreview ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50'
                          }`}
                        >
                          {qrPreview ? (
                            <img src={qrPreview} alt="QR Code" className="size-20 object-contain" />
                          ) : (
                            <span className="material-symbols-outlined text-slate-400 text-[32px]">qr_code_2</span>
                          )}
                        </div>
                        <input
                          ref={qrInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'qr');
                          }}
                        />
                        <div className="text-sm text-slate-500">
                          <p>点击上传二维码图片</p>
                          <p className="text-xs">支持 PNG, JPG</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Icon Picker (if no logo) */}
                  {!logoPreview && (
                    <div className="border-t border-slate-200 pt-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">或选择图标</label>
                      <IconPicker
                        selectedIcon={formData.icon}
                        selectedBg={formData.icon_bg}
                        selectedColor={formData.icon_color}
                        onIconChange={(icon) => setFormData({ ...formData, icon })}
                        onBgChange={(icon_bg) => setFormData({ ...formData, icon_bg })}
                        onColorChange={(icon_color) => setFormData({ ...formData, icon_color })}
                      />
                    </div>
                  )}

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">标签</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="输入标签后回车添加"
                      />
                      <button type="button" onClick={addTag} className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium hover:bg-slate-200">
                        添加
                      </button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {formData.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-xs">
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="text-slate-400 hover:text-red-500">
                              <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sort Order & Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">排序</label>
                      <input
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">状态</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="active">活跃</option>
                        <option value="inactive">停用</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg"
                  >
                    {editingSite ? '保存' : '添加'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
