import { spawn } from 'child_process';
import type { DnsRecordType } from '@/types';

export interface Bind9ZoneConfig {
  name: string;
  server: string;
  port: number;
  tsig_key_name?: string;
  tsig_algorithm?: string;
  tsig_secret?: string;
}

export interface Bind9RecordData {
  name: string;
  type: DnsRecordType;
  ttl: number;
  value: string;
  priority: number | null;
}

export interface Bind9SyncResult {
  success: boolean;
  skipped: boolean;
  stdout: string;
  stderr: string;
  script: string;
}

const DEFAULT_NSUPDATE_BIN = process.env.BIND9_NSUPDATE_BIN || 'nsupdate';

function trimTrailingDot(value: string): string {
  return value.replace(/\.+$/, '');
}

function normalizeZoneName(zoneName: string): string {
  return trimTrailingDot(zoneName.trim().toLowerCase());
}

function toAbsoluteDomain(name: string, zoneName: string): string {
  const raw = name.trim();
  if (!raw || raw === '@') {
    return `${normalizeZoneName(zoneName)}.`;
  }

  if (raw.endsWith('.')) {
    return raw;
  }

  const zone = normalizeZoneName(zoneName);
  const normalizedRaw = raw.toLowerCase();
  if (normalizedRaw === zone || normalizedRaw.endsWith(`.${zone}`)) {
    return `${trimTrailingDot(raw)}.`;
  }

  return `${trimTrailingDot(raw)}.${zone}.`;
}

function toTargetDomain(value: string, zoneName: string): string {
  const target = value.trim();
  if (!target) return target;

  if (target.endsWith('.')) return target;
  if (target === '@') return `${normalizeZoneName(zoneName)}.`;

  if (target.includes('.')) {
    return `${target}.`;
  }

  return `${trimTrailingDot(target)}.${normalizeZoneName(zoneName)}.`;
}

function escapeTxt(value: string): string {
  const escaped = value.replace(/["\\]/g, '\\$&');
  return `"${escaped}"`;
}

function buildRecordRdata(record: Bind9RecordData, zoneName: string): string {
  if (record.type === 'MX') {
    const priority = record.priority ?? 10;
    return `${priority} ${toTargetDomain(record.value, zoneName)}`;
  }

  if (record.type === 'CNAME') {
    return toTargetDomain(record.value, zoneName);
  }

  if (record.type === 'TXT') {
    return escapeTxt(record.value);
  }

  return record.value.trim();
}

function buildTsigArgument(zone: Bind9ZoneConfig): string | null {
  const keyName = zone.tsig_key_name?.trim();
  const secret = zone.tsig_secret?.trim();
  if (!keyName || !secret) return null;

  const algorithm = (zone.tsig_algorithm || 'hmac-sha256').trim();
  return `${algorithm}:${keyName}:${secret}`;
}

async function runNsupdate(zone: Bind9ZoneConfig, lines: string[]): Promise<Bind9SyncResult> {
  const script = `${lines.join('\n')}\n`;

  if (process.env.BIND9_DRY_RUN === '1') {
    return {
      success: true,
      skipped: true,
      stdout: 'BIND9_DRY_RUN=1, skipped nsupdate execution',
      stderr: '',
      script,
    };
  }

  const args = ['-v'];
  const tsigArg = buildTsigArgument(zone);
  if (tsigArg) {
    args.push('-y', tsigArg);
  }

  const result = await new Promise<Bind9SyncResult>((resolve) => {
    const child = spawn(DEFAULT_NSUPDATE_BIN, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        skipped: false,
        stdout,
        stderr: `${stderr}${stderr ? '\n' : ''}${error.message}`,
        script,
      });
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        skipped: false,
        stdout,
        stderr,
        script,
      });
    });

    child.stdin.write(script);
    child.stdin.end();
  });

  return result;
}

export async function bind9AddRecord(
  zone: Bind9ZoneConfig,
  record: Bind9RecordData
): Promise<Bind9SyncResult> {
  const fqdn = toAbsoluteDomain(record.name, zone.name);
  const rdata = buildRecordRdata(record, zone.name);

  return runNsupdate(zone, [
    `server ${zone.server} ${zone.port}`,
    `zone ${normalizeZoneName(zone.name)}`,
    `update add ${fqdn} ${record.ttl} ${record.type} ${rdata}`,
    'send',
  ]);
}

export async function bind9DeleteRecord(
  zone: Bind9ZoneConfig,
  record: Bind9RecordData
): Promise<Bind9SyncResult> {
  const fqdn = toAbsoluteDomain(record.name, zone.name);
  const rdata = buildRecordRdata(record, zone.name);

  return runNsupdate(zone, [
    `server ${zone.server} ${zone.port}`,
    `zone ${normalizeZoneName(zone.name)}`,
    `update delete ${fqdn} ${record.type} ${rdata}`,
    'send',
  ]);
}

export async function bind9ReplaceRecord(
  zone: Bind9ZoneConfig,
  before: Bind9RecordData,
  after: Bind9RecordData
): Promise<Bind9SyncResult> {
  const beforeFqdn = toAbsoluteDomain(before.name, zone.name);
  const beforeRdata = buildRecordRdata(before, zone.name);
  const afterFqdn = toAbsoluteDomain(after.name, zone.name);
  const afterRdata = buildRecordRdata(after, zone.name);

  return runNsupdate(zone, [
    `server ${zone.server} ${zone.port}`,
    `zone ${normalizeZoneName(zone.name)}`,
    `update delete ${beforeFqdn} ${before.type} ${beforeRdata}`,
    `update add ${afterFqdn} ${after.ttl} ${after.type} ${afterRdata}`,
    'send',
  ]);
}
