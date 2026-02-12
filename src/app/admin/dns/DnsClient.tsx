'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DnsChangeLog, DnsRecord, DnsRecordType, DnsZone } from '@/types';

interface DnsClientProps {
  initialZones: DnsZone[];
  initialRecords: DnsRecord[];
  initialLogs: DnsChangeLog[];
}

type RecordStatus = 'active' | 'inactive';

interface ZoneFormData {
  name: string;
  server: string;
  port: number;
  tsig_key_name: string;
  tsig_algorithm: string;
  tsig_secret: string;
  description: string;
}

interface ZoneEditFormData extends ZoneFormData {
  id: number;
  is_active: boolean;
  update_tsig_secret: boolean;
}

interface RecordFormData {
  zone_id: number;
  name: string;
  type: DnsRecordType;
  ttl: number;
  value: string;
  priority: number | '';
  status: RecordStatus;
  sync_now: boolean;
}

const DEFAULT_ZONE_FORM: ZoneFormData = {
  name: '',
  server: '127.0.0.1',
  port: 53,
  tsig_key_name: '',
  tsig_algorithm: 'hmac-sha256',
  tsig_secret: '',
  description: '',
};

function buildRecordForm(zoneId: number): RecordFormData {
  return {
    zone_id: zoneId,
    name: '@',
    type: 'A',
    ttl: 300,
    value: '',
    priority: '',
    status: 'active',
    sync_now: true,
  };
}

function syncBadgeClass(status: string) {
  if (status === 'success') return 'bg-green-100 text-green-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  if (status === 'pending') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

function logStatusClass(status: DnsChangeLog['status']) {
  if (status === 'success') return 'bg-green-100 text-green-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-600';
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function buildLogsUrl(zoneFilter: string): string {
  const params = new URLSearchParams({ limit: '100' });
  if (zoneFilter !== 'all') {
    params.set('zone_id', zoneFilter);
  }
  return `/api/dns/logs?${params.toString()}`;
}

export function DnsClient({ initialZones, initialRecords, initialLogs }: DnsClientProps) {
  const router = useRouter();

  const [zones, setZones] = useState<DnsZone[]>(initialZones);
  const [records, setRecords] = useState<DnsRecord[]>(initialRecords);
  const [logs, setLogs] = useState<DnsChangeLog[]>(initialLogs);

  const [zoneForm, setZoneForm] = useState<ZoneFormData>(DEFAULT_ZONE_FORM);
  const [recordForm, setRecordForm] = useState<RecordFormData>(
    buildRecordForm(initialZones[0]?.id || 0)
  );

  const [editingZone, setEditingZone] = useState<ZoneEditFormData | null>(null);
  const [logZoneFilter, setLogZoneFilter] = useState<string>('all');

  const [isSavingZone, setIsSavingZone] = useState(false);
  const [isUpdatingZone, setIsUpdatingZone] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const zoneById = useMemo(() => {
    const map = new Map<number, DnsZone>();
    for (const zone of zones) {
      map.set(zone.id, zone);
    }
    return map;
  }, [zones]);

  const recordCountByZone = useMemo(() => {
    const map = new Map<number, number>();
    for (const record of records) {
      map.set(record.zone_id, (map.get(record.zone_id) || 0) + 1);
    }
    return map;
  }, [records]);

  const activeRecords = records.filter((record) => record.status === 'active').length;

  const loadData = async (zoneFilter = logZoneFilter) => {
    const [zoneRes, recordRes] = await Promise.all([
      fetch('/api/dns/zones'),
      fetch('/api/dns/records?include_inactive=1'),
    ]);

    if (!zoneRes.ok || !recordRes.ok) {
      throw new Error('加载 DNS 数据失败');
    }

    const zoneData: DnsZone[] = await zoneRes.json();
    const recordData: DnsRecord[] = await recordRes.json();

    let effectiveFilter = zoneFilter;
    if (effectiveFilter !== 'all' && !zoneData.some((item) => item.id === Number(effectiveFilter))) {
      effectiveFilter = 'all';
      setLogZoneFilter('all');
    }

    const logRes = await fetch(buildLogsUrl(effectiveFilter));
    if (!logRes.ok) {
      throw new Error('加载 DNS 日志失败');
    }
    const logData: DnsChangeLog[] = await logRes.json();

    setZones(Array.isArray(zoneData) ? zoneData : []);
    setRecords(Array.isArray(recordData) ? recordData : []);
    setLogs(Array.isArray(logData) ? logData : []);

    if (!zoneData.some((item) => item.id === recordForm.zone_id)) {
      setRecordForm((prev) => ({ ...prev, zone_id: zoneData[0]?.id || 0 }));
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSavingZone(true);

    try {
      const res = await fetch('/api/dns/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zoneForm),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || '创建 Zone 失败' });
        return;
      }

      await loadData();
      setZoneForm(DEFAULT_ZONE_FORM);
      setMessage({ type: 'success', text: `Zone ${data.name || ''} 创建成功` });
      router.refresh();
    } catch (error) {
      console.error('Failed to create zone:', error);
      setMessage({ type: 'error', text: '创建 Zone 失败' });
    } finally {
      setIsSavingZone(false);
    }
  };

  const openEditZone = (zone: DnsZone) => {
    setEditingZone({
      id: zone.id,
      name: zone.name,
      server: zone.server,
      port: zone.port,
      tsig_key_name: zone.tsig_key_name,
      tsig_algorithm: zone.tsig_algorithm,
      tsig_secret: '',
      description: zone.description || '',
      is_active: zone.is_active,
      update_tsig_secret: false,
    });
  };

  const handleUpdateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone) return;

    setMessage(null);
    setIsUpdatingZone(true);

    try {
      const payload: Record<string, unknown> = {
        name: editingZone.name,
        server: editingZone.server,
        port: editingZone.port,
        tsig_key_name: editingZone.tsig_key_name,
        tsig_algorithm: editingZone.tsig_algorithm,
        description: editingZone.description,
        is_active: editingZone.is_active,
      };

      if (editingZone.update_tsig_secret) {
        payload.tsig_secret = editingZone.tsig_secret;
      }

      const res = await fetch(`/api/dns/zones/${editingZone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || '更新 Zone 失败' });
        return;
      }

      await loadData();
      setEditingZone(null);
      setMessage({ type: 'success', text: `Zone ${data.name || ''} 更新成功` });
      router.refresh();
    } catch (error) {
      console.error('Failed to update zone:', error);
      setMessage({ type: 'error', text: '更新 Zone 失败' });
    } finally {
      setIsUpdatingZone(false);
    }
  };

  const handleToggleZoneStatus = async (zone: DnsZone) => {
    try {
      const res = await fetch(`/api/dns/zones/${zone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !zone.is_active }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || '更新 Zone 状态失败' });
        return;
      }

      await loadData();
      setMessage({ type: 'success', text: `Zone ${zone.name} 已${zone.is_active ? '停用' : '启用'}` });
      router.refresh();
    } catch (error) {
      console.error('Failed to toggle zone status:', error);
      setMessage({ type: 'error', text: '更新 Zone 状态失败' });
    }
  };

  const handleDeleteZone = async (zone: DnsZone) => {
    const count = recordCountByZone.get(zone.id) || 0;
    if (!confirm(`确定删除 Zone ${zone.name} 吗？\n当前包含 ${count} 条记录。`)) {
      return;
    }

    try {
      const res = await fetch(`/api/dns/zones/${zone.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || '删除 Zone 失败' });
        return;
      }

      await loadData();
      setMessage({ type: 'success', text: `Zone ${zone.name} 已删除` });
      router.refresh();
    } catch (error) {
      console.error('Failed to delete zone:', error);
      setMessage({ type: 'error', text: '删除 Zone 失败' });
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSavingRecord(true);

    try {
      const payload = {
        ...recordForm,
        priority: recordForm.type === 'MX'
          ? (recordForm.priority === '' ? null : Number(recordForm.priority))
          : null,
      };

      const res = await fetch('/api/dns/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || '创建记录失败' });
        return;
      }

      await loadData();
      setRecordForm(buildRecordForm(recordForm.zone_id || zones[0]?.id || 0));
      const syncMessage = data.record?.last_sync_message || '记录已创建';
      setMessage({ type: 'success', text: syncMessage });
      router.refresh();
    } catch (error) {
      console.error('Failed to create record:', error);
      setMessage({ type: 'error', text: '创建记录失败' });
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleDeleteRecord = async (record: DnsRecord) => {
    if (!confirm(`确定删除记录 ${record.name} ${record.type} 吗？`)) {
      return;
    }

    try {
      const res = await fetch(`/api/dns/records/${record.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || '删除记录失败' });
        return;
      }

      await loadData();
      setMessage({ type: 'success', text: '记录已删除' });
      router.refresh();
    } catch (error) {
      console.error('Failed to delete record:', error);
      setMessage({ type: 'error', text: '删除记录失败' });
    }
  };

  const handleToggleRecordStatus = async (record: DnsRecord) => {
    const nextStatus: RecordStatus = record.status === 'active' ? 'inactive' : 'active';

    try {
      const res = await fetch(`/api/dns/records/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, sync_now: true }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || '更新状态失败' });
        return;
      }

      await loadData();
      setMessage({ type: 'success', text: data.record?.last_sync_message || '状态更新成功' });
      router.refresh();
    } catch (error) {
      console.error('Failed to update record status:', error);
      setMessage({ type: 'error', text: '更新状态失败' });
    }
  };

  const handleRefreshLogs = async (zoneFilter = logZoneFilter) => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch(buildLogsUrl(zoneFilter));
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error || '加载日志失败' });
        return;
      }
      const data: DnsChangeLog[] = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to refresh logs:', error);
      setMessage({ type: 'error', text: '加载日志失败' });
    } finally {
      setIsLoadingLogs(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12 bg-background-light">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">DNS 管理</h1>
          <p className="text-slate-500 mt-1">BIND9 动态更新（nsupdate）MVP 管理界面</p>
        </div>

        {message && (
          <div className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Zone 数量</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{zones.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">记录总数</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{records.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">启用记录</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{activeRecords}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Zone 列表</h2>
            <p className="text-sm text-slate-500 mt-1">支持编辑、启停、删除（删除前需先清空记录）</p>
          </div>

          <table className="w-full min-w-[980px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Zone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">DNS 服务器</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">TSIG Key</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">记录数</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">状态</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">更新时间</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {zones.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>暂无 Zone</td>
                </tr>
              ) : (
                zones.map((zone) => (
                  <tr key={zone.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{zone.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{zone.server}:{zone.port}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{zone.tsig_key_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{recordCountByZone.get(zone.id) || 0}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleToggleZoneStatus(zone)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          zone.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {zone.is_active ? 'active' : 'inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(zone.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditZone(zone)}
                          className="inline-flex items-center justify-center size-8 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors"
                          title="编辑"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteZone(zone)}
                          className="inline-flex items-center justify-center size-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="删除"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <form onSubmit={handleCreateZone} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">新增 Zone</h2>
              <p className="text-sm text-slate-500 mt-1">用于定义 BIND9 的目标域和认证信息</p>
            </div>

            <input
              type="text"
              value={zoneForm.name}
              onChange={(e) => setZoneForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="example.com"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={zoneForm.server}
                onChange={(e) => setZoneForm((prev) => ({ ...prev, server: e.target.value }))}
                placeholder="10.0.0.53"
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                required
              />
              <input
                type="number"
                value={zoneForm.port}
                onChange={(e) => setZoneForm((prev) => ({ ...prev, port: Number(e.target.value) || 53 }))}
                placeholder="53"
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                min={1}
                max={65535}
                required
              />
            </div>

            <input
              type="text"
              value={zoneForm.tsig_key_name}
              onChange={(e) => setZoneForm((prev) => ({ ...prev, tsig_key_name: e.target.value }))}
              placeholder="tsig-key-name (可选)"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={zoneForm.tsig_algorithm}
                onChange={(e) => setZoneForm((prev) => ({ ...prev, tsig_algorithm: e.target.value }))}
                placeholder="hmac-sha256"
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
              <input
                type="text"
                value={zoneForm.tsig_secret}
                onChange={(e) => setZoneForm((prev) => ({ ...prev, tsig_secret: e.target.value }))}
                placeholder="TSIG Secret (可选)"
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>

            <textarea
              value={zoneForm.description}
              onChange={(e) => setZoneForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="备注"
              rows={2}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
            />

            <button
              type="submit"
              disabled={isSavingZone}
              className="h-10 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-60"
            >
              {isSavingZone ? '创建中...' : '创建 Zone'}
            </button>
          </form>

          <form onSubmit={handleCreateRecord} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">新增记录</h2>
              <p className="text-sm text-slate-500 mt-1">创建记录后可立即同步到 BIND9</p>
            </div>

            <select
              value={recordForm.zone_id}
              onChange={(e) => setRecordForm((prev) => ({ ...prev, zone_id: Number(e.target.value) }))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              required
            >
              {zones.length === 0 ? (
                <option value={0}>请先创建 Zone</option>
              ) : (
                zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} ({zone.server}:{zone.port})
                  </option>
                ))
              )}
            </select>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={recordForm.name}
                onChange={(e) => setRecordForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="@ / www"
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                required
              />
              <select
                value={recordForm.type}
                onChange={(e) => setRecordForm((prev) => ({ ...prev, type: e.target.value as DnsRecordType, priority: e.target.value === 'MX' ? 10 : '' }))}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="A">A</option>
                <option value="AAAA">AAAA</option>
                <option value="CNAME">CNAME</option>
                <option value="TXT">TXT</option>
                <option value="MX">MX</option>
              </select>
              <input
                type="number"
                value={recordForm.ttl}
                onChange={(e) => setRecordForm((prev) => ({ ...prev, ttl: Number(e.target.value) || 300 }))}
                placeholder="300"
                min={30}
                max={86400}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                required
              />
            </div>

            <input
              type="text"
              value={recordForm.value}
              onChange={(e) => setRecordForm((prev) => ({ ...prev, value: e.target.value }))}
              placeholder={recordForm.type === 'MX' ? 'mail.example.com' : '记录值'}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              required
            />

            {recordForm.type === 'MX' && (
              <input
                type="number"
                value={recordForm.priority}
                onChange={(e) => setRecordForm((prev) => ({ ...prev, priority: e.target.value === '' ? '' : Number(e.target.value) }))}
                placeholder="优先级"
                min={0}
                max={65535}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                required
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={recordForm.status}
                onChange={(e) => setRecordForm((prev) => ({ ...prev, status: e.target.value as RecordStatus }))}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>

              <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={recordForm.sync_now}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, sync_now: e.target.checked }))}
                />
                立即同步到 BIND9
              </label>
            </div>

            <button
              type="submit"
              disabled={isSavingRecord || zones.length === 0 || !zoneById.has(recordForm.zone_id)}
              className="h-10 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-60"
            >
              {isSavingRecord ? '创建中...' : '创建记录'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Zone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">主机名</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">类型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">值</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">TTL</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">状态</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">同步状态</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={8}>
                    暂无 DNS 记录
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">{record.zone_name || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{record.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{record.type}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {record.type === 'MX' && record.priority !== null ? `${record.priority} ` : ''}
                      {record.value}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{record.ttl}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleToggleRecordStatus(record)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          record.status === 'active'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {record.status}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center w-fit px-2.5 py-1 rounded-full text-xs font-medium ${syncBadgeClass(record.last_sync_status)}`}>
                          {record.last_sync_status}
                        </span>
                        {record.last_sync_message && (
                          <span className="text-xs text-slate-500 truncate max-w-[260px]" title={record.last_sync_message}>
                            {record.last_sync_message}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteRecord(record)}
                        className="inline-flex items-center justify-center size-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="删除"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <div className="p-5 border-b border-slate-100 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">变更日志</h2>
              <p className="text-sm text-slate-500 mt-1">记录 DNS 下发与操作结果（最近 100 条）</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={logZoneFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  setLogZoneFilter(value);
                  void handleRefreshLogs(value);
                }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="all">全部 Zone</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
              <button
                onClick={() => handleRefreshLogs()}
                disabled={isLoadingLogs}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {isLoadingLogs ? '刷新中...' : '刷新日志'}
              </button>
            </div>
          </div>

          <table className="w-full min-w-[1100px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">时间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">动作</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">结果</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Zone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">记录</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">操作人</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">消息</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>暂无变更日志</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{log.action}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${logStatusClass(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{log.zone_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {log.record_name ? `${log.record_name}${log.record_type ? ` (${log.record_type})` : ''}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{log.operator_name} ({log.operator_type})</td>
                    <td className="px-4 py-3 text-sm text-slate-700 max-w-[420px] truncate" title={log.response_message || '-'}>
                      {log.response_message || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setEditingZone(null)} />
          <form
            onSubmit={handleUpdateZone}
            className="relative w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl p-5 flex flex-col gap-4"
          >
            <div>
              <h3 className="text-lg font-semibold text-slate-900">编辑 Zone</h3>
              <p className="text-sm text-slate-500 mt-1">{editingZone.name}</p>
            </div>

            <input
              type="text"
              value={editingZone.name}
              onChange={(e) => setEditingZone((prev) => prev ? { ...prev, name: e.target.value } : prev)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={editingZone.server}
                onChange={(e) => setEditingZone((prev) => prev ? { ...prev, server: e.target.value } : prev)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                required
              />
              <input
                type="number"
                value={editingZone.port}
                onChange={(e) => setEditingZone((prev) => prev ? { ...prev, port: Number(e.target.value) || 53 } : prev)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                min={1}
                max={65535}
                required
              />
            </div>

            <input
              type="text"
              value={editingZone.tsig_key_name}
              onChange={(e) => setEditingZone((prev) => prev ? { ...prev, tsig_key_name: e.target.value } : prev)}
              placeholder="tsig-key-name (可选)"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={editingZone.tsig_algorithm}
                onChange={(e) => setEditingZone((prev) => prev ? { ...prev, tsig_algorithm: e.target.value } : prev)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
              <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={editingZone.update_tsig_secret}
                  onChange={(e) => setEditingZone((prev) => prev ? { ...prev, update_tsig_secret: e.target.checked } : prev)}
                />
                更新 TSIG Secret
              </label>
            </div>

            {editingZone.update_tsig_secret && (
              <input
                type="text"
                value={editingZone.tsig_secret}
                onChange={(e) => setEditingZone((prev) => prev ? { ...prev, tsig_secret: e.target.value } : prev)}
                placeholder="输入新的 TSIG Secret（留空将清空）"
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            )}

            <textarea
              value={editingZone.description}
              onChange={(e) => setEditingZone((prev) => prev ? { ...prev, description: e.target.value } : prev)}
              rows={2}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
              placeholder="备注"
            />

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={editingZone.is_active}
                onChange={(e) => setEditingZone((prev) => prev ? { ...prev, is_active: e.target.checked } : prev)}
              />
              Zone 启用
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingZone(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isUpdatingZone}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-blue-600 disabled:opacity-60"
              >
                {isUpdatingZone ? '保存中...' : '保存 Zone'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
