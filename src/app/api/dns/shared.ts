import type { AuthResult } from '@/lib/apiAuth';
import type { DnsRecord, DnsRecordType, DnsZone } from '@/types';

const DNS_RECORD_TYPES = new Set<DnsRecordType>(['A', 'AAAA', 'CNAME', 'TXT', 'MX']);
const DNS_STATUSES = new Set(['active', 'inactive']);
const DOMAIN_PATTERN = /^(?:\*\.)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)(?:\.(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?))+\.?$/;
const LABEL_PATTERN = /^(?:@|\*|[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)$/;

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeZoneName(value: unknown): string {
  return normalizeString(value).replace(/\.+$/, '').toLowerCase();
}

export function normalizeRecordName(value: unknown): string {
  const input = normalizeString(value);
  if (!input) return '@';
  return input;
}

export function parsePort(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? '53'), 10);
  if (!Number.isFinite(parsed)) return 53;
  return parsed;
}

export function parseTTL(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? '300'), 10);
  if (!Number.isFinite(parsed)) return 300;
  return parsed;
}

export function parsePriority(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === '1' || value.toLowerCase() === 'true') return true;
    if (value === '0' || value.toLowerCase() === 'false') return false;
  }
  return defaultValue;
}

export function validateZoneInput(input: {
  name: string;
  server: string;
  port: number;
  tsig_algorithm: string;
}): string | null {
  if (!input.name || !DOMAIN_PATTERN.test(input.name)) {
    return 'Zone 名称无效（示例：example.com）';
  }
  if (!input.server) {
    return 'DNS 服务器地址不能为空';
  }
  if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) {
    return '端口必须在 1-65535 之间';
  }
  if (!input.tsig_algorithm) {
    return 'TSIG 算法不能为空';
  }
  return null;
}

export function validateRecordInput(input: {
  name: string;
  type: string;
  ttl: number;
  value: string;
  priority: number | null;
  status: string;
}): string | null {
  const normalizedType = input.type.toUpperCase() as DnsRecordType;

  if (!LABEL_PATTERN.test(input.name)) {
    return '记录主机名无效（支持 @、* 或子域名）';
  }
  if (!DNS_RECORD_TYPES.has(normalizedType)) {
    return '记录类型仅支持 A / AAAA / CNAME / TXT / MX';
  }
  if (!Number.isInteger(input.ttl) || input.ttl < 30 || input.ttl > 86400) {
    return 'TTL 必须在 30-86400 秒之间';
  }
  if (!input.value) {
    return '记录值不能为空';
  }
  if (!DNS_STATUSES.has(input.status)) {
    return '状态必须是 active 或 inactive';
  }
  if (normalizedType === 'MX') {
    if (input.priority === null || input.priority < 0 || input.priority > 65535) {
      return 'MX 记录必须提供 0-65535 的优先级';
    }
  } else if (input.priority !== null) {
    return '仅 MX 记录支持优先级';
  }

  return null;
}

export function mapOperator(auth: AuthResult): { operatorType: 'cookie' | 'apikey' | 'system'; operatorName: string } {
  if (!auth.authenticated) {
    return { operatorType: 'system', operatorName: 'system' };
  }

  if (auth.method === 'cookie' && auth.user) {
    return { operatorType: 'cookie', operatorName: auth.user.username || 'admin' };
  }

  if (auth.method === 'apikey' && auth.apiKey) {
    return { operatorType: 'apikey', operatorName: auth.apiKey.name || 'apikey' };
  }

  return { operatorType: 'system', operatorName: 'system' };
}

export function toBindZoneConfig(zone: DnsZone) {
  return {
    name: zone.name,
    server: zone.server,
    port: zone.port,
    tsig_key_name: zone.tsig_key_name,
    tsig_algorithm: zone.tsig_algorithm,
    tsig_secret: zone.tsig_secret,
  };
}

export function toBindRecordData(record: Pick<DnsRecord, 'name' | 'type' | 'ttl' | 'value' | 'priority'>) {
  return {
    name: record.name,
    type: record.type,
    ttl: record.ttl,
    value: record.value,
    priority: record.priority,
  };
}
