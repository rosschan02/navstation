# 站点设置功能设计

## 概述

实现后台可自定义站点名称、描述、Logo、版本号、页脚版权等全局配置。

## 数据结构

### 数据库表

```sql
CREATE TABLE IF NOT EXISTS site_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 配置项

| key | 说明 | 默认值 |
|-----|------|--------|
| `site_name` | 站点名称 | 导航站 |
| `site_description` | 站点描述 | 综合导航门户与站点管理仪表板 |
| `site_version` | 版本号 | v2.0 中文版 |
| `footer_text` | 页脚版权 | © 2024 通用站点导航。保留所有权利。 |
| `logo_url` | Logo 图片路径 | 空（使用默认火箭图标） |

### TypeScript 类型

```typescript
interface SiteSettings {
  site_name: string;
  site_description: string;
  site_version: string;
  footer_text: string;
  logo_url: string;
}
```

## API

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/settings` | GET | 获取所有设置 |
| `/api/settings` | PUT | 更新设置（需登录） |

## 文件变更

### 新增文件

- `src/app/api/settings/route.ts` - 设置 API
- `src/app/admin/settings/page.tsx` - 设置页面
- `src/app/admin/settings/SettingsClient.tsx` - 设置表单

### 修改文件

- `src/db/schema.sql` - 新增 site_settings 表
- `src/types/index.ts` - 新增 SiteSettings 类型
- `src/components/Sidebar.tsx` - 动态显示站点信息 + 新增菜单项
- `src/app/layout.tsx` - 动态 metadata
- `src/app/HomeClient.tsx` - 动态页脚

## 实现步骤

1. 更新数据库 schema，添加 site_settings 表
2. 添加 SiteSettings 类型定义
3. 创建 /api/settings API
4. 创建设置管理页面 UI
5. 修改 Sidebar 侧边栏，添加菜单项 + 动态读取设置
6. 修改 layout.tsx 动态 metadata
7. 修改 HomeClient.tsx 动态页脚
