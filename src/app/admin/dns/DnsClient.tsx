'use client';

import React, { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { DnsChangeLog, DnsForwardZone, DnsRecord, DnsRecordType, DnsZone } from '@/types';
import { useMessage } from '@/contexts/MessageContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface DnsClientProps {
  initialZones: DnsZone[];
  initialRecords: DnsRecord[];
  initialLogs: DnsChangeLog[];
  initialForwardZones: DnsForwardZone[];
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

interface ForwardZoneFormData {
  name: string;
  forwarders: string;
  forward_policy: 'only' | 'first';
  description: string;
}

interface ConfirmDialogState {
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => Promise<void>;
}

const DEFAULT_FORWARD_ZONE_FORM: ForwardZoneFormData = {
  name: '',
  forwarders: '',
  forward_policy: 'only',
  description: '',
};

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

export function DnsClient({ initialZones, initialRecords, initialLogs, initialForwardZones }: DnsClientProps) {
  const t = useTranslations('dns');
  const router = useRouter();
  const message = useMessage();

  const [zones, setZones] = useState<DnsZone[]>(initialZones);
  const [records, setRecords] = useState<DnsRecord[]>(initialRecords);
  const [logs, setLogs] = useState<DnsChangeLog[]>(initialLogs);
  const [forwardZones, setForwardZones] = useState<DnsForwardZone[]>(initialForwardZones);

  const [zoneForm, setZoneForm] = useState<ZoneFormData>(DEFAULT_ZONE_FORM);
  const [recordForm, setRecordForm] = useState<RecordFormData>(
    buildRecordForm(initialZones[0]?.id || 0)
  );
  const [forwardZoneForm, setForwardZoneForm] = useState<ForwardZoneFormData>(DEFAULT_FORWARD_ZONE_FORM);
  const [isCreateZoneModalOpen, setIsCreateZoneModalOpen] = useState(false);
  const [isCreateForwardZoneModalOpen, setIsCreateForwardZoneModalOpen] = useState(false);
  const [createRecordZone, setCreateRecordZone] = useState<DnsZone | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const [editingZone, setEditingZone] = useState<ZoneEditFormData | null>(null);
  const [editingForwardZone, setEditingForwardZone] = useState<(ForwardZoneFormData & { id: number; is_active: boolean }) | null>(null);
  const [logZoneFilter, setLogZoneFilter] = useState<string>('all');

  const [isSavingZone, setIsSavingZone] = useState(false);
  const [isUpdatingZone, setIsUpdatingZone] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSavingForwardZone, setIsSavingForwardZone] = useState(false);
  const [isUpdatingForwardZone, setIsUpdatingForwardZone] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

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
  const statusLabel = (status: RecordStatus) => (status === 'active' ? t('enabled') : t('inactive'));
  const policyLabel = (policy: 'only' | 'first') => (policy === 'only' ? t('policyOnly') : t('policyFirst'));

  const loadData = async (zoneFilter = logZoneFilter) => {
    const [zoneRes, recordRes, fwdRes] = await Promise.all([
      fetch('/api/dns/zones'),
      fetch('/api/dns/records?include_inactive=1'),
      fetch('/api/dns/forward-zones'),
    ]);

    if (!zoneRes.ok || !recordRes.ok) {
      throw new Error(t('loadDataFailed'));
    }

    const zoneData: DnsZone[] = await zoneRes.json();
    const recordData: DnsRecord[] = await recordRes.json();
    const fwdData: DnsForwardZone[] = fwdRes.ok ? await fwdRes.json() : [];

    let effectiveFilter = zoneFilter;
    if (effectiveFilter !== 'all' && !zoneData.some((item) => item.id === Number(effectiveFilter))) {
      effectiveFilter = 'all';
      setLogZoneFilter('all');
    }

    const logRes = await fetch(buildLogsUrl(effectiveFilter));
    if (!logRes.ok) {
      throw new Error(t('loadLogsFailed'));
    }
    const logData: DnsChangeLog[] = await logRes.json();

    setZones(Array.isArray(zoneData) ? zoneData : []);
    setRecords(Array.isArray(recordData) ? recordData : []);
    setLogs(Array.isArray(logData) ? logData : []);
    setForwardZones(Array.isArray(fwdData) ? fwdData : []);

    if (!zoneData.some((item) => item.id === recordForm.zone_id)) {
      setRecordForm((prev) => ({ ...prev, zone_id: zoneData[0]?.id || 0 }));
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingZone(true);

    try {
      const res = await fetch('/api/dns/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zoneForm),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        message.error(data.error || t('zoneCreateFailed'));
        return;
      }

      await loadData();
      setZoneForm(DEFAULT_ZONE_FORM);
      setIsCreateZoneModalOpen(false);
      message.success(t('zoneCreated', { name: data.name || '' }));
      router.refresh();
    } catch (error) {
      console.error('Failed to create zone:', error);
      message.error(t('zoneCreateFailed'));
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
        message.error(data.error || t('zoneUpdateFailed'));
        return;
      }

      await loadData();
      setEditingZone(null);
      message.success(t('zoneUpdated', { name: data.name || '' }));
      router.refresh();
    } catch (error) {
      console.error('Failed to update zone:', error);
      message.error(t('zoneUpdateFailed'));
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
        message.error(data.error || t('zoneStatusFailed'));
        return;
      }

      await loadData();
      message.success(zone.is_active ? t('zoneDisabled', { name: zone.name }) : t('zoneEnabled', { name: zone.name }));
      router.refresh();
    } catch (error) {
      console.error('Failed to toggle zone status:', error);
      message.error(t('zoneStatusFailed'));
    }
  };

  const executeDeleteZone = async (zone: DnsZone) => {
    try {
      const res = await fetch(`/api/dns/zones/${zone.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        message.error(data.error || t('zoneDeleteFailed'));
        return;
      }

      await loadData();
      message.success(t('zoneDeleted', { name: zone.name }));
      router.refresh();
    } catch (error) {
      console.error('Failed to delete zone:', error);
      message.error(t('zoneDeleteFailed'));
    }
  };

  const handleDeleteZone = (zone: DnsZone) => {
    const count = recordCountByZone.get(zone.id) || 0;
    setConfirmDialog({
      title: t('deleteZoneTitle'),
      description: t('deleteZoneDescription', { name: zone.name, count }),
      confirmText: t('deleteZoneConfirm'),
      onConfirm: () => executeDeleteZone(zone),
    });
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
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
        message.error(data.error || t('recordCreateFailed'));
        return;
      }

      await loadData();
      setRecordForm(buildRecordForm(recordForm.zone_id || zones[0]?.id || 0));
      setCreateRecordZone(null);
      const syncMessage = data.record?.last_sync_message || t('recordCreated');
      message.success(syncMessage);
      router.refresh();
    } catch (error) {
      console.error('Failed to create record:', error);
      message.error(t('recordCreateFailed'));
    } finally {
      setIsSavingRecord(false);
    }
  };

  const executeDeleteRecord = async (record: DnsRecord) => {
    try {
      const res = await fetch(`/api/dns/records/${record.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        message.error(data.error || t('recordDeleteFailed'));
        return;
      }

      await loadData();
      message.success(t('recordDeleted'));
      router.refresh();
    } catch (error) {
      console.error('Failed to delete record:', error);
      message.error(t('recordDeleteFailed'));
    }
  };

  const handleDeleteRecord = (record: DnsRecord) => {
    setConfirmDialog({
      title: t('deleteRecordTitle'),
      description: t('deleteRecordDescription', { name: record.name, type: record.type }),
      confirmText: t('deleteRecordConfirm'),
      onConfirm: () => executeDeleteRecord(record),
    });
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
        message.error(data.error || t('recordStatusFailed'));
        return;
      }

      await loadData();
      message.success(data.record?.last_sync_message || t('recordStatusUpdated'));
      router.refresh();
    } catch (error) {
      console.error('Failed to update record status:', error);
      message.error(t('recordStatusFailed'));
    }
  };

  // --- Forward Zone handlers ---

  const handleCreateForwardZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingForwardZone(true);

    try {
      const res = await fetch('/api/dns/forward-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forwardZoneForm),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        message.error(data.error || t('forwardZoneCreateFailed'));
        return;
      }

      await loadData();
      setForwardZoneForm(DEFAULT_FORWARD_ZONE_FORM);
      setIsCreateForwardZoneModalOpen(false);
      message.success(t('forwardZoneCreated', { name: data.name || '' }));
      router.refresh();
    } catch (error) {
      console.error('Failed to create forward zone:', error);
      message.error(t('forwardZoneCreateFailed'));
    } finally {
      setIsSavingForwardZone(false);
    }
  };

  const openEditForwardZone = (zone: DnsForwardZone) => {
    setEditingForwardZone({
      id: zone.id,
      name: zone.name,
      forwarders: zone.forwarders,
      forward_policy: zone.forward_policy,
      description: zone.description || '',
      is_active: zone.is_active,
    });
  };

  const openCreateZoneModal = () => {
    setZoneForm(DEFAULT_ZONE_FORM);
    setIsCreateZoneModalOpen(true);
  };

  const openCreateForwardZoneModal = () => {
    setForwardZoneForm(DEFAULT_FORWARD_ZONE_FORM);
    setIsCreateForwardZoneModalOpen(true);
  };

  const openCreateRecordModal = (zone: DnsZone) => {
    setRecordForm(buildRecordForm(zone.id));
    setCreateRecordZone(zone);
  };

  const handleUpdateForwardZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForwardZone) return;
    setIsUpdatingForwardZone(true);

    try {
      const res = await fetch(`/api/dns/forward-zones/${editingForwardZone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingForwardZone.name,
          forwarders: editingForwardZone.forwarders,
          forward_policy: editingForwardZone.forward_policy,
          description: editingForwardZone.description,
          is_active: editingForwardZone.is_active,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        message.error(data.error || t('forwardZoneUpdateFailed'));
        return;
      }

      await loadData();
      setEditingForwardZone(null);
      message.success(t('forwardZoneUpdated', { name: data.name || '' }));
      router.refresh();
    } catch (error) {
      console.error('Failed to update forward zone:', error);
      message.error(t('forwardZoneUpdateFailed'));
    } finally {
      setIsUpdatingForwardZone(false);
    }
  };

  const handleToggleForwardZoneStatus = async (zone: DnsForwardZone) => {
    try {
      const res = await fetch(`/api/dns/forward-zones/${zone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !zone.is_active }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        message.error(data.error || t('recordStatusFailed'));
        return;
      }

      await loadData();
      message.success(zone.is_active ? t('zoneDisabled', { name: zone.name }) : t('zoneEnabled', { name: zone.name }));
      router.refresh();
    } catch (error) {
      console.error('Failed to toggle forward zone status:', error);
      message.error(t('recordStatusFailed'));
    }
  };

  const executeDeleteForwardZone = async (zone: DnsForwardZone) => {
    try {
      const res = await fetch(`/api/dns/forward-zones/${zone.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        message.error(data.error || t('forwardZoneDeleteFailed'));
        return;
      }

      await loadData();
      message.success(t('forwardZoneDeleted', { name: zone.name }));
      router.refresh();
    } catch (error) {
      console.error('Failed to delete forward zone:', error);
      message.error(t('forwardZoneDeleteFailed'));
    }
  };

  const handleDeleteForwardZone = (zone: DnsForwardZone) => {
    setConfirmDialog({
      title: t('deleteForwardZoneTitle'),
      description: t('deleteForwardZoneDescription', { name: zone.name }),
      confirmText: t('deleteForwardZoneConfirm'),
      onConfirm: () => executeDeleteForwardZone(zone),
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDialog) return;
    setIsConfirmingDelete(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } finally {
      setIsConfirmingDelete(false);
    }
  };

  const handleRefreshLogs = async (zoneFilter = logZoneFilter) => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch(buildLogsUrl(zoneFilter));
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        message.error(data.error || t('loadLogsFailed'));
        return;
      }
      const data: DnsChangeLog[] = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to refresh logs:', error);
      message.error(t('loadLogsFailed'));
    } finally {
      setIsLoadingLogs(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12 bg-background-light">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('title')}</h1>
          <p className="text-slate-500 mt-1">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">{t('zoneCount')}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{zones.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">{t('recordCount')}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{records.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">{t('activeRecords')}</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{activeRecords}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">{t('forwardZones')}</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{forwardZones.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <div className="p-5 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t('zoneList')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('zoneListHint')}</p>
            </div>
            <button
              onClick={openCreateZoneModal}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-blue-600"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {t('addZone')}
            </button>
          </div>

          <table className="w-full min-w-[980px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('zone')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('dnsServer')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('tsigKey')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('recordCount')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('status')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('updatedAt')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {zones.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>{t('emptyZones')}</td>
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
                        {zone.is_active ? t('enabled') : t('inactive')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(zone.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openCreateRecordModal(zone)}
                          className="inline-flex items-center justify-center size-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title={t('addRecord')}
                        >
                          <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        </button>
                        <button
                          onClick={() => openEditZone(zone)}
                          className="inline-flex items-center justify-center size-8 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors"
                          title={t('edit')}
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteZone(zone)}
                          className="inline-flex items-center justify-center size-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title={t('delete')}
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

        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Zone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('hostname')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('type')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('value')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">TTL</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('status')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('syncStatus')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={8}>
                    {t('recordsEmpty')}
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
                        {statusLabel(record.status)}
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
                        title={t('delete')}
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

        {/* Forward Zones Section */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <div className="p-5 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t('forwardZonesTitle')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('forwardZonesHint')}</p>
            </div>
            <button
              onClick={openCreateForwardZoneModal}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-blue-600"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {t('addForwardZone')}
            </button>
          </div>

          <table className="w-full min-w-[980px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('domain')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('forwardDns')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('policy')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('status')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('syncStatus')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('remark')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forwardZones.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>{t('emptyForwardZones')}</td>
                </tr>
              ) : (
                forwardZones.map((fz) => (
                  <tr key={fz.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{fz.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{fz.forwarders.split(',').join(', ')}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {policyLabel(fz.forward_policy)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleToggleForwardZoneStatus(fz)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          fz.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {fz.is_active ? t('enabled') : t('inactive')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center w-fit px-2.5 py-1 rounded-full text-xs font-medium ${syncBadgeClass(fz.last_sync_status)}`}>
                          {fz.last_sync_status}
                        </span>
                        {fz.last_sync_message && (
                          <span className="text-xs text-slate-500 truncate max-w-[260px]" title={fz.last_sync_message}>
                            {fz.last_sync_message}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 max-w-[200px] truncate" title={fz.description || '-'}>
                      {fz.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditForwardZone(fz)}
                          className="inline-flex items-center justify-center size-8 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors"
                          title={t('edit')}
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteForwardZone(fz)}
                          className="inline-flex items-center justify-center size-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title={t('delete')}
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

        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <div className="p-5 border-b border-slate-100 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t('logsTitle')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('logsHint')}</p>
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
                <option value="all">{t('allZones')}</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
              <button
                onClick={() => handleRefreshLogs()}
                disabled={isLoadingLogs}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {isLoadingLogs ? t('refreshing') : t('refreshLogs')}
              </button>
            </div>
          </div>

          <table className="w-full min-w-[1100px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('time')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('action')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('result')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Zone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('record')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('operator')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{t('message')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>{t('emptyLogs')}</td>
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

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title || ''}
        description={confirmDialog?.description}
        confirmText={confirmDialog?.confirmText || t('confirmDelete')}
        tone="danger"
        loading={isConfirmingDelete}
        onConfirm={handleConfirmDelete}
        onClose={() => !isConfirmingDelete && setConfirmDialog(null)}
      />

      {isCreateZoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setIsCreateZoneModalOpen(false)} />
          <form
            onSubmit={handleCreateZone}
            className="relative w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl p-5 flex flex-col gap-4"
          >
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t('createZoneTitle')}</h3>
              <p className="text-sm text-slate-500 mt-1">{t('createZoneHint')}</p>
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
              placeholder={t('optionalTsigKey')}
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
                placeholder={t('optionalTsigSecret')}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>

            <textarea
              value={zoneForm.description}
              onChange={(e) => setZoneForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t('remarkPlaceholder')}
              rows={2}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateZoneModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSavingZone}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-blue-600 disabled:opacity-60"
              >
                {isSavingZone ? t('creating') : t('createZone')}
              </button>
            </div>
          </form>
        </div>
      )}

      {createRecordZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setCreateRecordZone(null)} />
          <form
            onSubmit={handleCreateRecord}
            className="relative w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl p-5 flex flex-col gap-4"
          >
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t('createRecordTitle')}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {t('zoneLabel', { name: zoneById.get(recordForm.zone_id)?.name || createRecordZone.name })}
              </p>
            </div>

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
              placeholder={recordForm.type === 'MX' ? t('mxValuePlaceholder') : t('recordValuePlaceholder')}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              required
            />

            {recordForm.type === 'MX' && (
              <input
                type="number"
                value={recordForm.priority}
                onChange={(e) => setRecordForm((prev) => ({ ...prev, priority: e.target.value === '' ? '' : Number(e.target.value) }))}
                placeholder={t('priorityPlaceholder')}
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
                <option value="active">{t('enabled')}</option>
                <option value="inactive">{t('inactive')}</option>
              </select>

              <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={recordForm.sync_now}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, sync_now: e.target.checked }))}
                />
                {t('syncNow')}
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateRecordZone(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSavingRecord || !zoneById.has(recordForm.zone_id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-blue-600 disabled:opacity-60"
              >
                {isSavingRecord ? t('creating') : t('createRecord')}
              </button>
            </div>
          </form>
        </div>
      )}

      {isCreateForwardZoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setIsCreateForwardZoneModalOpen(false)} />
          <form
            onSubmit={handleCreateForwardZone}
            className="relative w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl p-5 flex flex-col gap-4"
          >
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t('createForwardZoneTitle')}</h3>
              <p className="text-sm text-slate-500 mt-1">{t('createForwardZoneHint')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={forwardZoneForm.name}
                onChange={(e) => setForwardZoneForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('domainPlaceholder')}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                required
              />
              <select
                value={forwardZoneForm.forward_policy}
                onChange={(e) => setForwardZoneForm((prev) => ({ ...prev, forward_policy: e.target.value as 'only' | 'first' }))}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="only">{t('policyOnly')}</option>
                <option value="first">{t('policyFirst')}</option>
              </select>
            </div>

            <textarea
              value={forwardZoneForm.forwarders}
              onChange={(e) => setForwardZoneForm((prev) => ({ ...prev, forwarders: e.target.value }))}
              placeholder={t('forwardersPlaceholder')}
              rows={2}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
              required
            />

            <textarea
              value={forwardZoneForm.description}
              onChange={(e) => setForwardZoneForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t('optionalRemarkPlaceholder')}
              rows={1}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateForwardZoneModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSavingForwardZone}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-blue-600 disabled:opacity-60"
              >
                {isSavingForwardZone ? t('creating') : t('createForwardZone')}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingForwardZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setEditingForwardZone(null)} />
          <form
            onSubmit={handleUpdateForwardZone}
            className="relative w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl p-5 flex flex-col gap-4"
          >
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t('editForwardZoneTitle')}</h3>
              <p className="text-sm text-slate-500 mt-1">{editingForwardZone.name}</p>
            </div>

            <input
              type="text"
              value={editingForwardZone.name}
              onChange={(e) => setEditingForwardZone((prev) => prev ? { ...prev, name: e.target.value } : prev)}
              placeholder={t('domain')}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              required
            />

            <textarea
              value={editingForwardZone.forwarders}
              onChange={(e) => setEditingForwardZone((prev) => prev ? { ...prev, forwarders: e.target.value } : prev)}
              placeholder={t('forwardersEditPlaceholder')}
              rows={2}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
              required
            />

            <select
              value={editingForwardZone.forward_policy}
              onChange={(e) => setEditingForwardZone((prev) => prev ? { ...prev, forward_policy: e.target.value as 'only' | 'first' } : prev)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="only">{t('policyOnly')}</option>
              <option value="first">{t('policyFirst')}</option>
            </select>

            <textarea
              value={editingForwardZone.description}
              onChange={(e) => setEditingForwardZone((prev) => prev ? { ...prev, description: e.target.value } : prev)}
              rows={2}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
              placeholder={t('remarkPlaceholder')}
            />

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={editingForwardZone.is_active}
                onChange={(e) => setEditingForwardZone((prev) => prev ? { ...prev, is_active: e.target.checked } : prev)}
              />
              {t('enabled')}
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingForwardZone(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isUpdatingForwardZone}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-blue-600 disabled:opacity-60"
              >
                {isUpdatingForwardZone ? t('saving') : t('save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setEditingZone(null)} />
          <form
            onSubmit={handleUpdateZone}
            className="relative w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl p-5 flex flex-col gap-4"
          >
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t('editZoneTitle')}</h3>
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
              placeholder={t('optionalTsigKey')}
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
                {t('updateTsig')}
              </label>
            </div>

            {editingZone.update_tsig_secret && (
              <input
                type="text"
                value={editingZone.tsig_secret}
                onChange={(e) => setEditingZone((prev) => prev ? { ...prev, tsig_secret: e.target.value } : prev)}
                placeholder={t('newTsigPlaceholder')}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            )}

            <textarea
              value={editingZone.description}
              onChange={(e) => setEditingZone((prev) => prev ? { ...prev, description: e.target.value } : prev)}
              rows={2}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
              placeholder={t('remarkPlaceholder')}
            />

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={editingZone.is_active}
                onChange={(e) => setEditingZone((prev) => prev ? { ...prev, is_active: e.target.checked } : prev)}
              />
              {t('zoneEnabledLabel')}
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingZone(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isUpdatingZone}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-blue-600 disabled:opacity-60"
              >
                {isUpdatingZone ? t('saving') : t('saveZone')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
