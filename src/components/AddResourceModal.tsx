'use client';

import React, { useState } from 'react';
import { IconPicker } from './IconPicker';

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  currentPage: string;
}

const PAGE_LABELS: Record<string, string> = {
  dev: '开发工具',
  design: '设计资源',
  read: '阅读与资讯',
  fun: '娱乐媒体',
  shop: '购物',
};

export function AddResourceModal({ isOpen, onClose, onSaved, currentPage }: AddResourceModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState('');
  const [icon, setIcon] = useState('link');
  const [iconBg, setIconBg] = useState('bg-blue-100');
  const [iconColor, setIconColor] = useState('text-blue-600');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) return;

    setIsSubmitting(true);
    try {
      await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          url,
          icon,
          icon_bg: iconBg,
          icon_color: iconColor,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          page: currentPage,
          sort_order: 0,
        }),
      });

      // Reset form
      setTitle('');
      setDescription('');
      setUrl('');
      setTags('');
      setIcon('link');
      setIconBg('bg-blue-100');
      setIconColor('text-blue-600');

      onSaved();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-xl">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                  <span className="material-symbols-outlined text-green-600">add_circle</span>
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-semibold leading-6 text-slate-900" id="modal-title">
                    添加新资源到「{PAGE_LABELS[currentPage] || currentPage}」
                  </h3>

                  <div className="mt-4 flex flex-col gap-4">
                    {/* Title */}
                    <div>
                      <label htmlFor="resource-title" className="block text-sm font-medium text-slate-700">
                        资源名称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="resource-title"
                        required
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                        placeholder="例如：VS Code"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>

                    {/* URL */}
                    <div>
                      <label htmlFor="resource-url" className="block text-sm font-medium text-slate-700">
                        网站链接 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        id="resource-url"
                        required
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label htmlFor="resource-desc" className="block text-sm font-medium text-slate-700">
                        描述
                      </label>
                      <textarea
                        id="resource-desc"
                        rows={2}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                        placeholder="简短描述这个资源..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

                    {/* Tags */}
                    <div>
                      <label htmlFor="resource-tags" className="block text-sm font-medium text-slate-700">
                        标签
                      </label>
                      <input
                        type="text"
                        id="resource-tags"
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                        placeholder="用逗号分隔，例如：编辑器, 开源, 跨平台"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                      />
                    </div>

                    {/* Icon Picker */}
                    <div className="border-t border-slate-200 pt-4">
                      <IconPicker
                        selectedIcon={icon}
                        selectedBg={iconBg}
                        selectedColor={iconColor}
                        onIconChange={setIcon}
                        onBgChange={setIconBg}
                        onColorChange={setIconColor}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 sm:ml-3 sm:w-auto transition-colors disabled:opacity-50"
              >
                {isSubmitting ? '保存中...' : '保存资源'}
              </button>
              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-colors"
                onClick={onClose}
              >
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
