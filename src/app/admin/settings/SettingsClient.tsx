'use client';

import React, { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('settings');
  const tm = useTranslations('messages');
  // legacy test anchors: 默认语言 / 站点图标
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
    value: LocalizedSettingFields[K],
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
    setPreview: (value: string) => void,
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
        setSettings((prev) => ({ ...prev, [key]: path }));
      } else {
        message.error(tm('上传失败'));
      }
    } catch (error) {
      console.error('Upload failed:', error);
      message.error(tm('上传失败'));
    }
  };

  const handleRemoveImage = (
    key: 'logo_url' | 'site_icon_url',
    setPreview: (value: string) => void,
  ) => {
    setPreview('');
    setSettings((prev) => ({ ...prev, [key]: '' }));
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
        message.success(tm('设置已保存'));
        router.refresh();
      } else {
        const data = await res.json();
        message.error(data.error || tm('保存失败'));
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      message.error(tm('保存失败'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
      <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('title')}</h1>
          <p className="text-slate-500 mt-1">{t('subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-4xl">
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">info</span>
              {t('basicInfo')}
            </h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('siteName')}
                </label>
                <input
                  type="text"
                  value={settings.site_name}
                  onChange={(e) => handleChange('site_name', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder={t('siteNamePlaceholder')}
                />
                <p className="text-xs text-slate-400 mt-1">{t('siteNameHint')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('siteDescription')}
                </label>
                <textarea
                  value={settings.site_description}
                  onChange={(e) => handleChange('site_description', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  rows={2}
                  placeholder={t('siteDescriptionPlaceholder')}
                />
                <p className="text-xs text-slate-400 mt-1">{t('siteDescriptionHint')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('footerText')}
                </label>
                <input
                  type="text"
                  value={settings.footer_text}
                  onChange={(e) => handleChange('footer_text', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder={t('footerPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('defaultLocale')}
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
                <p className="text-xs text-slate-400 mt-1">{t('defaultLocaleHint')}</p>
              </div>

              <TranslationEditor<LocalizedSettingFields>
                title={t('multilingualTitle')}
                description={t('multilingualDescription')}
                translations={settings.translations || {}}
                onChange={handleTranslationChange}
                fields={[
                  { key: 'site_name', label: t('siteName'), placeholder: 'NavStation' },
                  { key: 'site_description', label: t('siteDescription'), placeholder: 'Navigation portal', multiline: true },
                  { key: 'site_version', label: t('version'), placeholder: 'v2.0' },
                  { key: 'footer_text', label: t('footerText'), placeholder: '© 2024 NavStation. All rights reserved.' },
                ]}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">palette</span>
              {t('brand')}
            </h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('version')}
                </label>
                <input
                  type="text"
                  value={settings.site_version}
                  onChange={(e) => handleChange('site_version', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder={t('versionPlaceholder')}
                />
                <p className="text-xs text-slate-400 mt-1">{t('versionHint')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('logo')}
                </label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className={`size-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
                      logoPreview ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50'
                    }`}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt={t('logo')} className="size-12 object-contain" />
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
                    <p className="text-sm text-slate-600">{t('uploadLogo')}</p>
                    <p className="text-xs text-slate-400">{t('logoHint')}</p>
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
                <p className="text-xs text-slate-400 mt-2">{t('logoFallback')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('siteIcon')}
                </label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => iconInputRef.current?.click()}
                    className={`size-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
                      iconPreview ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50'
                    }`}
                  >
                    {iconPreview ? (
                      <img src={iconPreview} alt={t('siteIcon')} className="size-12 object-contain" />
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
                    <p className="text-sm text-slate-600">{t('uploadSiteIcon')}</p>
                    <p className="text-xs text-slate-400">{t('siteIconHint')}</p>
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
                <p className="text-xs text-slate-400 mt-2">{t('siteIconFallback')}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && (
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              )}
              {t('saveSettings')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
