'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { SiteSettings } from '@/types';

interface SettingsClientProps {
  initialSettings: SiteSettings;
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(initialSettings.logo_url || '');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: keyof SiteSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'logo');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const path = `/api/uploads/logos/${data.filename}`;
        setLogoPreview(path);
        setSettings(prev => ({ ...prev, logo_url: path }));
      } else {
        setMessage({ type: 'error', text: '上传失败' });
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setMessage({ type: 'error', text: '上传失败' });
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setSettings(prev => ({ ...prev, logo_url: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: '设置已保存' });
        router.refresh();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || '保存失败' });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
      <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">站点设置</h1>
          <p className="text-slate-500 mt-1">自定义站点名称、描述、Logo 等全局配置</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">
                {message.type === 'success' ? 'check_circle' : 'error'}
              </span>
              {message.text}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-2xl">
          {/* 基础信息 */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">info</span>
              基础信息
            </h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  站点名称
                </label>
                <input
                  type="text"
                  value={settings.site_name}
                  onChange={(e) => handleChange('site_name', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="导航站"
                />
                <p className="text-xs text-slate-400 mt-1">显示在侧边栏和浏览器标签页</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  站点描述
                </label>
                <textarea
                  value={settings.site_description}
                  onChange={(e) => handleChange('site_description', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  rows={2}
                  placeholder="综合导航门户与站点管理仪表板"
                />
                <p className="text-xs text-slate-400 mt-1">用于 SEO 描述</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  页脚版权
                </label>
                <input
                  type="text"
                  value={settings.footer_text}
                  onChange={(e) => handleChange('footer_text', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="© 2024 通用站点导航。保留所有权利。"
                />
              </div>
            </div>
          </div>

          {/* 品牌设置 */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">palette</span>
              品牌设置
            </h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  版本号
                </label>
                <input
                  type="text"
                  value={settings.site_version}
                  onChange={(e) => handleChange('site_version', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="v2.0 中文版"
                />
                <p className="text-xs text-slate-400 mt-1">显示在侧边栏站点名称下方</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Logo
                </label>
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
                      if (file) handleLogoUpload(file);
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">点击上传 Logo</p>
                    <p className="text-xs text-slate-400">支持 PNG, JPG, SVG，建议 40x40px</p>
                  </div>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">留空则使用默认火箭图标</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && (
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              )}
              保存设置
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
