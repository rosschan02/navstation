'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

const COMMON_ICONS = [
  'code', 'terminal', 'data_object', 'api', 'bug_report', 'deployed_code', 'integration_instructions',
  'palette', 'brush', 'image', 'photo_camera', 'auto_awesome', 'colorize', 'gradient',
  'play_circle', 'videocam', 'headphones', 'music_note', 'movie', 'podcasts', 'live_tv',
  'forum', 'chat', 'group', 'person', 'share', 'thumb_up', 'favorite',
  'shopping_bag', 'shopping_cart', 'store', 'local_shipping', 'payments', 'sell', 'storefront',
  'article', 'menu_book', 'newspaper', 'feed', 'rss_feed', 'bookmark', 'library_books',
  'build', 'settings', 'tune', 'dashboard', 'analytics', 'insights', 'speed',
  'language', 'public', 'cloud', 'bolt', 'rocket_launch', 'star', 'explore',
  'search', 'link', 'download', 'upload', 'folder', 'attachment', 'extension',
  'sports_esports', 'videogame_asset', 'stadia_controller', 'casino',
  'school', 'science', 'calculate', 'psychology', 'lightbulb',
  'mail', 'call', 'video_call', 'send', 'notifications',
];

const BG_COLORS = [
  { value: 'bg-blue-100', labelKey: 'blue', preview: 'bg-blue-100' },
  { value: 'bg-purple-100', labelKey: 'purple', preview: 'bg-purple-100' },
  { value: 'bg-pink-100', labelKey: 'pink', preview: 'bg-pink-100' },
  { value: 'bg-red-100', labelKey: 'red', preview: 'bg-red-100' },
  { value: 'bg-orange-100', labelKey: 'orange', preview: 'bg-orange-100' },
  { value: 'bg-amber-100', labelKey: 'amber', preview: 'bg-amber-100' },
  { value: 'bg-green-100', labelKey: 'green', preview: 'bg-green-100' },
  { value: 'bg-teal-100', labelKey: 'teal', preview: 'bg-teal-100' },
  { value: 'bg-slate-100', labelKey: 'slate', preview: 'bg-slate-100' },
] as const;

const ICON_COLORS = [
  { value: 'text-blue-600', labelKey: 'blue', preview: 'bg-blue-600' },
  { value: 'text-purple-600', labelKey: 'purple', preview: 'bg-purple-600' },
  { value: 'text-pink-600', labelKey: 'pink', preview: 'bg-pink-600' },
  { value: 'text-red-600', labelKey: 'red', preview: 'bg-red-600' },
  { value: 'text-orange-600', labelKey: 'orange', preview: 'bg-orange-600' },
  { value: 'text-amber-600', labelKey: 'amber', preview: 'bg-amber-600' },
  { value: 'text-green-600', labelKey: 'green', preview: 'bg-green-600' },
  { value: 'text-teal-600', labelKey: 'teal', preview: 'bg-teal-600' },
  { value: 'text-slate-600', labelKey: 'slate', preview: 'bg-slate-600' },
] as const;

interface IconPickerProps {
  selectedIcon: string;
  selectedBg: string;
  selectedColor: string;
  onIconChange: (icon: string) => void;
  onBgChange: (bg: string) => void;
  onColorChange: (color: string) => void;
}

export function IconPicker({
  selectedIcon,
  selectedBg,
  selectedColor,
  onIconChange,
  onBgChange,
  onColorChange,
}: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllIcons, setShowAllIcons] = useState(false);
  const t = useTranslations('iconPicker');
  const colorT = useTranslations('iconPicker.colors');

  const filteredIcons = searchTerm
    ? COMMON_ICONS.filter((icon) => icon.includes(searchTerm.toLowerCase()))
    : showAllIcons
      ? COMMON_ICONS
      : COMMON_ICONS.slice(0, 24);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className={`size-14 rounded-xl ${selectedBg} flex items-center justify-center`}>
          <span className={`material-symbols-outlined ${selectedColor} text-[28px]`}>
            {selectedIcon || 'add'}
          </span>
        </div>
        <div className="text-sm text-slate-500">{t('preview')}</div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">{t('backgroundColor')}</label>
        <div className="flex flex-wrap gap-2">
          {BG_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => onBgChange(color.value)}
              className={`size-8 rounded-lg ${color.preview} transition-all ${
                selectedBg === color.value ? 'ring-2 ring-primary ring-offset-2' : 'hover:scale-110'
              }`}
              title={colorT(color.labelKey)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">{t('iconColor')}</label>
        <div className="flex flex-wrap gap-2">
          {ICON_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => onColorChange(color.value)}
              className={`size-8 rounded-lg ${color.preview} transition-all ${
                selectedColor === color.value ? 'ring-2 ring-primary ring-offset-2' : 'hover:scale-110'
              }`}
              title={colorT(color.labelKey)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">{t('selectIcon')}</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder={t('searchIcons')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1">
        {filteredIcons.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => onIconChange(icon)}
            className={`size-9 rounded-lg flex items-center justify-center transition-all ${
              selectedIcon === icon
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title={icon}
          >
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
          </button>
        ))}
      </div>

      {!searchTerm && !showAllIcons && COMMON_ICONS.length > 24 && (
        <button
          type="button"
          onClick={() => setShowAllIcons(true)}
          className="text-sm text-primary hover:underline"
        >
          {t('showAllIcons', { count: COMMON_ICONS.length })}
        </button>
      )}
    </div>
  );
}

export { COMMON_ICONS, BG_COLORS, ICON_COLORS };
