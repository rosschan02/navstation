'use client';

import React, { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('phonebook');
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

  const activeCount = useMemo(() => entries.filter((item) => item.status === 'active').length, [entries]);
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
      throw new Error(data.error || 'Failed to load phonebook');
    }
    const data = await res.json();
    setEntries(Array.isArray(data) ? data : []);
  };

  const validateForm = (): string => {
    const name = formData.department_name.trim();
    const shortCode = formData.short_code.trim();
    const longCode = formData.long_code.trim();

    if (!name) return t('validationNameRequired');
    if (name.length > 100) return t('validationNameTooLong');
    if (shortCode && !SHORT_CODE_REGEX.test(shortCode)) return t('validationShortCode');
    if (longCode && !LONG_CODE_REGEX.test(longCode)) return t('validationLongCode');
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
        setFormError(data.error || t('saveFailed'));
        return;
      }

      await loadEntries();
      setIsModalOpen(false);
      resetForm();
      router.refresh();
      message.success(editingEntry ? t('toastUpdated') : t('toastCreated'));
    } catch (error) {
      console.error('Failed to save phonebook entry:', error);
      setFormError(t('saveFailedLater'));
    } finally {
      setIsSaving(false);
    }
  };

  const executeDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/phonebook/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        message.error(data.error || t('toastDeleteFailed'));
        return;
      }

      setEntries((prev) => prev.filter((item) => item.id !== id));
      router.refresh();
      message.success(t('toastDeleted'));
    } catch (error) {
      console.error('Failed to delete phonebook entry:', error);
      message.error(t('toastDeleteFailedLater'));
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('title')}</h1>
            <p className="text-slate-500 mt-1">{t('subtitle')}</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-primary/20 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">add_call</span>
            <span>{t('addNumber')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">{t('totalEntries')}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{entries.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">{t('active')}</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">{t('inactive')}</p>
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
                placeholder={t('searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | EntryStatus)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">{t('allStatuses')}</option>
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
            </select>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
            <span className="material-symbols-outlined text-[48px] mb-4">dialpad</span>
            <p className="text-lg font-medium">{t('emptyTitle')}</p>
            <p className="text-sm mt-1">{t('emptySubtitle')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-4 py-3 text-xs text-slate-500 font-semibold">{t('departmentName')}</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-semibold">{t('shortCode')}</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-semibold">{t('longCode')}</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-semibold">{t('remark')}</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-semibold">{t('sortOrder')}</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-semibold">{t('status')}</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-semibold text-right">{t('actions')}</th>
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
                        {entry.status === 'active' ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(entry)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                          title={t('edit')}
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(entry)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('delete')}
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
        title={t('deleteTitle')}
        description={pendingDeleteEntry ? t('deleteDescription', { name: pendingDeleteEntry.department_name }) : ''}
        confirmText={t('delete')}
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
                    {editingEntry ? t('editEntry') : t('addEntry')}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t('departmentName')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.department_name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, department_name: e.target.value }))}
                        placeholder={t('departmentNamePlaceholder')}
                        maxLength={100}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {t('shortCodeLabel')}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.short_code}
                          onChange={(e) => setFormData((prev) => ({ ...prev, short_code: normalizeDigits(e.target.value, 4) }))}
                          placeholder={t('optionalPlaceholder')}
                          maxLength={4}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {t('longCodeLabel')}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.long_code}
                          onChange={(e) => setFormData((prev) => ({ ...prev, long_code: normalizeDigits(e.target.value, 13) }))}
                          placeholder={t('optionalPlaceholder')}
                          maxLength={13}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('remark')}</label>
                      <textarea
                        value={formData.remark}
                        onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
                        rows={3}
                        placeholder={t('remarkPlaceholder')}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('sortOrder')}</label>
                        <input
                          type="number"
                          min={0}
                          value={formData.sort_order}
                          onChange={(e) => setFormData((prev) => ({ ...prev, sort_order: Number.parseInt(e.target.value || '0', 10) || 0 }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('status')}</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as EntryStatus }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          <option value="active">{t('active')}</option>
                          <option value="inactive">{t('inactive')}</option>
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
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? t('saving') : editingEntry ? t('saveChanges') : t('createEntry')}
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
