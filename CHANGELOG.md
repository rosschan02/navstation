# Changelog

本文件记录 NavStation 导航站的所有重要更新。

## [2.0.0] - 2026-01-29

### 重大变更

#### 数据库架构重构
- 合并 `sites`、`resources`、`qr_codes` 表为统一的 `sites` 表
- `categories` 表新增 `type` 字段，支持三种类型：
  - `site` - 普通站点
  - `qrcode` - 二维码（公众号/小程序）
  - `software` - 软件下载
- `categories` 表新增 `sort_order` 字段用于排序
- `sites` 表新增字段：`logo`、`qr_image`、`tags`

#### 首页改造
- 移除硬编码数据，所有站点从数据库读取
- 按分类分组显示所有站点
- 支持分类过滤（点击分类标签筛选）
- 支持全文搜索（名称、描述、标签）
- 二维码类型以图片网格形式展示

#### 后台管理改造
- 统一站点管理：管理所有站点和二维码
- 分类管理支持选择类型
- 支持上传站点 Logo 图片
- 支持上传二维码图片
- 简化侧边栏导航

### 新增

#### 图片上传功能
- 新增 `/api/upload` 接口，支持 Logo 和二维码图片上传
- 新增 `/api/uploads/[...path]` 接口，用于图片服务
- 图片存储在 `uploads/logos/` 和 `uploads/qr/` 目录

### 删除

#### 移除旧页面和组件
- 删除 `/qr` 页面（功能合并到首页）
- 删除 `/resources/[page]` 页面（功能合并到首页）
- 删除 `AddResourceModal`、`AddSiteModal`、`ResourcesClient` 组件
- 删除 `/api/qrcodes`、`/api/resources` API

### 升级指南

**重要：此版本有破坏性变更，需要数据库迁移**

```bash
# 运行迁移脚本（会自动迁移旧数据）
psql -d your_database -f src/db/migrations/003_unified_sites.sql
```

或者对于全新部署：
```bash
psql -d your_database -f src/db/schema.sql
psql -d your_database -f src/db/seed.sql
```

---

## [1.2.0] - 2026-01-29

### 新增

#### 软件下载功能
- 新增软件下载页面 `/software`，用户可浏览和下载管理员上传的软件
- 新增软件管理页面 `/admin/software`，管理员可上传、删除软件
- 支持单文件最大 4GB 上传
- 支持上传进度显示
- 支持下载次数统计
- 支持自定义软件图标和颜色
- 新增软件 API：
  - `GET /api/software` - 获取软件列表
  - `POST /api/software` - 上传软件（FormData）
  - `DELETE /api/software/:id` - 删除软件
  - `GET /api/software/:id/download` - 下载软件文件

### 变更

#### UI 优化
- 移除资源页面的"提交新资源"按钮
- 优化站点卡片布局：左侧 Logo，右侧名称和说明（水平排列）
- 卡片标签最多显示 3 个，更加简洁

#### 侧边栏更新
- 新增"软件下载"导航入口
- 工作区新增"软件管理"入口

### 数据库变更

#### 新增 software 表
- `name` - 软件名称
- `description` - 软件说明
- `version` - 版本号
- `file_name` - 原始文件名
- `file_path` - 存储路径
- `file_size` - 文件大小（字节）
- `icon` - 图标名称
- `icon_bg` - 图标背景色
- `icon_color` - 图标颜色
- `download_count` - 下载次数

### 新增文件

```
src/app/software/page.tsx                    # 软件下载页面
src/app/software/SoftwareClient.tsx          # 软件下载客户端组件
src/app/admin/software/page.tsx              # 软件管理页面
src/app/admin/software/SoftwareAdminClient.tsx # 软件管理客户端组件
src/app/api/software/route.ts                # 软件列表/上传 API
src/app/api/software/[id]/route.ts           # 软件删除 API
src/app/api/software/[id]/download/route.ts  # 软件下载 API
src/db/migrations/002_add_software_table.sql # 数据库迁移脚本
uploads/.gitkeep                             # 上传目录占位文件
```

### 升级指南

如果从 1.1.x 版本升级，需要运行数据库迁移：

```bash
psql -d your_database -f src/db/migrations/002_add_software_table.sql
```

---

## [1.1.0] - 2026-01-29

### 新增

#### 分类管理功能
- 新增分类管理页面 `/admin/categories`
- 支持分类的增删改查操作
- 分类支持自定义图标、背景色和图标颜色
- 在侧边栏工作区添加"分类管理"入口

#### 图标选择器组件
- 新增 `IconPicker` 组件，基于 Google Material Symbols
- 提供 60+ 常用图标供选择
- 支持 9 种背景颜色和 9 种图标颜色
- 支持图标搜索过滤功能

#### 资源提交功能
- 修复"提交新资源"按钮无响应的问题
- 新增 `AddResourceModal` 弹窗组件
- 支持在资源页面直接添加新资源
- 资源支持图标选择、标签等属性

### 变更

#### UI/UX 改进
- 将"添加站点"按钮从侧边栏移至站点管理页面
- 优化站点管理页面布局，按钮位置更合理

### 数据库变更

#### Categories 表新增字段
- `icon` - 图标名称（Material Symbols）
- `icon_bg` - 图标背景色 CSS 类
- `icon_color` - 图标颜色 CSS 类

### 新增文件

```
src/components/IconPicker.tsx          # 图标选择器组件
src/components/AddResourceModal.tsx    # 添加资源弹窗
src/components/ResourcesClient.tsx     # 资源页客户端组件
src/app/admin/categories/page.tsx      # 分类管理页面
src/app/admin/categories/CategoriesClient.tsx  # 分类管理客户端组件
src/app/api/categories/[id]/route.ts   # 分类 CRUD API
src/db/migrations/001_add_category_icons.sql   # 数据库迁移脚本
```

### 升级指南

如果从 1.0.x 版本升级，需要运行数据库迁移：

```bash
psql -d your_database -f src/db/migrations/001_add_category_icons.sql
```

---

## [1.0.0] - 2026-01-28

### 初始版本

- 首页推荐站点展示
- 资源分类页面（开发工具、设计资源、阅读、娱乐、购物）
- 公众号/小程序二维码画廊
- 站点管理后台
- 数据分析仪表盘
- 管理员登录认证
- Docker 部署支持
