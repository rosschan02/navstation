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
}

// Grouped sites by category for homepage display
export interface CategoryWithSites extends Category {
  sites: SiteData[];
}
