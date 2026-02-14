'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PhonebookEntry } from '@/types';
import { useMessage } from '@/contexts/MessageContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface PhonebookClientProps {
  initialEntries: PhonebookEntry[];
}

type EntryStatus = 'active' | 'inactive';

interface EntryFormData {
  department_name: string;
  short_code: string;
  long_code: string;
  remark: string;
  sort_order: number;
  status: EntryStatus;
}

const SHORT_CODE_REGEX = /^\d{3,4}$/;
const LONG_CODE_REGEX = /^\d{1,13}$/;

const DEFAULT_FORM: EntryFormData = {
  department_name: '',
  short_code: '',
  long_code: '',
  remark: '',
  sort_order: 0,
  status: 'active',
};

function normalizeDigits(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

export function PhonebookClient({ initialEntries }: PhonebookClientProps) {
  const router = useRouter();
  const message = useMessage();
  const [entries, setEntries] = useState<PhonebookEntry[]>(initialEntries);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EntryStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PhonebookEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState<PhonebookEntry | null>(null);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState<EntryFormData>(DEFAULT_FORM);

  const activeCount = useMemo(() => entries.filter(item => item.status === 'active').length, [entries]);
  const inactiveCount = entries.length - activeCount;

  const filteredEntries = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return entries.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!keyword) return true;

      return (
        item.department_name.toLowerCase().includes(keyword) ||
        item.short_code.includes(keyword) ||
        item.long_code.includes(keyword) ||
        item.remark.toLowerCase().includes(keyword)
      );
    });
  }, [entries, searchQuery, statusFilter]);

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingEntry(null);
    setFormError('');
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (entry: PhonebookEntry) => {
    setEditingEntry(entry);
    setFormData({
      department_name: entry.department_name,
      short_code: entry.short_code,
      long_code: entry.long_code,
      remark: entry.remark || '',
      sort_order: entry.sort_order || 0,
      status: entry.status,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const loadEntries = async () => {
    const res = await fetch('/api/phonebook?include_inactive=1&limit=500');
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || '加载电话本失败');
    }
    const data = await res.json();
    setEntries(Array.isArray(data) ? data : []);
  };

  const validateForm = (): string => {
    const name = formData.department_name.trim();
    const shortCode = formData.short_code.trim();
    const longCode = formData.long_code.trim();

    if (!name) return '科室名称不能为空';
    if (name.length > 100) return '科室名称长度不能超过 100 个字符';
    if (shortCode && !SHORT_CODE_REGEX.test(shortCode)) return '短码必须是 3-4 位数字';
    if (longCode && !LONG_CODE_REGEX.test(longCode)) return '长码必须是 1-13 位数字';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      department_name: formData.department_name.trim(),
      short_code: formData.short_code.trim(),
      long_code: formData.long_code.trim(),
      remark: formData.remark.trim(),
      sort_order: Number.isFinite(formData.sort_order) ? Math.max(0, formData.sort_order) : 0,
      status: formData.status,
    };

    const url = editingEntry ? `/api/phonebook/${editingEntry.id}` : '/api/phonebook';
    const method = editingEntry ? 'PUT' : 'POST';

    setIsSaving(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || '保存失败');
        return;
      }

      await loadEntries();
      setIsModalOpen(false);
      resetForm();
      router.refresh();
      message.success(editingEntry ? '电话本条目更新成功' : '电话本条目创建成功');
    } catch (error) {
      console.error('Failed to save phonebook entry:', error);
      setFormError('保存失败，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  const executeDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/phonebook/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        message.error(data.error || '删除失败');
        return;
      }

      setEntries(prev => prev.filter(item => item.id !== id));
      router.refresh();
      message.success('电话本条目删除成功');
    } catch (error) {
      console.error('Failed to delete phonebook entry:', error);
      message.error('删除失败，请稍后重试');
    }
  };

  const handleDelete = (entry: PhonebookEntry) => {
    setPendingDeleteEntry(entry);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteEntry) return;
    setIsDeleting(true);
    try {
      await executeDelete(pendingDeleteEntry.id);
      setPendingDeleteEntry(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12 bg-background-light">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">电话本管理</h1>
            <p className="text-slate-500 mt-1">管理科室名称与长码/短码，供首页电话本速查使用</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-primary/20 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">add_call</span>
            <span>添加号码</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">总条目</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{entries.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">启用中</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">已停用</p>
            <p className="text-2xl font-bold text-slate-500 mt-1">{inactiveCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索科室、短码、长码或备注..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | EntryStatus)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">全部状态</option>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
            <span className="material-symbols-outlined text-[48px] mb-4">dialpad</span>
            <p className="text-lg font-medium">暂无匹配的电话本条目</p>
            <p className="text-sm mt-1">请调整筛选条件或添加新条目</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-4 py-3 text-xs text-slate-500 font-semibold">科室名称</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-semibold">短码</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-semibold">长码</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-semibold">备注</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-semibold">排序</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-semibold">状态</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-semibold text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{entry.department_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">{entry.short_code || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">{entry.long_code || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 max-w-[260px] truncate">{entry.remark || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{entry.sort_order}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        entry.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {entry.status === 'active' ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(entry)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(entry)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
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
        open={Boolean(pendingDeleteEntry)}
        title="删除电话本条目"
        description={pendingDeleteEntry ? `确定删除科室「${pendingDeleteEntry.department_name}」吗？` : ''}
        confirmText="删除"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => !isDeleting && setPendingDeleteEntry(null)}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <form onSubmit={handleSubmit}>
                <div className="px-6 py-5">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    {editingEntry ? '编辑电话本条目' : '添加电话本条目'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        科室名称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.department_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, department_name: e.target.value }))}
                        placeholder="例如：急诊科"
                        maxLength={100}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          短码（3-4位）
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.short_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, short_code: normalizeDigits(e.target.value, 4) }))}
                          placeholder="可留空"
                          maxLength={4}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          长码（1-13位）
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.long_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, long_code: normalizeDigits(e.target.value, 13) }))}
                          placeholder="可留空"
                          maxLength={13}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
                      <textarea
                        value={formData.remark}
                        onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
                        rows={3}
                        placeholder="例如：白班优先拨打短码"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">排序</label>
                        <input
                          type="number"
                          min={0}
                          value={formData.sort_order}
                          onChange={(e) => setFormData(prev => ({ ...prev, sort_order: Number.parseInt(e.target.value || '0', 10) || 0 }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">状态</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as EntryStatus }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          <option value="active">启用</option>
                          <option value="inactive">停用</option>
                        </select>
                      </div>
                    </div>

                    {formError && (
                      <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">
                        {formError}
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                    disabled={isSaving}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? '保存中...' : editingEntry ? '保存修改' : '创建条目'}
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
