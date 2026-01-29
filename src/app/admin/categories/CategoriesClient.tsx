'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@/types';
import { IconPicker } from '@/components/IconPicker';

// CSS class presets for category badges
const CSS_CLASS_PRESETS = [
  { value: 'bg-blue-100 text-blue-800', label: '蓝色' },
  { value: 'bg-purple-100 text-purple-800', label: '紫色' },
  { value: 'bg-pink-100 text-pink-800', label: '粉色' },
  { value: 'bg-red-100 text-red-800', label: '红色' },
  { value: 'bg-orange-100 text-orange-800', label: '橙色' },
  { value: 'bg-amber-100 text-amber-800', label: '琥珀' },
  { value: 'bg-green-100 text-green-800', label: '绿色' },
  { value: 'bg-teal-100 text-teal-800', label: '青色' },
  { value: 'bg-slate-100 text-slate-800', label: '灰色' },
];

interface CategoriesClientProps {
  initialCategories: Category[];
}

export function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    css_class: 'bg-blue-100 text-blue-800',
    icon: 'folder',
    icon_bg: 'bg-blue-100',
    icon_color: 'text-blue-600',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      label: '',
      css_class: 'bg-blue-100 text-blue-800',
      icon: 'folder',
      icon_bg: 'bg-blue-100',
      icon_color: 'text-blue-600',
    });
    setEditingCategory(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      label: category.label,
      css_class: category.css_class || 'bg-blue-100 text-blue-800',
      icon: category.icon || 'folder',
      icon_bg: category.icon_bg || 'bg-blue-100',
      icon_color: category.icon_color || 'text-blue-600',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingCategory
      ? `/api/categories/${editingCategory.id}`
      : '/api/categories';
    const method = editingCategory ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setIsModalOpen(false);
      resetForm();
      router.refresh();
      // Refresh local state
      const newCategories = await fetch('/api/categories').then(r => r.json());
      setCategories(newCategories);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });

    if (res.ok) {
      setDeleteConfirm(null);
      router.refresh();
      setCategories(categories.filter(c => c.id !== id));
    } else {
      const data = await res.json();
      alert(data.error || '删除失败');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
      <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex mb-6">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <a href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary">
                <span className="material-symbols-outlined text-[18px] mr-2">home</span>
                仪表盘
              </a>
            </li>
            <li>
              <div className="flex items-center">
                <span className="material-symbols-outlined text-slate-400 text-sm mx-1">chevron_right</span>
                <span className="ml-1 text-sm font-medium text-slate-900 md:ml-2">分类管理</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">分类管理</h1>
            <p className="text-slate-500 mt-1">管理站点和资源的分类标签</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>添加分类</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 rounded-lg text-primary">
                <span className="material-symbols-outlined text-[24px]">category</span>
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium">分类总数</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{categories.length}</h3>
          </div>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`size-12 rounded-lg ${category.icon_bg || 'bg-slate-100'} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined ${category.icon_color || 'text-slate-600'} text-[24px]`}>
                    {category.icon || 'folder'}
                  </span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(category)}
                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(category.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 mb-1">{category.label}</h3>
              <p className="text-sm text-slate-500 mb-3">{category.name}</p>

              <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${category.css_class || 'bg-slate-100 text-slate-800'}`}>
                标签样式
              </span>
            </div>
          ))}

          {/* Add New Card */}
          <div
            onClick={openAddModal}
            className="flex flex-col items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-slate-100 transition-all cursor-pointer p-6 min-h-[180px] text-slate-400 hover:text-primary group"
          >
            <div className="size-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
              <span className="material-symbols-outlined text-[24px]">add</span>
            </div>
            <span className="font-medium">添加新分类</span>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                      <span className="material-symbols-outlined text-blue-600">
                        {editingCategory ? 'edit' : 'add'}
                      </span>
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg font-semibold leading-6 text-slate-900">
                        {editingCategory ? '编辑分类' : '添加新分类'}
                      </h3>

                      <div className="mt-4 flex flex-col gap-4">
                        {/* Name */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700">
                            分类标识 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                            placeholder="例如：Developer Tools"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                          <p className="mt-1 text-xs text-slate-500">英文标识，用于系统识别</p>
                        </div>

                        {/* Label */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700">
                            显示名称 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                            placeholder="例如：开发工具"
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                          />
                        </div>

                        {/* CSS Class Preset */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">标签样式</label>
                          <div className="flex flex-wrap gap-2">
                            {CSS_CLASS_PRESETS.map((preset) => (
                              <button
                                key={preset.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, css_class: preset.value })}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${preset.value} ${
                                  formData.css_class === preset.value ? 'ring-2 ring-primary ring-offset-2' : ''
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Icon Picker */}
                        <div className="border-t border-slate-200 pt-4">
                          <IconPicker
                            selectedIcon={formData.icon}
                            selectedBg={formData.icon_bg}
                            selectedColor={formData.icon_color}
                            onIconChange={(icon) => setFormData({ ...formData, icon })}
                            onBgChange={(icon_bg) => setFormData({ ...formData, icon_bg })}
                            onColorChange={(icon_color) => setFormData({ ...formData, icon_color })}
                          />
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
                    {editingCategory ? '保存修改' : '创建分类'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-colors"
                    onClick={() => setIsModalOpen(false)}
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />

          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <span className="material-symbols-outlined text-red-600">warning</span>
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-lg font-semibold leading-6 text-slate-900">确认删除</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      确定要删除这个分类吗？如果该分类下有站点，将无法删除。
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirm)}
                  className="inline-flex w-full justify-center rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 sm:ml-3 sm:w-auto transition-colors"
                >
                  确认删除
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-colors"
                  onClick={() => setDeleteConfirm(null)}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
