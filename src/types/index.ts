export interface Category {
  id: number;
  name: string;
  label: string;
  type: 'site' | 'qrcode' | 'software';
  css_class: string;
  icon: string;
  icon_bg: string;
  icon_color: string;
  sort_order: number;
  created_at?: string;
}

export interface SiteData {
  id: number;
  name: string;
  description: string;
  url: string;
  category_id: number | null;
  logo: string;
  icon: string;
  icon_bg: string;
  icon_color: string;
  qr_image: string;
  tags: string[];
  sort_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  // joined fields
  category_name?: string;
  category_label?: string;
  category_type?: 'site' | 'qrcode' | 'software';
}

export interface SoftwareItem {
  id: number;
  name: string;
  description: string;
  version: string;
  category_id: number | null;
  file_name: string;
  file_path: string;
  file_size: number;
  logo: string;
  icon: string;
  icon_bg: string;
  icon_color: string;
  sort_order: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  // joined fields
  category_name?: string;
  category_label?: string;
}

export interface User {
  id: number;
  username: string;
  role: string;
  avatar?: string;
}

// Grouped sites by category for homepage display
export interface CategoryWithSites extends Category {
  sites: SiteData[];
}

// Global site settings
export interface SiteSettings {
  site_name: string;
  site_description: string;
  site_version: string;
  footer_text: string;
  logo_url: string;
}

// API Key for external system authentication
export interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  permissions: 'read' | 'write';
  description: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface PhonebookEntry {
  id: number;
  department_name: string;
  short_code: string;
  long_code: string;
  remark: string;
  sort_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX';
export type DnsSyncStatus = 'pending' | 'success' | 'failed' | 'skipped';

export interface DnsZone {
  id: number;
  name: string;
  server: string;
  port: number;
  tsig_key_name: string;
  tsig_algorithm: string;
  tsig_secret: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DnsRecord {
  id: number;
  zone_id: number;
  name: string;
  type: DnsRecordType;
  ttl: number;
  value: string;
  priority: number | null;
  status: 'active' | 'inactive';
  last_sync_status: DnsSyncStatus;
  last_sync_message: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  zone_name?: string;
}

export interface DnsChangeLog {
  id: number;
  zone_id: number | null;
  record_id: number | null;
  action: 'create' | 'update' | 'delete' | 'sync';
  status: 'success' | 'failed' | 'skipped';
  request_payload: Record<string, unknown>;
  response_message: string;
  operator_type: 'cookie' | 'apikey' | 'system';
  operator_name: string;
  created_at: string;
  zone_name?: string;
  record_name?: string;
  record_type?: DnsRecordType;
}
