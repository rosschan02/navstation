'use client';

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { ApiKey } from '@/types';
import { useMessage } from '@/contexts/MessageContext';

interface KeysClientProps {
  initialKeys: ApiKey[];
}

export function KeysClient({ initialKeys }: KeysClientProps) {
  const t = useTranslations('keys');
  const locale = useLocale();
  const router = useRouter();
  const message = useMessage();
  const [keys, setKeys] = useState(initialKeys);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    permissions: 'read' as 'read' | 'write',
    description: '',
  });

  const permissionOptions = [
    { value: 'read', label: t('permissionRead'), description: t('permissionReadDescription') },
    { value: 'write', label: t('permissionWrite'), description: t('permissionWriteDescription') },
  ] as const;

  const resetForm = () => {
    setFormData({
      name: '',
      permissions: 'read',
      description: '',
    });
  };

  const openCreateModal = () => {
    resetForm();
    setCreatedKey(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (key: ApiKey) => {
    setEditingKey(key);
    setFormData({
      name: key.name,
      permissions: key.permissions,
      description: key.description || '',
    });
    setIsEditModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      const data = await res.json();
      setCreatedKey(data.key);
      router.refresh();
      const newKeys = await fetch('/api/keys').then((r) => r.json());
      setKeys(newKeys);
      message.success(t('toastCreated'));
    } else {
      const data = await res.json();
      message.error(data.error || t('toastCreateFailed'));
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKey) return;

    const res = await fetch(`/api/keys/${editingKey.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setIsEditModalOpen(false);
      setEditingKey(null);
      router.refresh();
      const newKeys = await fetch('/api/keys').then((r) => r.json());
      setKeys(newKeys);
      message.success(t('toastUpdated'));
    } else {
      const data = await res.json();
      message.error(data.error || t('toastUpdateFailed'));
    }
  };

  const handleToggleActive = async (key: ApiKey) => {
    const res = await fetch(`/api/keys/${key.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !key.is_active }),
    });

    if (res.ok) {
      router.refresh();
      const newKeys = await fetch('/api/keys').then((r) => r.json());
      setKeys(newKeys);
      message.success(key.is_active ? t('toastDisabled') : t('toastEnabled'));
      return;
    }

    const data = await res.json().catch(() => ({}));
    message.error(data.error || t('toastStatusUpdateFailed'));
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });

    if (res.ok) {
      setDeleteConfirm(null);
      router.refresh();
      setKeys(keys.filter((k) => k.id !== id));
      message.success(t('toastDeleted'));
    } else {
      const data = await res.json();
      message.error(data.error || t('toastDeleteFailed'));
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      message.success(t('toastCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error(t('toastCopyFailed'));
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
      <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('title')}</h1>
            <p className="text-slate-500 mt-1">{t('subtitle')}</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>{t('createKey')}</span>
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-amber-600 text-[20px] flex-shrink-0 mt-0.5">info</span>
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">{t('usageTitle')}</p>
              <p>{t('usageDescription')}</p>
              <code className="block mt-2 bg-amber-100 px-2 py-1 rounded text-xs">
                X-API-Key: nav_sk_xxxx
              </code>
              <code className="block mt-1 bg-amber-100 px-2 py-1 rounded text-xs">
                Authorization: Bearer nav_sk_xxxx
              </code>
            </div>
          </div>
        </div>

        {keys.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-slate-400 text-[32px]">key</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('emptyTitle')}</h3>
            <p className="text-slate-500 mb-4">{t('emptySubtitle')}</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {t('createFirstKey')}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('name')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('keyPrefix')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('permissions')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('status')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('lastUsed')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('createdAt')}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {keys.map((key) => (
                  <tr key={key.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">{key.name}</div>
                      {key.description && (
                        <div className="text-sm text-slate-500 truncate max-w-xs">{key.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <code className="text-sm bg-slate-100 px-2 py-1 rounded font-mono">{key.key_prefix}...</code>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        key.permissions === 'write'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {key.permissions === 'write' ? t('permissionWrite') : t('permissionRead')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggleActive(key)}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          key.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`size-1.5 rounded-full mr-1.5 ${key.is_active ? 'bg-green-500' : 'bg-slate-400'}`} />
                        {key.is_active ? t('enabled') : t('disabled')}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {formatDate(key.last_used_at)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {formatDate(key.created_at)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(key)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                          title={t('edit')}
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(key.id)}
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

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !createdKey && setIsCreateModalOpen(false)} />

          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              {createdKey ? (
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-green-600">check</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{t('createSuccessTitle')}</h3>
                      <p className="text-sm text-slate-500">{t('createSuccessSubtitle')}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <label className="block text-xs font-medium text-slate-500 mb-2">{t('apiKey')}</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-white border border-slate-200 px-3 py-2 rounded font-mono break-all">
                        {createdKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(createdKey)}
                        className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                          copied ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {copied ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <div className="flex gap-2">
                      <span className="material-symbols-outlined text-amber-600 text-[18px] flex-shrink-0">warning</span>
                      <p className="text-sm text-amber-800">
                        {t('oneTimeWarning')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setCreatedKey(null);
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg transition-colors"
                  >
                    {t('savedAndClose')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreate}>
                  <div className="bg-white px-6 py-5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('createDialogTitle')}</h3>

                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">
                          {t('keyName')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                          placeholder={t('keyNamePlaceholder')}
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {t('permissionLevel')} <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {permissionOptions.map((perm) => (
                            <button
                              key={perm.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, permissions: perm.value as 'read' | 'write' })}
                              className={`flex flex-col items-start p-3 rounded-lg border-2 transition-all text-left ${
                                formData.permissions === perm.value
                                  ? 'border-primary bg-primary/5'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <span className={`text-sm font-medium ${
                                formData.permissions === perm.value ? 'text-primary' : 'text-slate-900'
                              }`}>{perm.label}</span>
                              <span className="text-xs text-slate-500 mt-0.5">{perm.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700">{t('description')}</label>
                        <textarea
                          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
                          rows={2}
                          placeholder={t('descriptionPlaceholder')}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      onClick={() => setIsCreateModalOpen(false)}
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg transition-colors"
                    >
                      {t('create')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editingKey && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />

          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <form onSubmit={handleEdit}>
                <div className="bg-white px-6 py-5">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('editDialogTitle')}</h3>

                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">{t('keyPrefix')}</label>
                      <div className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 text-sm">
                        <code className="font-mono">{editingKey.key_prefix}...</code>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        {t('keyName')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">{t('permissionLevel')}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {permissionOptions.map((perm) => (
                          <button
                            key={perm.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, permissions: perm.value as 'read' | 'write' })}
                            className={`flex flex-col items-start p-3 rounded-lg border-2 transition-all text-left ${
                              formData.permissions === perm.value
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span className={`text-sm font-medium ${
                              formData.permissions === perm.value ? 'text-primary' : 'text-slate-900'
                            }`}>{perm.label}</span>
                            <span className="text-xs text-slate-500 mt-0.5">{perm.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">{t('description')}</label>
                      <textarea
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
                        rows={2}
                        placeholder={t('optional')}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg transition-colors"
                  >
                    {t('saveChanges')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
                    <h3 className="text-lg font-semibold leading-6 text-slate-900">{t('deleteConfirmTitle')}</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {t('deleteConfirmDescription')}
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
                  {t('confirmDelete')}
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-colors"
                  onClick={() => setDeleteConfirm(null)}
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
