'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Category } from '@/types';

interface AddSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddSiteModal({ isOpen, onClose, onSaved }: AddSiteModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/categories')
        .then(res => res.json())
        .then(setCategories)
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setIconPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;

    await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        url,
        category_id: categoryId ? parseInt(categoryId) : null,
        icon: iconPreview || '',
        status: 'active',
      }),
    });

    setName('');
    setUrl('');
    setCategoryId('');
    setIconPreview(null);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <span className="material-symbols-outlined text-blue-600">add_link</span>
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-semibold leading-6 text-slate-900" id="modal-title">添加新站点</h3>
                  <div className="mt-4 flex flex-col gap-4">
                    <div>
                      <label htmlFor="site-name" className="block text-sm font-medium text-slate-700">站点名称</label>
                      <input
                        type="text"
                        id="site-name"
                        required
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                        placeholder="例如：Google"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="site-url" className="block text-sm font-medium text-slate-700">网站链接 (URL)</label>
                      <input
                        type="url"
                        id="site-url"
                        required
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="site-category" className="block text-sm font-medium text-slate-700">分类</label>
                      <select
                        id="site-category"
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                      >
                        <option value="">请选择分类</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">站点图标</label>
                      <div className="mt-1 flex items-center gap-4">
                        <div className="size-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                          {iconPreview ? (
                            <img src={iconPreview} alt="Preview" className="size-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-slate-400">image</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                        >
                          上传图片
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                          accept="image/*"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="submit"
                className="inline-flex w-full justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 sm:ml-3 sm:w-auto transition-colors"
              >
                保存站点
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
