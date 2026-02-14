'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ApiKey } from '@/types';
import { useMessage } from '@/contexts/MessageContext';

const PERMISSION_OPTIONS = [
  { value: 'read', label: '只读', description: '读取站点、分类、统计数据' },
  { value: 'write', label: '读写', description: '包含只读 + 增删改站点、软件等' },
];

interface KeysClientProps {
  initialKeys: ApiKey[];
}

export function KeysClient({ initialKeys }: KeysClientProps) {
  const router = useRouter();
  const message = useMessage();
  const [keys, setKeys] = useState(initialKeys);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Created key display
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    permissions: 'read' as 'read' | 'write',
    description: '',
  });

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
      const newKeys = await fetch('/api/keys').then(r => r.json());
      setKeys(newKeys);
      message.success('API 密钥创建成功');
    } else {
      const data = await res.json();
      message.error(data.error || '创建失败');
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
      const newKeys = await fetch('/api/keys').then(r => r.json());
      setKeys(newKeys);
      message.success('API 密钥更新成功');
    } else {
      const data = await res.json();
      message.error(data.error || '更新失败');
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
      const newKeys = await fetch('/api/keys').then(r => r.json());
      setKeys(newKeys);
      message.success(key.is_active ? 'API 密钥已禁用' : 'API 密钥已启用');
      return;
    }

    const data = await res.json().catch(() => ({}));
    message.error(data.error || '状态更新失败');
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });

    if (res.ok) {
      setDeleteConfirm(null);
      router.refresh();
      setKeys(keys.filter(k => k.id !== id));
      message.success('API 密钥删除成功');
    } else {
      const data = await res.json();
      message.error(data.error || '删除失败');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      message.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error('复制失败，请手动复制');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', {
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">API 密钥管理</h1>
            <p className="text-slate-500 mt-1">管理外部系统对接的 API 密钥</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>创建密钥</span>
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-amber-600 text-[20px] flex-shrink-0 mt-0.5">info</span>
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">API 密钥使用说明</p>
              <p>外部系统可通过以下方式调用 API：</p>
              <code className="block mt-2 bg-amber-100 px-2 py-1 rounded text-xs">
                X-API-Key: nav_sk_xxxx
              </code>
              <code className="block mt-1 bg-amber-100 px-2 py-1 rounded text-xs">
                Authorization: Bearer nav_sk_xxxx
              </code>
            </div>
          </div>
        </div>

        {/* Keys List */}
        {keys.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-slate-400 text-[32px]">key</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">暂无 API 密钥</h3>
            <p className="text-slate-500 mb-4">创建一个 API 密钥以允许外部系统访问</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              创建第一个密钥
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">名称</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">密钥前缀</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">权限</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">状态</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">最后使用</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">创建时间</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">操作</th>
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
                        {key.permissions === 'write' ? '读写' : '只读'}
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
                        {key.is_active ? '启用' : '禁用'}
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
                          title="编辑"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(key.id)}
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

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !createdKey && setIsCreateModalOpen(false)} />

          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              {createdKey ? (
                // Show created key
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-green-600">check</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">密钥创建成功</h3>
                      <p className="text-sm text-slate-500">请立即保存，密钥不会再次显示</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <label className="block text-xs font-medium text-slate-500 mb-2">API 密钥</label>
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
                        这是唯一一次显示完整密钥的机会。关闭此窗口后将无法再次查看。
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
                    我已保存，关闭
                  </button>
                </div>
              ) : (
                // Create form
                <form onSubmit={handleCreate}>
                  <div className="bg-white px-6 py-5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">创建 API 密钥</h3>

                    <div className="flex flex-col gap-4">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700">
                          密钥名称 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                          placeholder="例如：OA系统对接"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>

                      {/* Permissions */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          权限级别 <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {PERMISSION_OPTIONS.map((perm) => (
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

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700">备注说明</label>
                        <textarea
                          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
                          rows={2}
                          placeholder="可选，描述此密钥的用途"
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
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg transition-colors"
                    >
                      创建密钥
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingKey && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />

          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <form onSubmit={handleEdit}>
                <div className="bg-white px-6 py-5">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">编辑 API 密钥</h3>

                  <div className="flex flex-col gap-4">
                    {/* Key Prefix (read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700">密钥前缀</label>
                      <div className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 text-sm">
                        <code className="font-mono">{editingKey.key_prefix}...</code>
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        密钥名称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    {/* Permissions */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">权限级别</label>
                      <div className="grid grid-cols-2 gap-2">
                        {PERMISSION_OPTIONS.map((perm) => (
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

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700">备注说明</label>
                      <textarea
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
                        rows={2}
                        placeholder="可选"
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
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg transition-colors"
                  >
                    保存修改
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
                      确定要删除这个 API 密钥吗？删除后，使用此密钥的外部系统将无法继续访问。
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
