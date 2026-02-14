'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IconPicker } from '@/components/IconPicker';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { SoftwareItem, Category } from '@/types';
import { useMessage } from '@/contexts/MessageContext';

interface SoftwareAdminClientProps {
  initialSoftware: SoftwareItem[];
  categories: Category[];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function SoftwareAdminClient({ initialSoftware, categories }: SoftwareAdminClientProps) {
  const message = useMessage();
  const [software, setSoftware] = useState<SoftwareItem[]>(initialSoftware);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SoftwareItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<SoftwareItem | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    version: '',
    category_id: categories.length > 0 ? categories[0].id.toString() : '',
    logo: '',
    icon: 'download',
    icon_bg: 'bg-blue-100',
    icon_color: 'text-blue-600',
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    version: '',
    category_id: '',
    logo: '',
    icon: 'download',
    icon_bg: 'bg-blue-100',
    icon_color: 'text-blue-600',
  });
  const [logoPreview, setLogoPreview] = useState('');
  const [editLogoPreview, setEditLogoPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const editLogoInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleLogoUpload = async (file: File, isEdit: boolean = false) => {
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('type', 'logo');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      });

      if (res.ok) {
        const data = await res.json();
        // Use the path returned by the upload API which points to /api/uploads/logos/
        const logoPath = `/api/uploads/logos/${data.filename}`;
        if (isEdit) {
          setEditLogoPreview(logoPath);
          setEditFormData(prev => ({ ...prev, logo: logoPath }));
        } else {
          setLogoPreview(logoPath);
          setFormData(prev => ({ ...prev, logo: logoPath }));
        }
        message.success('Logo 上传成功');
      } else {
        message.error('Logo 上传失败');
      }
    } catch (error) {
      console.error('Logo upload failed:', error);
      message.error('Logo 上传失败');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (4GB limit)
      const maxSize = 4 * 1024 * 1024 * 1024;
      if (file.size > maxSize) {
        message.warning('文件大小超过 4GB 限制');
        return;
      }
      setSelectedFile(file);
      // Auto-fill name from filename if empty
      if (!formData.name) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setFormData(prev => ({ ...prev, name: nameWithoutExt }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      message.warning('请选择要上传的文件');
      return;
    }
    if (!formData.name.trim()) {
      message.warning('请输入软件名称');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('version', formData.version);
      if (formData.category_id) {
        data.append('category_id', formData.category_id);
      }
      data.append('logo', formData.logo);
      data.append('icon', formData.icon);
      data.append('icon_bg', formData.icon_bg);
      data.append('icon_color', formData.icon_color);
      data.append('file', selectedFile);

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 201) {
          const newSoftware = JSON.parse(xhr.responseText);
          setSoftware(prev => [newSoftware, ...prev]);
          setIsModalOpen(false);
          resetForm();
          router.refresh();
          message.success('软件上传成功');
        } else {
          const error = JSON.parse(xhr.responseText);
          message.error(error.error || '上传失败');
        }
        setIsUploading(false);
      };

      xhr.onerror = () => {
        message.error('上传失败，请重试');
        setIsUploading(false);
      };

      xhr.open('POST', '/api/software');
      xhr.send(data);
    } catch (error) {
      console.error('Upload failed:', error);
      message.error('上传失败，请重试');
      setIsUploading(false);
    }
  };

  const executeDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/software/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSoftware(prev => prev.filter(s => s.id !== id));
        router.refresh();
        message.success('软件删除成功');
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      message.error('删除失败');
    }
  };

  const handleDelete = (item: SoftwareItem) => {
    setPendingDeleteItem(item);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteItem) return;
    setIsDeleting(true);
    try {
      await executeDelete(pendingDeleteItem.id);
      setPendingDeleteItem(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (item: SoftwareItem) => {
    setEditingItem(item);
    setEditFormData({
      name: item.name,
      description: item.description || '',
      version: item.version || '',
      category_id: item.category_id?.toString() || '',
      logo: item.logo || '',
      icon: item.icon || 'download',
      icon_bg: item.icon_bg || 'bg-blue-100',
      icon_color: item.icon_color || 'text-blue-600',
    });
    setEditLogoPreview(item.logo || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editFormData.name.trim()) {
      message.warning('请输入软件名称');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/software/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      if (res.ok) {
        const updated = await res.json();
        setSoftware(prev => prev.map(s => s.id === updated.id ? updated : s));
        setIsEditModalOpen(false);
        setEditingItem(null);
        router.refresh();
        message.success('软件信息更新成功');
      } else {
        message.error('保存失败');
      }
    } catch (error) {
      console.error('Edit failed:', error);
      message.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      version: '',
      category_id: categories.length > 0 ? categories[0].id.toString() : '',
      logo: '',
      icon: 'download',
      icon_bg: 'bg-blue-100',
      icon_color: 'text-blue-600',
    });
    setSelectedFile(null);
    setUploadProgress(0);
    setLogoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleIconChange = (icon: string) => {
    setFormData(prev => ({ ...prev, icon }));
  };

  const handleBgChange = (icon_bg: string) => {
    setFormData(prev => ({ ...prev, icon_bg }));
  };

  const handleColorChange = (icon_color: string) => {
    setFormData(prev => ({ ...prev, icon_color }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12 bg-background-light">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">软件管理</h2>
            <p className="text-slate-500 text-base mt-2">上传和管理可供用户下载的软件（单文件最大 4GB）</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span className="font-medium">上传软件</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600">folder</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{software.length}</p>
                <p className="text-sm text-slate-500">软件总数</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600">download</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {software.reduce((sum, s) => sum + s.download_count, 0)}
                </p>
                <p className="text-sm text-slate-500">总下载次数</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600">hard_drive</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatFileSize(software.reduce((sum, s) => sum + s.file_size, 0))}
                </p>
                <p className="text-sm text-slate-500">存储占用</p>
              </div>
            </div>
          </div>
        </div>

        {/* Software List */}
        {software.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
            <span className="material-symbols-outlined text-[48px] mb-4">cloud_upload</span>
            <p className="text-lg font-medium">暂无软件</p>
            <p className="text-sm mt-1">点击上方按钮上传软件</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">软件</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 hidden md:table-cell">文件名</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 hidden sm:table-cell">大小</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 hidden lg:table-cell">下载次数</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {software.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-lg ${item.logo ? 'bg-white border border-slate-200' : item.icon_bg} flex items-center justify-center shrink-0`}>
                          {item.logo ? (
                            <img src={item.logo} alt={item.name} className="size-8 object-contain" />
                          ) : (
                            <span className={`material-symbols-outlined ${item.icon_color} text-[20px]`}>{item.icon}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{item.name}</p>
                          {item.version && <p className="text-xs text-slate-400">v{item.version}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-slate-600 truncate max-w-[200px]">{item.file_name}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-sm text-slate-600">{formatFileSize(item.file_size)}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-sm text-slate-600">{item.download_count}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <a
                          href={`/api/software/${item.id}/download`}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="下载"
                        >
                          <span className="material-symbols-outlined text-[20px]">download</span>
                        </a>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDeleteItem)}
        title="删除软件"
        description={pendingDeleteItem ? `确定删除软件「${pendingDeleteItem.name}」吗？` : ''}
        confirmText="删除"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => !isDeleting && setPendingDeleteItem(null)}
      />

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">上传软件</h3>
              <button
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  选择文件 <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    selectedFile ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
                  }`}
                >
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[32px]">description</span>
                      <p className="text-sm font-medium text-slate-900 truncate max-w-full">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
                      <p className="text-sm">点击选择文件或拖拽到此处</p>
                      <p className="text-xs">支持所有格式，最大 4GB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  软件名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="例如：Visual Studio Code"
                />
              </div>

              {/* Version */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">版本号</label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="例如：1.85.0"
                />
              </div>

              {/* Category */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">分类</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">软件说明</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                  placeholder="简要描述软件用途..."
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Logo</label>
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
                      if (file) handleLogoUpload(file, false);
                    }}
                  />
                  <div className="text-sm text-slate-500">
                    <p>点击上传 Logo</p>
                    <p className="text-xs">支持 PNG, JPG, SVG</p>
                  </div>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview('');
                        setFormData(prev => ({ ...prev, logo: '' }));
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      移除
                    </button>
                  )}
                </div>
              </div>

              {/* Icon Picker (if no logo) */}
              {!logoPreview && (
                <div className="border-t border-slate-200 pt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">或选择图标</label>
                  <IconPicker
                    selectedIcon={formData.icon}
                    selectedBg={formData.icon_bg}
                    selectedColor={formData.icon_color}
                    onIconChange={handleIconChange}
                    onBgChange={handleBgChange}
                    onColorChange={handleColorChange}
                  />
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
                    <span>上传中...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  disabled={isUploading}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                      上传中
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                      上传
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">编辑软件</h3>
              <button
                onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 flex flex-col gap-5">
              {/* File Info (read-only) */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400">description</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{editingItem.file_name}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(editingItem.file_size)}</p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  软件名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="例如：Visual Studio Code"
                />
              </div>

              {/* Version */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">版本号</label>
                <input
                  type="text"
                  value={editFormData.version}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, version: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="例如：1.85.0"
                />
              </div>

              {/* Category */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">分类</label>
                  <select
                    value={editFormData.category_id}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                  >
                    <option value="">未分类</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">软件说明</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                  placeholder="简要描述软件用途..."
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Logo</label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => editLogoInputRef.current?.click()}
                    className={`size-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
                      editLogoPreview ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50'
                    }`}
                  >
                    {editLogoPreview ? (
                      <img src={editLogoPreview} alt="Logo" className="size-12 object-contain" />
                    ) : (
                      <span className="material-symbols-outlined text-slate-400">add_photo_alternate</span>
                    )}
                  </div>
                  <input
                    ref={editLogoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file, true);
                    }}
                  />
                  <div className="text-sm text-slate-500">
                    <p>点击上传 Logo</p>
                    <p className="text-xs">支持 PNG, JPG, SVG</p>
                  </div>
                  {editLogoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditLogoPreview('');
                        setEditFormData(prev => ({ ...prev, logo: '' }));
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      移除
                    </button>
                  )}
                </div>
              </div>

              {/* Icon Picker (if no logo) */}
              {!editLogoPreview && (
                <div className="border-t border-slate-200 pt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">或选择图标</label>
                  <IconPicker
                    selectedIcon={editFormData.icon}
                    selectedBg={editFormData.icon_bg}
                    selectedColor={editFormData.icon_color}
                    onIconChange={(icon) => setEditFormData(prev => ({ ...prev, icon }))}
                    onBgChange={(icon_bg) => setEditFormData(prev => ({ ...prev, icon_bg }))}
                    onColorChange={(icon_color) => setEditFormData(prev => ({ ...prev, icon_color }))}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }}
                  disabled={isSaving}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                      保存中
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">check</span>
                      保存
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
