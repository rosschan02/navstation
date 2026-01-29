export interface SiteData {
  id: number;
  name: string;
  url: string;
  category_id: number | null;
  status: 'active' | 'inactive';
  icon: string;
  color_class: string;
  created_at: string;
  updated_at: string;
  // joined from categories
  category_name?: string;
  category_label?: string;
  category_class?: string;
}

export interface ResourceItem {
  id: number;
  title: string;
  description: string;
  url: string;
  icon: string;
  img: string;
  icon_bg: string;
  icon_color: string;
  tags: string[];
  page: string;
  sort_order: number;
}

export interface QRCodeItem {
  id: number;
  name: string;
  category: string;
  icon: string;
  icon_bg: string;
  icon_color: string;
  qr_image: string;
  sort_order: number;
}

export interface Category {
  id: number;
  name: string;
  label: string;
  css_class: string;
  icon?: string;
  icon_bg?: string;
  icon_color?: string;
}

export interface User {
  id: number;
  username: string;
  role: string;
}

export interface SoftwareItem {
  id: number;
  name: string;
  description: string;
  version: string;
  file_name: string;
  file_path: string;
  file_size: number;
  icon: string;
  icon_bg: string;
  icon_color: string;
  download_count: number;
  created_at: string;
  updated_at: string;
}
