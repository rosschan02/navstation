'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { LocalizedSettingFields, SiteSettings } from '@/types';
import { useMessage } from '@/contexts/MessageContext';
import { TranslationEditor } from '@/components/TranslationEditor';
import { SUPPORTED_LOCALES, getLocaleDisplayName, type Locale } from '@/lib/i18n/config';

interface SettingsClientProps {
  initialSettings: SiteSettings;
}

function normalizeSettings(initialSettings: SiteSettings): SiteSettings {
  const translations = initialSettings.translations || {};
  const en = translations.en || {};

  return {
    ...initialSettings,
    site_name: en.site_name || initialSettings.site_name,
    site_description: en.site_description || initialSettings.site_description,
    site_version: en.site_version || initialSettings.site_version,
    footer_text: en.footer_text || initialSettings.footer_text,
    translations: {
      ...translations,
      en: {
        site_name: en.site_name || initialSettings.site_name,
        site_description: en.site_description || initialSettings.site_description,
        site_version: en.site_version || initialSettings.site_version,
        footer_text: en.footer_text || initialSettings.footer_text,
      },
    },
  };
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const router = useRouter();
  const message = useMessage();
  const [settings, setSettings] = useState<SiteSettings>(() => normalizeSettings(initialSettings));
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>(initialSettings.logo_url || '');
  const [iconPreview, setIconPreview] = useState<string>(initialSettings.site_icon_url || '');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: keyof SiteSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
      translations: key === 'logo_url' || key === 'site_icon_url'
        ? prev.translations
        : {
            ...prev.translations,
            en: {
              ...prev.translations?.en,
              [key]: value,
            },
          },
    }));
  };

  const handleTranslationChange = <K extends keyof LocalizedSettingFields>(
    locale: Locale,
    key: K,
    value: LocalizedSettingFields[K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      ...(locale === 'en' ? { [key]: value } : {}),
      translations: {
        ...prev.translations,
        [locale]: {
          ...prev.translations?.[locale],
          [key]: value,
        },
      },
    }));
  };

  const handleImageUpload = async (
    file: File,
    key: 'logo_url' | 'site_icon_url',
    setPreview: (value: string) => void
  ) => {
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
        setPreview(path);
        setSettings(prev => ({ ...prev, [key]: path }));
      } else {
        message.error('上传失败');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      message.error('上传失败');
    }
  };

  const handleRemoveImage = (
    key: 'logo_url' | 'site_icon_url',
    setPreview: (value: string) => void
  ) => {
    setPreview('');
    setSettings(prev => ({ ...prev, [key]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        message.success('设置已保存');
        router.refresh();
      } else {
        const data = await res.json();
        message.error(data.error || '保存失败');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      message.error('保存失败');
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

        <form onSubmit={handleSubmit} className="max-w-4xl">
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  默认语言
                </label>
                <select
                  value={settings.default_locale}
                  onChange={(e) => setSettings((prev) => ({
                    ...prev,
                    default_locale: e.target.value as Locale,
                  }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  {SUPPORTED_LOCALES.map((locale) => (
                    <option key={locale} value={locale}>
                      {getLocaleDisplayName(locale)} ({locale})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">访问根路径时，未命中浏览器语言或历史选择时会回退到这里。</p>
              </div>

              <TranslationEditor<LocalizedSettingFields>
                title="多语言内容"
                description="在同一页维护英文、中文、韩文、日文内容。英文字段会同步到默认值。"
                translations={settings.translations || {}}
                onChange={handleTranslationChange}
                fields={[
                  { key: 'site_name', label: '站点名称', placeholder: 'NavStation' },
                  { key: 'site_description', label: '站点描述', placeholder: 'Navigation portal', multiline: true },
                  { key: 'site_version', label: '版本号', placeholder: 'v2.0' },
                  { key: 'footer_text', label: '页脚版权', placeholder: '© 2024 NavStation. All rights reserved.' },
                ]}
              />
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
                      if (file) void handleImageUpload(file, 'logo_url', setLogoPreview);
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">点击上传 Logo</p>
                    <p className="text-xs text-slate-400">支持 PNG, JPG, SVG，建议 40x40px</p>
                  </div>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('logo_url', setLogoPreview)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">留空则使用默认火箭图标</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  站点图标
                </label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => iconInputRef.current?.click()}
                    className={`size-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
                      iconPreview ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50'
                    }`}
                  >
                    {iconPreview ? (
                      <img src={iconPreview} alt="站点图标" className="size-12 object-contain" />
                    ) : (
                      <span className="material-symbols-outlined text-slate-400">tab</span>
                    )}
                  </div>
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept=".ico,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleImageUpload(file, 'site_icon_url', setIconPreview);
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">点击上传浏览器站点图标</p>
                    <p className="text-xs text-slate-400">支持 ICO、PNG、SVG，建议正方形图标；浏览器可能会缓存旧图标</p>
                  </div>
                  {iconPreview && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('site_icon_url', setIconPreview)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">留空则继续使用默认 favicon.ico</p>
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
